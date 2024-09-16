import fs from "fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { transform } from "detype";

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);

/**
 * @param  {...string} path
 */
export const fromHere = (...paths) => {
  return path.join(/*__dirname,*/ ...paths);
};

export const runAsync = (command, args, spawnArgs = undefined) => {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, spawnArgs);
    child.on("close", resolve);
  });
};

/**
 * @param {string} sourceFile
 * @param {string} imports raw javascript import statements
 * @param {string} targetFile
 */
export async function copyApiToFile(sourceFile, imports, targetFile) {
  try {
    const content = await fs.readFile(sourceFile, "utf-8");

    const apiRegex = /export const api = \[[\s\S]*?\];?/;
    const match = content.match(apiRegex);

    if (match) {
      const toWrite = [imports, "", match[0]].join("\n");
      const transformedCode = await transform(toWrite, sourceFile);

      await fs.writeFile(targetFile, transformedCode, {
        encoding: "utf8",
        flag: "w",
      });

      console.log(`Successfully copied api to ${targetFile}`);
    } else {
      await fs.writeFile(targetFile, `export const api = [];`);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

/**
 * @param {string} filePath
 * @returns {Promise<string>}
 */
export const getAllImportsRawFromFile = async (filePath) => {
  const content = await fs.readFile(filePath, "utf-8");
  const importRegex =
    /import\s+(?:type\s+)?(?:(?:\w+(?:\s*,\s*\{\s*[\w\s,]+\})?|\{\s*[\w\s,]+\})|\*\s+as\s+\w+)\s+from\s+['"]([^'"]+)['"]/g;
  const matches = [...content.matchAll(importRegex)];

  return matches.map((match) => match[0]).join(";\n");
};

/**
 * Check what dependencies are needed from the user's single react file
 * Parse the user's single react file and get the dependencies
 * @param {string} filePath js source file path
 * @returns {Promise<string[]>}
 */
export const getDependencies = async (filePath) => {
  const content = await fs.readFile(filePath, "utf-8");
  const importRegex =
    /import\s+(?:(?:\w+(?:\s*,\s*\{\s*[\w\s,]+\})?|\{\s*[\w\s,]+\})|\*\s+as\s+\w+)\s+from\s+['"]([^'"]+)['"]/g;
  const matches = [...content.matchAll(importRegex)];
  const dependencies = new Set(matches.map((match) => match[1]));
  return Array.from(dependencies).filter(
    (dep) => !dep.startsWith(".") && !dep.startsWith("@")
  );
};
