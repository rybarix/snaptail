#!/usr/bin/env node

import fs from "node:fs/promises";
import fss from "node:fs";
// import path from "node:path";
// import { fileURLToPath } from "node:url";
// import { spawn } from "node:child_process";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { fromHere, runAsync, copyApiToFile } from "./lib.js";
import { setupFastify } from "./backend.js";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

const setupReactProject = async () => {
  await runAsync("npm", [
    "create",
    "vite@latest",
    "sfa",
    "--",
    "--template",
    "react",
  ]);
};

const renameDirectory = async () => {
  await fs.rename("sfa", ".wiresnap");
};

const installDependencies = async () => {
  await runAsync("npm", ["--prefix", fromHere(".wiresnap"), "install"]);
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

const MAIN_FILE_TEMPLATE = [
  "import { StrictMode } from 'react'",
  "import { createRoot } from 'react-dom/client'",
  "import { App } from './user.jsx'",
  "import './index.css'",
  "",
  "createRoot(document.getElementById('root')).render(",
  "  <StrictMode>",
  "    <App />",
  "  </StrictMode>",
  ")",
].join("\n");

const setupTailwind = async () => {
  await runAsync("npm", [
    "--prefix",
    fromHere(".wiresnap"),
    "install",
    "-D",
    "tailwindcss",
    "postcss",
    "autoprefixer",
  ]);

  const postConfig = [
    "export default {",
    "  plugins: {",
    "    tailwindcss: {},",
    "    autoprefixer: {},",
    "  }",
    "}",
  ].join("\n");

  const twConfig = [
    "export default {",
    '  content: ["./src/**/*.{html,js,jsx}"],',
    "  theme: {",
    "    extend: {},",
    "  },",
    "  plugins: [],",
    "};",
  ].join("\n");

  const twCss = [
    "@tailwind base;",
    "@tailwind components;",
    "@tailwind utilities;",
  ].join("\n");

  await Promise.allSettled([
    fs.writeFile(
      fromHere(".wiresnap", "tailwind.config.js"),
      twConfig,
      "utf-8"
    ),
    fs.writeFile(
      fromHere(".wiresnap", "postcss.config.js"),
      postConfig,
      "utf-8"
    ),
    fs.writeFile(fromHere(".wiresnap", "src", "index.css"), twCss, "utf-8"),
  ]);
};

const setupMantine = async () => {
  await runAsync("npm", [
    "--prefix",
    fromHere(".wiresnap"),
    "install",
    "-D",
    "postcss",
    "postcss-preset-mantine",
    "postcss-simple-vars",
  ]);

  const twCss = [
    "@layer tailwind {",
    "  @tailwind base;",
    "}",
    "@tailwind components;",
    "@tailwind utilities;",
  ].join("\n");

  await runAsync("npm", [
    "--prefix",
    fromHere(".wiresnap"),
    "install",
    "@mantine/core",
    "@mantine/hooks",
    "@mantine/form",
    "@mantine/dates",
    "dayjs",
    "@mantine/charts",
    "recharts@2",
    "@mantine/notifications",
    "@mantine/code-highlight",
    "@mantine/tiptap",
    "@tabler/icons-react",
    "@tiptap/react",
    "@tiptap/extension-link",
    "@tiptap/starter-kit",
    "@mantine/dropzone",
    "@mantine/carousel",
    "embla-carousel-react",
    "@mantine/spotlight",
    "@mantine/modals",
    "@mantine/nprogress",
  ]);

  const postConfig = [
    "export default {",
    "  plugins: {",
    "    tailwindcss: {},",
    "    autoprefixer: {},",
    "    'postcss-preset-mantine': {},",
    "    'postcss-simple-vars': {",
    "      variables: {",
    "        'mantine-breakpoint-xs': '36em',",
    "        'mantine-breakpoint-sm': '48em',",
    "        'mantine-breakpoint-md': '62em',",
    "        'mantine-breakpoint-lg': '75em',",
    "        'mantine-breakpoint-xl': '88em',",
    "      },",
    "    },",
    "  },",
    "};",
  ].join("\n");

  const MAIN_FILE_TEMPLATE_MANTINE = [
    "import { StrictMode } from 'react';",
    "import { createRoot } from 'react-dom/client';",
    "import { App } from './user.jsx';",
    "import { MantineProvider } from '@mantine/core';",
    "import '@mantine/core/styles.css';",
    "import './index.css';",
    "",
    "createRoot(document.getElementById('root')).render(",
    "  <StrictMode>",
    "    <MantineProvider>",
    "      <App />",
    "    </MantineProvider>",
    "  </StrictMode>",
    ")",
  ].join("\n");

  // await fs.rm(fromHere(".wiresnap", "src", "main.jsx"));
  await Promise.allSettled([
    fs.writeFile(
      fromHere(".wiresnap", "postcss.config.js"),
      postConfig,
      "utf-8"
    ),
    await fs.writeFile(
      fromHere(".wiresnap", "src", "main.jsx"),
      MAIN_FILE_TEMPLATE_MANTINE,
      "utf-8"
    ),
    fs.writeFile(fromHere(".wiresnap", "src", "index.css"), twCss, "utf-8"),
  ]);
};

/**
 * @param {{ filePath: string, password: string, destPath: string }}
 */
export const prepareAuthTemplate = async ({ filePath, password, destPath }) => {
  const JWT_SECRET = crypto.randomBytes(32).toString("hex");
  const HASHED_PASSWORD = await bcrypt.hash(password, 10);

  try {
    let source = await fs.readFile(filePath, "utf-8");
    source = source.replace("{{JWT_SECRET}}", JWT_SECRET);
    source = source.replace("{{HASHED_PASSWORD}}", HASHED_PASSWORD);
    await fs.writeFile(destPath, source, "utf-8");
  } catch (/** @type {Error} */ e) {
    console.error("unable to read the sources file");
  }
};

// TODO:
const setupNetlifyEdgeAuthFunctions = async () => {
  await runAsync("npm", [
    "--prefix",
    ".wiresnap",
    "install",
    "netlify-edge-functions",
  ]);
};

/**
 * Setup's the single file app from single react file
 * @param {string} userFile - The path to the user's single react file
 */
const main = async (userFile) => {
  // Detect if project is already set-up by checking if .wiresnap dir is created
  if (!fss.existsSync(fromHere(".wiresnap"))) {
    console.info("Setting up the project");
    // Remove unnecessary files
    await setupReactProject(); // create sfa dir vite react project
    await renameDirectory(); // sfa dir to .wiresnap

    await Promise.allSettled([
      fs.rm(fromHere(".wiresnap", "src", "App.jsx")),
      fs.rm(fromHere(".wiresnap", "src", "App.css")),
      fs.rm(fromHere(".wiresnap", "src", "index.css")),
    ]);

    // This should be optional
    await setupTailwind();
    await setupMantine();

    console.info("Installing core dependencies");
    await installDependencies(); // install dependencies
  }

  // Inject `MAIN_FILE_TEMPLATE` as file that will just import the user's single react file
  /*
  await fs.writeFile(
    fromHere(".wiresnap", "src", "main.jsx"),
    MAIN_FILE_TEMPLATE,
    "utf-8"
  );
  */

  // copy the user's single react file and add it to the .wiresnap/src/user.jsx
  await fs.cp(userFile, ".wiresnap/src/user.jsx");

  console.info("Detecting dependencies");
  const dependencies = await getDependencies(userFile);

  console.info(`Installing detected dependencies`);
  await runAsync("npm", ["--prefix", ".wiresnap", "install", ...dependencies]);

  console.info("Setting up fastify");
  await setupFastify();
  console.info("Setting up api");
  await copyApiToFile(userFile, ".wiresnap/user_api.js");

  // Setup a file watcher and copy new version into the .wiresnap dir
  console.info("Watching for changes");
  const watcher = fss.watch(
    userFile,
    { persistent: true },
    async (eventType, filename) => {
      if (eventType === "change") {
        console.info(
          `${filename} has been modified. Updating .wiresnap/src/user.jsx`
        );
        try {
          await fs.cp(userFile, ".wiresnap/src/user.jsx", { force: true });
          await copyApiToFile(userFile, ".wiresnap/user_api.js");
          console.info("Successfully updated .wiresnap/src/user.jsx");
        } catch (error) {
          console.error("Error updating .wiresnap/src/user.jsx:", error);
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
  /* If fastify is used, then use the fastifydev script
  await runAsync("npm", ["--prefix", ".wiresnap", "run", "dev"], {
    stdio: "inherit",
  });
  */

  console.info("Fastify server is running...");
  await runAsync("npm", ["--prefix", ".wiresnap", "run", "fastifydev"], {
    stdio: "inherit",
  });
};

if (process.argv.length < 3) {
  console.error("Usage: wiresnap <path-to-jsx-file>");
  process.exit(1);
} else {
  main(process.argv[2]);
}
