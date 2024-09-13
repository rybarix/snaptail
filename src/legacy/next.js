#!/usr/bin/env node

import fs from "node:fs/promises";
import fss from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  runAsync,
  copyApiToFile,
  getAllImportsRawFromFile,
  getDependencies,
} from "./lib.js";
import chokidar from "chokidar";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const setupShadCnUi = async () => {
  // Default setup
  await runAsync("npx", ["--yes", "shadcn-ui@latest", "init", "-d"], {
    cwd: ".snaptail",
  });

  // Install all components
  await runAsync("npx", ["--yes", "shadcn-ui@latest", "add", "--all"], {
    cwd: ".snaptail",
  });

  const shadcnTwCssVars = await fs.readFile(
    path.join(__dirname, "templates", "next", "shadcn.css"),
    "utf-8"
  );
  // append css variables with default style
  await fs.appendFile(
    path.join(".snaptail", "src", "app", "globals.css"),
    shadcnTwCssVars,
    "utf-8"
  );
};

const createNextApp = async () => {
  try {
    const postfix = Number(new Date()).toString();
    const projectName = "snaptail_" + postfix;

    await runAsync(
      "npx",
      [
        "--yes",
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
 * Generate nextjs directory structure for api routes from a json object where
 * path is provided, handler function is provided and method is also provided.
 * Make sure that file generation supports URL parameters and dynamic routes.
 *
 * @param {Object[]} routes - Array of route objects
 * @param {string} routes[].path - API route path
 * @param {Function} routes[].handler - Route handler function
 * @param {string} routes[].method - HTTP method (GET, POST, etc.)
 * @param {string} baseDir - Base directory for API routes
 */
export async function generateNextApiRoutes(routes, baseDir) {
  for (const route of routes) {
    const { path: pathString, handler, method } = route;
    const segments = pathString.split("/").filter((segment) => segment);
    let currentDir = baseDir;

    // Create directories for each segment
    for (let i = 0; i < segments.length - 1; i++) {
      const segment = segments[i];
      const isParameter = segment.startsWith(":");
      const dirName = isParameter ? `[${segment.slice(1)}]` : segment;
      currentDir = path.join(currentDir, dirName);
      await fs.mkdir(currentDir, { recursive: true });
    }

    // Create the file for the last segment
    const lastSegment = segments[segments.length - 1];
    const isParameter = lastSegment.startsWith(":");
    const fileName = isParameter
      ? `[${lastSegment.slice(1)}].js`
      : `${lastSegment}.js`;
    const filePath = path.join(currentDir, fileName);

    // Generate the content for the API route file
    const fileContent = `
  export default function handler(req, res) {
    const { method } = req;

    if (method === '${method.toUpperCase()}') {
      return (${handler.toString()})(req, res);
    }

    res.setHeader('Allow', ['${method.toUpperCase()}']);
    res.status(405).end(\`Method \${method} Not Allowed\`);
  }
  `;

    await fs.writeFile(filePath, fileContent.trim());
    console.log(`Generated API route: ${filePath}`);
  }
}

/**
 * Generates next routes by dynamically importing extracted mjs api file.
 */
const generateApiFiles = async () => {
  // There's hack used to always import the newest file and avoid hitting cache https://github.com/nodejs/help/issues/2751
  const importPath =
    pathToFileURL(path.join(".snaptail", `user_api.mjs`)) +
    `?version=${Number(new Date())}`;

  const { api: userApiConf } = await import(importPath);

  await generateNextApiRoutes(
    userApiConf,
    path.join(".snaptail", "src", "pages")
  );
};

const setupBasicFiles = async () => {
  await Promise.allSettled([
    fs.copyFile(
      path.join(__dirname, "templates", "next", "page.tsx"),
      path.join(".snaptail", "src", "app", "page.tsx")
    ),
    fs.copyFile(
      path.join(__dirname, "templates", "next", "globals.css"),
      path.join(".snaptail", "src", "app", "globals.css")
    ),
    fs.copyFile(
      path.join(__dirname, "templates", "next", "index.css"),
      path.join(".snaptail", "src", "app", "index.css")
    ),
  ]);
};

/**
 * Setup's the single file app from single react file
 * @param {string} userFile  The path to the user's single react file
 * @param {{ type: 'nextjs'|'react-ts', ui: 'shadcn' }|undefined} config To support multiple frameworks in the future
 */
export const main = async (userFile, config = undefined) => {
  const fileExt = userFile.split(".").pop() === "tsx" ? "tsx" : "jsx";
  const isTs = fileExt === "tsx";

  // Detect if project is already set-up by checking if .wiresnap dir is created
  if (!fss.existsSync(path.join(".snaptail"))) {
    console.info("Setting up the project");

    if (config?.type === "nextjs") {
      await createNextApp(); // create .snaptail dir nextjs project
      await setupBasicFiles();

      if (config?.ui === "shadcn") {
        console.info("shadcn/ui setup");

        await setupShadCnUi();
      }
    }
  }

  if (isTs) {
    await fs.copyFile(
      path.join(__dirname, "templates", "next", "tsconfig.json"),
      path.join(".", "tsconfig.json")
    );
  }

  // copy the user's single react file and add it to the
  await fs.cp(
    userFile,
    path.join(".snaptail", "src", "app", "user", `app.${fileExt}`)
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

  const imports = await getAllImportsRawFromFile(userFile);
  await copyApiToFile(
    userFile,
    imports,
    path.join(".snaptail", "user_api.mjs")
  );

  if (!fss.existsSync(path.join(".snaptail", "src", "pages", "api"))) {
    await fs.mkdir(path.join(".snaptail", "src", "pages", "api"), {
      recursive: true,
    });
  }

  await generateApiFiles();

  if (fss.existsSync(path.join(".env"))) {
    fs.copyFile(".env", path.join(".snaptail", ".env"));
  }

  const watcher = chokidar
    .watch([".env", userFile])
    .on("change", async (filePath) => {
      try {
        // maybe change to .tsx, we will see
        await fs.cp(
          userFile,
          path.join(".snaptail", "src", "app", "user", `app.${fileExt}`),
          { force: true }
        );

        console.info("Updating api routes");

        const imports = await getAllImportsRawFromFile(userFile);

        await copyApiToFile(
          userFile,
          imports,
          path.join(".snaptail", "user_api.mjs")
        );

        await generateApiFiles();

        if (filePath.includes(".env")) {
          await fs.copyFile(".env", path.join(".snaptail", ".env"), {
            force: true,
          });
        }
      } catch (error) {
        console.error("Error updating .snaptail/src/user.jsx:", error);
      }
    });

  process.on("SIGINT", () => {
    watcher.close();
  });

  // Run the dev project
  await runAsync("npm", ["--prefix", ".snaptail", "run", "dev"], {
    stdio: "inherit",
  });
};

/**
 *
 * @param {'shadcn'|undefined} ui
 */
export const initCmd = async (ui) => {
  try {
    if (ui === "shadcn") {
      await fs.copyFile(
        path.join(__dirname, "templates", "next", "startershadcn.tsx"),
        "starter.tsx"
      );
    } else {
      await fs.copyFile(
        path.join(__dirname, "templates", "next", "starter.tsx"),
        "starter.tsx"
      );
    }

    await fs.copyFile(
      path.join(__dirname, "templates", "next", "tsconfig.json"),
      "tsconfig.json"
    );
  } catch (e) {
    console.error("unable to setup project");
  }

  console.info("starter.tsx ..... has been created");
  console.info("tsconfig.json ... has been created");
  console.info("run $ npx snaptail starter.tsx");
};

export const cli = async () => {
  /** @type {string|undefined} */
  let ui = undefined;

  // In current structure we need to always tell snaptail what ui we want to run.
  // It would be much better if this can happen in init stage instead.
  // But for alpha testing this is now good enoughTM.
  if (
    process.argv.length === 5 &&
    process.argv[3] === "--ui" &&
    process.argv[4] === "shadcn"
  ) {
    ui = "shadcn";
  } else if (process.argv.length === 5 && process.argv[3] === "--ui") {
    console.log("ui not supported");
    process.exit(1);
  }

  if (process.argv.length >= 3 && process.argv[2] === "init") {
    try {
      await initCmd(ui);
      process.exit(0);
    } catch {
      process.exit(1);
    }
  } else if (process.argv.length < 3) {
    console.error("Usage: snaptail init|<path-to-jsx-file>");
    process.exit(1);
  } else {
    // Ensure the watcher is closed when the process exits
    process.on("SIGINT", () => {
      process.exit(0);
    });

    main(process.argv[2], {
      type: "nextjs",
      ui,
    });
  }
};
