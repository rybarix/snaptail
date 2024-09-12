import path from "node:path";
import { setupProject, SetupStep } from "./templator.js";
import { makeOnFileChangeNextJs } from "./frameworks/nextjs.js";
import { PathLike } from "node:fs";
import fs2 from "fs-extra";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

enum FrameWorkEnum {
  Unknown = "__unknown__",
  NextJs = "nextjs",
}

const projectName = () => ".snaptail"; // project directory
const starterFile = "starter.tsx";

// Path to project dir
export const ppath = (...paths: string[]) => {
  const p = path.join(process.cwd(), projectName(), ...paths);
  return p;
};
// Update spath function to use the provided path if available
export const spath = (basePath?: string, ...paths: string[]) => {
  return path.join(basePath ?? __dirname, ...paths);
};
// path from - relative to process execution path
export const cpath = (...paths: string[]) => {
  const p = path.join(process.cwd(), ...paths);
  return p;
};

export async function initializeProject(options: {
  ui: string;
  base?: string;
}) {
  console.log("Initializing a new Snaptail project...");
  // Get current absolute path to this folder and create hash off it.

  // EXPERIMENTAL TODO: try hiding project in home dir ~/ using hash of cwd
  // const currentDir = await fs.realpath(".");
  // Store the build dir in
  // const toHashDir = createHash("sha256");
  // toHashDir.update(currentDir);
  // const dirHash = toHashDir.digest("hex");

  // If we can't init project directly in ~/ dir, init it here, and move it after
  const uiLibrary = options.ui || "default";

  // Steps to initialize the project
  const steps: SetupStep[] = [
    { action: "initNextProject", directory: projectName() },
    {
      action: "replaceFile",
      sourcePath: spath(options?.base, "templates", "next", "page.tsx"),
      targetPath: ppath("src", "app", "page.tsx"),
    },
    {
      action: "replaceFile",
      sourcePath: spath(options?.base, "templates", "next", "globals.css"),
      targetPath: ppath("src", "app", "globals.css"),
    },
    {
      action: "deleteFileOrDir",
      targetPath: ppath("src", "app", "index.css"),
    },
    {
      action: "copyFile",
      sourcePath: spath(options?.base, "templates", "next", "tsconfig.json"),
      destinationPath: cpath("tsconfig.json"),
    },
  ];

  if (uiLibrary === "shadcn") {
    steps.push(
      {
        action: "executeCommand",
        command: "npx",
        args: ["--yes", "shadcn@latest", "init", "-d"],
        options: {
          cwd: cpath(projectName()),
          stdio: "inherit",
        },
      },
      {
        action: "executeCommand",
        command: "npx",
        args: ["--yes", "shadcn@latest", "add", "--all", "-o"],
        options: {
          cwd: cpath(projectName()),
          stdio: "inherit",
        },
      },
      {
        action: "appendFile",
        sourcePath: spath(options?.base, "templates", "next", "shadcn.css"),
        targetPath: ppath("src", "app", "globals.css"),
      },
      {
        action: "copyFile",
        sourcePath: spath(
          options?.base,
          "templates",
          "next",
          "startershadcn.tsx"
        ),
        destinationPath: cpath(starterFile),
      },
      { action: "runNpmInstall" }
    );
  } else {
    steps.push({
      action: "copyFile",
      sourcePath: spath(options?.base, "templates", "next", "starter.tsx"),
      destinationPath: cpath(starterFile),
    });
  }

  try {
    await setupProject(projectName(), steps);
    console.log("Project initialized successfully.");
    console.log(`To get started, run: npx snaptail@latest run ${starterFile}`);
  } catch (error) {
    console.error("Failed to initialize project:", error);
  }
}

export async function runSingleFileApplication(
  file: PathLike,
  _options: { base?: string }
) {
  console.log(`Running file: ${file}`);

  let framework: FrameWorkEnum = FrameWorkEnum.Unknown;

  // To detect framework we need to look for next.config.mjs
  if (await fs2.exists(ppath("next.config.mjs"))) {
    framework = FrameWorkEnum.NextJs;
  }

  let steps: SetupStep[] = [];
  if (framework === FrameWorkEnum.Unknown) {
    console.log("Unknown framework");
    process.exit(1);
  } else if (framework === FrameWorkEnum.NextJs) {
    steps = [
      {
        // detect and install dependencies
        action: "detectAndInstallDependencies",
        projectPath: cpath(projectName()),
        targetPaths: [cpath(file.toString())],
      },
      {
        action: "watchForChanges",
        targetPaths: [cpath(file.toString()), cpath(".env")],
        callback: makeOnFileChangeNextJs(),
      },
      // trigger build by touching starter file
      {
        action: "touchFile",
        filename: starterFile,
      },
      {
        action: "executeCommand",
        command: "npm",
        args: ["--prefix", projectName(), "run", "dev"],
        options: {
          cwd: cpath("."),
          stdio: "inherit",
        },
      },
    ];
  }

  try {
    await setupProject(projectName(), steps);
  } catch (error) {
    console.error("Failed to run the application:", error);
  }
}

export async function buildProject(options: { target: string; base?: string }) {
  console.log(`Building project for target: ${options.target}`);

  const steps: SetupStep[] = [
    { action: "runNpmInstall" },
    { action: "buildProject" },
  ];

  if (options.target === "nextjs") {
    // Add any Next.js specific build steps here
  } else if (options.target === "snaptail") {
    // Add any Snaptail specific build steps here
  } else {
    console.log(`Building for custom target: ${options.target}`);
    // Add logic for custom targets
  }

  try {
    await setupProject(projectName(), steps);
    console.log("Build completed successfully.");
  } catch (error) {
    console.error("Build failed:", error);
  }
}
