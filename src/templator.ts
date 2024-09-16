import fs from "fs/promises";
import { spawn } from "child_process";
import { PathLike } from "fs";
import { watch, type FSWatcher } from "chokidar";
import fse from "fs-extra/esm";
import path from "path";
import { getDependencies } from "./legacy/lib.js";
import { nextTick } from "process";

/**
 * Execute a shell command
 * @param {string} command - Command to execute
 * @param {string[]} args - Command arguments
 * @param {Object} options - Spawn options
 * @returns {Promise<void>}
 */
async function executeCommand(
  command: string,
  args: any[] | readonly string[] | undefined,
  options: object = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, options);
    process.on("close", (code) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(
            `Command ${command} ${args?.join(" ")} failed with exit code ${code}`
          )
        );
    });
  });
}

/**
 * Initialize a Next.js project
 * @returns {Promise<void>}
 */
async function initNextProject(projectDir: string): Promise<void> {
  const postfix = Number(new Date()).toString();
  const tmpDir = "snaptail_" + postfix;

  await executeCommand(
    "npx",
    [
      "--yes",
      "create-next-app@latest",
      tmpDir,
      "--typescript",
      "--eslint",
      "--app",
      "--src-dir",
      "--tailwind",
      "--app",
      "--import-alias",
      "@/*",
      "--use-npm",
    ],
    {
      stdio: "inherit",
    }
  );
  await renameFile(tmpDir, projectDir);
  console.log(`Next.js project ${projectDir} initialized successfully.`);
}

/**
 * Replace a file in the project
 * @param {string} targetPath - Relative path of the file to be replaced
 * @param {string} sourcePath - Path of the custom file to replace with
 * @returns {Promise<void>}
 */
async function replaceFile(
  targetPath: string,
  sourcePath: PathLike
): Promise<void> {
  await fs.copyFile(sourcePath, targetPath);
  console.log(`Replaced ${targetPath} successfully.`);
}

/**
 * Copy a file to the project
 * @param sourcePath - Path of the file to copy
 * @param destinationPath - Relative path in the project to copy the file
 * @returns {Promise<void>}
 */
async function copyFile(
  sourcePath: PathLike,
  destinationPath: PathLike
): Promise<void> {
  await fs.copyFile(sourcePath, destinationPath);
  console.log(`Copied ${sourcePath} to ${destinationPath} successfully.`);
}

/**
 * Delete a file or directory from the project
 * @param {string} projectPath - Path to the project
 * @param {string} targetPath - Relative path of the file or directory to be deleted
 * @returns {Promise<void>}
 */
async function deleteFileOrDir(targetPath: string): Promise<void> {
  await fs.rm(targetPath, { recursive: true, force: true });
  console.log(`Deleted ${targetPath} successfully.`);
}

/**
 * Create a directory in the project
 * @param {string} projectPath - Path to the project
 * @param {string} dirPath - Relative path of the directory to be created
 * @returns {Promise<void>}
 */
async function createDirectory(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
  console.log(`Created directory ${dirPath} successfully.`);
}

/**
 * Run npm install in the project
 * @param {string} projectPath - Path to the project
 * @returns {Promise<void>}
 */
async function runNpmInstall(projectPath: string): Promise<void> {
  await executeCommand("npm", ["install"], { cwd: projectPath });
  console.log("npm install completed successfully.");
}

/**
 * Build the project
 * @param {string} projectPath - Path to the project
 * @returns {Promise<void>}
 */
async function buildProject(projectPath: string): Promise<void> {
  await executeCommand("npm", ["run", "build"], { cwd: projectPath });
  console.log("Project built successfully.");
}

/**
 *
 * @param {string} projectPath
 * @param {string[]} dependencies
 */
export async function installDetectedDependencies(
  projectPath: any,
  dependencies: any
) {
  await executeCommand("npm", ["install", ...dependencies], {
    cwd: projectPath,
  });
}

/**
 * Append content from one file to another
 * @param {string} targetPath - Path of the file to append to
 * @param {string} sourcePath - Path of the file to append from
 * @returns {Promise<void>}
 */
async function appendFile(
  targetPath: string,
  sourcePath: string
): Promise<void> {
  const content = await fs.readFile(sourcePath, "utf-8");
  await fs.appendFile(targetPath, content);
  console.log(
    `Appended content from ${sourcePath} to ${targetPath} successfully.`
  );
}

async function renameFile(
  sourcePath: string,
  destinationPath: string
): Promise<void> {
  try {
    await fs.rename(sourcePath, destinationPath);
    console.log(`File renamed from ${sourcePath} to ${destinationPath}`);
  } catch (error) {
    console.error(`Error renaming file: ${error}`);
    throw error;
  }
}

// useful when when we want to trigger watch file change
async function touchFile(filename: string) {
  console.log(`Touching ${filename}`);
  const time = new Date();
  await fs.utimes(filename, time, time).catch(async function (err) {
    if ("ENOENT" !== err.code) {
      throw err;
    }
    let fh = await fs.open(filename, "a");
    await fh.close();
  });
}

