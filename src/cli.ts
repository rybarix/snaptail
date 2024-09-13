import { Command } from "commander";
import {
  buildProject,
  initializeProject,
  runSingleFileApplication,
} from "./lib.js";

const program = new Command();

program
  .command("init")
  .description("Initialize a new Snaptail project")
  .option("--ui <library>", "Specify the UI library to use (e.g., shadcn)")
  .option("-b, --base <path>", "Specify the path to Snaptail files")
  .option("--hidden", "Hide the project in home dir (experimental)")
  .action(initializeProject);

program
  .command("run <file>")
  .description("Run a single file application")
  .option("-b, --base <path>", "Specify the path to Snaptail files")
  .action(runSingleFileApplication);

program
  .command("build")
  .description("Build the project for deployment")
  .requiredOption(
    "--target <target>",
    "Specify the build target (e.g., nextjs, snaptail)"
  )
  .option("-b, --base <path>", "Specify the path to Snaptail files")
  .action(buildProject);

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
