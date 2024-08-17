import fs from "fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

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
