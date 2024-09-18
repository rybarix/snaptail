import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import { parseVariables, resolvePath } from "./templvars.js";
import { move, remove } from "fs-extra";

// #region TYPES
type ActionCmd = {
  action: "cmd";
  cmd: string;
  args: string[];
  cwd: string;
};
type ActionCopyRaw = {
  action: "write_raw";
  src: string[];
  dst: string;
};
type ActionMv = {
  action: "mv";
  src: string;
  dst: string;
};
type ActionRm = {
  action: "rm";
  src: string[] | string; // Array of files, or single file
};

type Step = ActionCmd | ActionCopyRaw | ActionMv | ActionRm;

type StepsFile = {
  vars: Record<string, string>;
  steps: Step[];
};

export const PATH_ATTRS_SET = new Set(["src", "dst"] as const);
// #endregion

// #region ACTIONS
const writeRaw = async (src: string[], dst: string) => {
  await fs.writeFile(dst, src.join("\n"), "utf-8");
};

export const cmdAsync = (
  command: Parameters<typeof spawn>[0],
  args: Parameters<typeof spawn>[1],
  options: Parameters<typeof spawn>[2]
) => {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    child.on("close", resolve);
    child.on("error", reject);
  });
};
// #endregion

// #region Public API

// Now we need a function that will take steps file and variables and will resolve all paths in the steps file
export const resolvePathsInSteps = (
  steps: Step[],
  variables: Record<string, string>
) => {
  return steps.map((step) => {
    switch (step.action) {
      case "cmd":
        return {
          ...step,
          // TODO: resolve paths everywhere, resolvePath is bad name, better will be resolveVar
          args: step.args.map((a) => resolvePath(a, variables)),
          cwd: resolvePath(step.cwd, variables),
        };
      case "write_raw":
        return {
          ...step,
          src: step.src.map((s) => resolvePath(s, variables)),
          dst: resolvePath(step.dst, variables),
        };
      case "mv":
        return {
          ...step,
          src: resolvePath(step.src, variables),
          dst: resolvePath(step.dst, variables),
        };
      case "rm":
        if (Array.isArray(step.src)) {
          return {
            ...step,
            src: step.src.map((s) => resolvePath(s, variables)),
          };
        } else {
          return {
            ...step,
            src: resolvePath(step.src, variables),
          };
        }
    }
  });
};

export const runStep = async (step: Step) => {
  switch (step.action) {
    case "cmd":
      await cmdAsync(step.cmd, step.args, { cwd: step.cwd });
      break;
    case "write_raw":
      await writeRaw(step.src, step.dst);
      break;
    case "mv":
      await move(step.src, step.dst);
      break;
    case "rm":
      Array.isArray(step.src)
        ? await Promise.allSettled(step.src.map((s) => remove(s)))
        : await remove(step.src);
      break;
  }
};

export const runAll = async (steps: Step[]) => {
  for (let i = 0; i < steps.length; i++) {
    try {
      await runStep(steps[i]);
    } catch (e) {
      console.error(`Error running ${i + 1}th step: ${steps[i].action}`);
      throw e;
    }
  }
};

export const loadStepsFile = async (
  stepsFilePath: string,
  injectedVariables: Record<string, string> = {}
): Promise<StepsFile> => {
  const steps = JSON.parse(await fs.readFile(stepsFilePath, "utf-8"));
  const variables = parseVariables(steps.vars, injectedVariables);
  return {
    steps: resolvePathsInSteps(steps.steps, variables),
    vars: variables,
  };
};
// #endregion
