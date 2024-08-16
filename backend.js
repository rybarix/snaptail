import path from "node:path";
import fs from "node:fs/promises";
import { fromHere, runAsync } from "./lib.js";

import { __dirname } from "./lib.js";

/**
 * Scafold fastify project with javascript
 */
export const setupFastify = async () => {
  const backendDir = fromHere(".wiresnap");
  // create dir for backend
  await fs.mkdir(backendDir, { recursive: true });
  /*await runAsync("npm", ["init", "-y"], {
    cwd: backendDir,
  });
  await runAsync("npm", ["pkg", "set", "type=module"], {
    cwd: backendDir,
  });*/
  await runAsync("npm", ["install", "fastify", "@fastify/vite"], {
    cwd: backendDir,
  });

  // setup fastify
  await fs.copyFile(
    fromHere(__dirname, "templates/fastify.js"),
    path.join(backendDir, "app.js")
  );

  await runAsync(
    "npm",
    ["pkg", "set", "scripts.fastifydev=node app.js --dev"],
    {
      cwd: backendDir,
    }
  );

  await fs.copyFile(
    fromHere(__dirname, "templates/fastify-vite.config.js"),
    path.join(backendDir, "vite.config.js")
  );
};
