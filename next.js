#!/usr/bin/env node

import fs from "node:fs/promises";
import fss from "node:fs";
import path from "node:path";
import { fileURLToPath, URL } from "node:url";
// import { spawn } from "node:child_process";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import {
  fromHere,
  runAsync,
  copyApiToFile,
  generateNextApiRoutes,
} from "./lib.js";
import { setupFastify } from "./backend.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const createNextApp = async () => {
  try {
    const projectName = "init_snaptail"; // You can change this to your desired project name

    await runAsync(
      "npx",
      [
        "create-next-app@latest",
        projectName,
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
      { stdio: "inherit" }
    );

    // ✔ What is your project named? … my-app
    // ✔ Would you like to use TypeScript? … No / Yes
    // ✔ Would you like to use ESLint? … No / Yes
    // ✔ Would you like to use Tailwind CSS? … No / Yes
    // ✔ Would you like to use `src/` directory? … No / Yes
    // ✔ Would you like to use App Router? (recommended) … No / Yes
    // ✔ Would you like to customize the default import alias (@/*)? … No / Yes

    console.info(`Next.js application created successfully!`);
    await fs.rename(projectName, ".snaptail");
  } catch (error) {
    console.error("Error creating Next.js application:", error);
  }
};

/**
 * Check what dependencies are needed from the user's single react file
 * Parse the user's single react file and get the dependencies
 * @param {string} filePath js source file path
 * @returns {Promise<string[]>}
 */
const getDependencies = async (filePath) => {
  const content = await fs.readFile(filePath, "utf-8");
  const importRegex =
    /import\s+(?:(?:\w+(?:\s*,\s*\{\s*[\w\s,]+\})?|\{\s*[\w\s,]+\})|\*\s+as\s+\w+)\s+from\s+['"]([^'"]+)['"]/g;
  const matches = [...content.matchAll(importRegex)];
  const dependencies = new Set(matches.map((match) => match[1]));
  return Array.from(dependencies).filter((dep) => !dep.startsWith("."));
};

/**
 * Setup's the single file app from single react file
 * @param {string} userFile - The path to the user's single react file
 */
const main = async (userFile) => {
  // Detect if project is already set-up by checking if .wiresnap dir is created
  if (!fss.existsSync(fromHere(".snaptail"))) {
    console.info("Setting up the project");
    // Remove unnecessary files
    await createNextApp(); // create .snaptail dir nextjs project
    // await renameDirectory(); // sfa dir to .snaptail
  }
  await Promise.allSettled([
    fs.copyFile(
      fromHere(__dirname, "templates", "next", "page.tsx"),
      fromHere(".snaptail", "src", "app", "page.tsx")
    ),
    fs.copyFile(
      fromHere(__dirname, "templates", "next", "globals.css"),
      fromHere(".snaptail", "src", "app", "globals.css")
    ),
    fs.copyFile(
      fromHere(__dirname, "templates", "next", "index.css"),
      fromHere(".snaptail", "src", "app", "index.css")
    ),
  ]);

  const fileExt = userFile.split(".").pop() === "tsx" ? "tsx" : "jsx";

  if (fileExt === "tsx") {
    await fs.copyFile(
      fromHere(__dirname, "templates", "next", "tsconfig.json"),
      fromHere(".", "tsconfig.json")
    );
  }

  // copy the user's single react file and add it to the
  await fs.cp(
    userFile,
    fromHere(".snaptail", "src", "app", "user", `app.${fileExt}`)
  );

  console.info("Detecting dependencies");
  const dependencies = await getDependencies(userFile);

  console.info(`Installing detected dependencies`);
  await runAsync("npm", ["--prefix", ".snaptail", "install", ...dependencies]);
  // Install typescript dependencies
  await runAsync("npm", [
    "--prefix",
    ".snaptail",
    "install",
    "-D",
    ...dependencies.map((dep) => `@types/${dep}`),
  ]);

  console.info("Setting up api");
  await copyApiToFile(userFile, path.join(".snaptail", "user_api.mjs"));

  if (!fss.existsSync(path.join(".snaptail", "src", "pages", "api"))) {
    await fs.mkdir(path.join(".snaptail", "src", "pages", "api"), {
      recursive: true,
    });
  }
  const { api: userApiConf } = await import(
    // Change path to URL so we can import it
    new URL(path.join("./", "./.snaptail", "user_api.mjs"), import.meta.url)
      .pathname
  );
  await generateNextApiRoutes(
    userApiConf,
    path.join(".snaptail", "src", "pages")
  );

  // Setup a file watcher and copy new version into the .wiresnap dir
  console.info("Watching for changes");
  const watcher = fss.watch(
    userFile,
    { persistent: true },
    async (eventType, filename) => {
      if (eventType === "change") {
        console.info(
          `${filename} has been modified. Updating .snaptail/src/app/app.${fileExt}`
        );
        try {
          // maybe change to .tsx, we will see
          await fs.cp(
            userFile,
            fromHere(".snaptail", "src", "app", "user", `app.${fileExt}`),
            { force: true }
          );

          console.info("Updating api routes");
          await copyApiToFile(userFile, path.join(".snaptail", "user_api.js"));
          const { api: userApiConfRefresh } = await import(
            // Change path to URL so we can import it
            new URL(path.join(".snaptail", "user_api.mjs"), import.meta.url)
              .pathname
          );
          await generateNextApiRoutes(
            userApiConfRefresh,
            path.join(".snaptail", "src", "pages")
          );
        } catch (error) {
          console.error("Error updating .snaptail/src/user.jsx:", error);
        }
      }
    }
  );

  // Ensure the watcher is closed when the process exits
  process.on("SIGINT", () => {
    watcher.close();
    process.exit(0);
  });

  // Run the dev project
  await runAsync("npm", ["--prefix", ".snaptail", "run", "dev"], {
    stdio: "inherit",
  });
};

if (process.argv.length === 3 && process.argv[2] === "init") {
  fs.copyFile(
    fromHere(__dirname, "templates", "next", "starter.tsx"),
    "myapp.tsx"
  )
    .then(() => {
      console.info("myapp.tsx has been created");
      console.info("Usage: snaptail myapp.tsx");
    })
    .finally(() => {
      process.exit(0);
    });
} else if (process.argv.length < 3) {
  console.error("Usage: snaptail init|<path-to-jsx-file>");
  process.exit(1);
} else {
  main(process.argv[2]);
}