/**
 * Compose and execute project setup steps
 * @param {string} projectName - Name of the project
 * @param {Array} steps - Array of step objects
 * @returns {Promise<void>}
 */
type InitNextProjectStep = {
  action: "initNextProject";
  /** Directory to rename the project to */
  directory: string;
};

type ReplaceFileStep = {
  action: "replaceFile";
  targetPath: string;
  sourcePath: string;
};

type CopyFileStep = {
  action: "copyFile";
  sourcePath: string;
  destinationPath: string;
};

type DeleteFileOrDirStep = {
  action: "deleteFileOrDir";
  targetPath: string;
};

type CreateDirectoryStep = {
  action: "createDirectory";
  dirPath: string;
};

type RunNpmInstallStep = {
  action: "runNpmInstall";
};

type BuildProjectStep = {
  action: "buildProject";
};

type WatchForChangesStep = {
  action: "watchForChanges";
  targetPaths: string[];
  callback: (filePath: string) => Promise<void>;
};

type ExecuteCommandStep = {
  action: "executeCommand";
  command: Parameters<typeof spawn>[0];
  args: Parameters<typeof spawn>[1];
  options?: Parameters<typeof spawn>[2];
};

type AppendFileStep = {
  action: "appendFile";
  targetPath: string;
  sourcePath: string;
};

type DetectAndInstallDependenciesStep = {
  action: "detectAndInstallDependencies";
  projectPath: string;
  targetPaths: PathLike[];
};

// Define the RenameFileStep type
type RenameFileStep = {
  action: "renameFile";
  sourcePath: string;
  destinationPath: string;
};

type TouchFileStep = {
  action: "touchFile";
  filename: string;
};

// escape hatch for running arbitrary code
// should be avoided if possible
type RunCodeStep = {
  action: "runCode";
  callback: () => Promise<void>;
};

export type SetupStep =
  | InitNextProjectStep
  | ReplaceFileStep
  | CopyFileStep
  | DeleteFileOrDirStep
  | CreateDirectoryStep
  | RunNpmInstallStep
  | BuildProjectStep
  | WatchForChangesStep
  | ExecuteCommandStep
  | AppendFileStep
  | DetectAndInstallDependenciesStep
  | RenameFileStep
  | TouchFileStep
  | RunCodeStep;

const setupWatchForFileChanges = (
  targetPaths: string[],
  action: ((filePath: string) => Promise<void>) | undefined = undefined
) => {
  return watch(targetPaths).on("change", async (filePath) => {
    if (action) {
      await action(filePath);
    }
  });
};

const installDependencies = async (
  projectPath: string,
  userFile: PathLike[]
) => {
  console.info("Detecting dependencies");
  for (const file of userFile) {
    const dependencies = await getDependencies(file.toString());
    console.info(`Installing detected dependencies of ${file.toString()}`);
    await executeCommand("npm", [
      "--prefix",
      projectPath,
      "install",
      ...dependencies,
    ]);
    // Install typescript dependencies
    await executeCommand("npm", [
      "--prefix",
      projectPath,
      "install",
      "-D",
      ...dependencies.map((dep) => `@types/${dep}`),
    ]);
  }
};

export async function copyFileAndCreateDir(
  sourcePath: PathLike,
  destPath: PathLike
) {
  // Ensure the directory exists
  await fse.ensureDir(path.dirname(destPath.toString()));

  // Copy the file
  await fs.copyFile(sourcePath, destPath);
  console.log("File copied successfully");
}

export async function setupProject(
  projectName: string,
  steps: SetupStep[]
): Promise<void> {
  let watchers: FSWatcher[] = [];

  try {
    for (const step of steps) {
      switch (step.action) {
        case "initNextProject":
          await initNextProject(step.directory);
          break;
        case "replaceFile":
          await replaceFile(step.targetPath, step.sourcePath);
          break;
        case "copyFile":
          await copyFile(step.sourcePath, step.destinationPath);
          break;
        case "deleteFileOrDir":
          await deleteFileOrDir(step.targetPath);
          break;
        case "createDirectory":
          await createDirectory(step.dirPath);
          break;
        case "runNpmInstall":
          await runNpmInstall(projectName);
          break;
        case "buildProject":
          await buildProject(projectName);
          break;
        case "watchForChanges":
          watchers.push(
            setupWatchForFileChanges(step.targetPaths, step?.callback)
          );
          break;
        case "executeCommand":
          await executeCommand(step.command, step.args, step.options);
          break;
        case "appendFile":
          await appendFile(step.targetPath, step.sourcePath);
          break;
        case "detectAndInstallDependencies":
          await installDependencies(step.projectPath, step.targetPaths);
          break;
        case "renameFile":
          await renameFile(step.sourcePath, step.destinationPath);
          break;
        case "touchFile":
          nextTick(() => {
            touchFile(step.filename);
          });
          break;
        case "runCode":
          await step.callback();
          break;
        default:
          console.warn(`Unknown action: ${(step as SetupStep).action}`);
      }
    }
    console.log("Project setup completed successfully.");
  } catch (error) {
    console.error("Project setup failed:", error);
  } finally {
    for (const watcher of watchers) {
      watcher.close();
    }
  }
}
