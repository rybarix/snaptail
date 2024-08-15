import fs from "fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * @param  {...string} path
 */
export const fromHere = (...paths) => {
  return path.join(__dirname, ...paths);
};

export const runAsync = (command, args, spawnArgs = undefined) => {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, spawnArgs);
    child.on("close", resolve);
  });
};

/**
 * @param {string} sourceFile
 * @param {string} targetFile
 */
export async function copyApiToFile(sourceFile, targetFile) {
  try {
    const content = await fs.readFile(sourceFile, "utf-8");
    const apiRegex = /export const api = \[[\s\S]*?\];/;
    const match = content.match(apiRegex);

    if (match) {
      await fs.writeFile(targetFile, match[0]);
      console.log(`Successfully copied api to ${targetFile}`);
    } else {
      console.error("Could not find api export in the source file");
    }
  } catch (error) {
    console.error("Error:", error);
  }
}
