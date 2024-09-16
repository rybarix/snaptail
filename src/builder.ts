import path from "node:path";
// import fs from "node:fs/promises";

const PROJECT_DIR = ".snaptail";

type InitNextJsProject = {
  action: "initNextJsProject";
  dir: string;
};

type CpAction = {
  action: "cp";
  src: string;
  dst: string;
};

type RmAction = {
  action: "rm";
  src: string;
};

type ConfigStep = InitNextJsProject | CpAction | RmAction | CpAction;

export type StepsFile = {
  steps: ConfigStep[];
};

/**
 * Path resolution depending on the path type.
 *
 * Each path is expected to start with one of the following symbols:
 *
 * - "@" - relative path resolution to the snaptail project dir
 * - "~" - relate path resolution to user's dir
 * - "/" - relative resolution to the snaptail internal files
 */
export const pth = (filePath: string) => {
  const type = filePath.at(0);
  const justPath = filePath.slice(1);

  switch (type) {
    case "@":
      return path.join(PROJECT_DIR, justPath);
    case "~":
      // path from where user is executing the command
      return path.join(process.cwd(), justPath);
    case "/":
      // path from snaptail internal files
      return path.join(__dirname, justPath);
    default:
      throw new Error(`unknown path type ${type}`);
  }
};

export const handleStep = async (step: ConfigStep) => {
  switch (step.action) {
    case "initNextJsProject":
      //   await setupProject(step.dir, []);
      break;
  }
};

export const loadSteps = async (
  _stepsFilepath: string,
  _options = undefined
) => {
  try {
    // const _conf: StepsFile = JSON.parse(
    //   await fs.readFile(stepsFilepath, "utf-8")
    // );
    // for (const s of conf.steps) {
    // }
  } catch (error) {}
};
