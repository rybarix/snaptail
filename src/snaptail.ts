import { Command } from "commander";
import path from "path";
import { fileURLToPath } from "url";
import { copyFileAndCreateDir, setupProject, SetupStep } from "./templator.js";
import fs from "fs/promises";
import { type PathLike } from "fs";
import { copyApiToFile, getAllImportsRawFromFile } from "../lib.js";
import { generateNextApiRoutes } from "../next.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();

const projectName = () => "snaptail-project";

// Path to project dir
const ppath = (...paths: string[]) => {
  const p = path.join(process.cwd(), projectName(), ...paths);
  console.log("ppath", p);
  return p;
};
// Update spath function to use the provided path if available
const spath = (...paths: string[]) => {
  const basePath = path.resolve(program.opts().base || __dirname);
  console.log("base path", basePath);
  return path.join(basePath, ...paths);
};

const cpath = (...paths: string[]) => {
  const p = path.join(process.cwd(), ...paths);
  console.log("cpath", p);
  return p;
};

async function initializeProject(options: { ui: string }) {
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
    { action: "initNextProject" },
    {
      action: "replaceFile",
      sourcePath: spath("templates", "next", "page.tsx"),
      targetPath: ppath("src", "app", "page.tsx"),
    },
    {
      action: "replaceFile",
      sourcePath: spath("templates", "next", "globals.css"),
      targetPath: ppath("src", "app", "globals.css"),
    },
    {
      action: "deleteFileOrDir",
      targetPath: ppath("src", "app", "index.css"),
    },
    {
      action: "copyFile",
      sourcePath: spath("templates", "next", "tsconfig.json"),
      destinationPath: cpath("tsconfig.json"),
    },
  ];

  if (uiLibrary === "shadcn") {
    steps.push(
      { action: "runNpmInstall" },
      {
        action: "executeCommand",
        command: "npx",
        args: ["--yes", "shadcn-ui@latest", "init", "-d"],
      },
      {
        action: "executeCommand",
        command: "npx",
        args: ["--yes", "shadcn-ui@latest", "add", "--all"],
      },
      {
        action: "appendFile",
        sourcePath: spath("templates", "next", "shadcn.css"),
        targetPath: ppath("src", "app", "globals.css"),
      },
      {
        action: "copyFile",
        sourcePath: spath("templates", "next", "startershadcn.tsx"),
        destinationPath: cpath("starter.tsx"),
      }
    );
  } else {
    steps.push({
      action: "copyFile",
      sourcePath: spath("templates", "next", "starter.tsx"),
      destinationPath: cpath("starter.tsx"),
    });
  }

  try {
    await setupProject(projectName(), steps);
    console.log("Project initialized successfully.");
    console.log("To get started, run: cd snaptail-project && npm run dev");
  } catch (error) {
    console.error("Failed to initialize project:", error);
  }
}

async function runSingleFileApplication(file: PathLike) {
  console.log(`Running file: ${file}`);

  const steps: SetupStep[] = [
    {
      // detect and install dependencies
      action: "detectAndInstallDependencies",
      projectPath: cpath(projectName()),
      targetPaths: [cpath(file.toString())],
    },
    {
      action: "watchForChanges",
      targetPath: cpath(file.toString()),
      callback: async (filePath) => {
        console.log(`File changed: ${filePath}`);

        const baseName = path.basename(filePath);

        if (baseName === file.toString() || baseName === ".env") {
          try {
            const fileExt = path.extname(file.toString());

            // Copy the user's file to the project
            await copyFileAndCreateDir(
              file,
              ppath("src", "app", "user", `app${fileExt}`)
            );

            console.log("Updating API routes");

            const imports = await getAllImportsRawFromFile(file.toString());

            await copyApiToFile(
              file.toString(),
              imports,
              ppath("user_api.mjs")
            );

            await generateNextApiRoutes(
              (await import(ppath("user_api.mjs"))).api,
              ppath("src", "pages", "api")
            );

            if (filePath === ".env") {
              await fs.copyFile(cpath(".env"), ppath(".env"));
            }

            console.log("Project files updated successfully");
          } catch (error) {
            console.error("Error updating project files:", error);
          }
        }
      },
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

  try {
    await setupProject(projectName(), steps);
  } catch (error) {
    console.error("Failed to run the application:", error);
  }
}

async function buildProject(options: { target: string }) {
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

program
  .command("init")
  .description("Initialize a new Snaptail project")
  .option("--ui <library>", "Specify the UI library to use (e.g., shadcn)")
  .action(initializeProject);

program
  .command("run <file>")
  .description("Run a single file application")
  .action(runSingleFileApplication);

program
  .command("build")
  .description("Build the project for deployment")
  .requiredOption(
    "--target <target>",
    "Specify the build target (e.g., nextjs, snaptail)"
  )
  .action(buildProject);

program.option("-b, --base <path>", "Specify the path to Snaptail files");

// Add a default action for when no command is specified
program.action(() => {
  if (
    process.argv.length <= 2 ||
    process.argv.includes("-h") ||
    process.argv.includes("--help")
  ) {
    program.outputHelp();
  } else {
    console.log(
      "Invalid command. Use --help for a list of available commands."
    );
  }
});

program.parse();
