// $cwd - where script is executed
// $home - user's home dir
// $project - project's dir
// $dirname - __dirname
/**
 * Notes:
 * - you can import script that defines __dirname and __filename and it will always resolve to that script's location
 */
import os from "node:os";
import url from "node:url";
import path from "node:path";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
const __filename = url.fileURLToPath(import.meta.url);

const $cwd = process.cwd();
const $home = os.homedir();
const $dirname = __dirname;
const $filename = __filename;

const commonVariables = {
  $cwd,
  $home,
  $dirname,
  $filename,
};

export const VAR_REGEX = /(\$[a-zA-Z]+)/g;

const resolveVariable = (
  variable: string,
  commonVariables: Record<string, string>
) => {
  if (variable in commonVariables) {
    return commonVariables[variable];
  }
  throw new Error(`Variable ${variable} not found`);
};

export const resolvePath = (p: string, variables: Record<string, string>) => {
  const finalPath = path.join(
    ...p
      .split(path.sep)
      .map((pth) => pth.replace(VAR_REGEX, (_, v) => variables[v] || _))
  );

  return finalPath;
};

/**
 * Parses user-defined variables that may reference common variables.
 * @param userVariables User-defined variables in format { "$variable": "value" }
 * @param injectedVariables Variables that are injected into the template by the builder
 * @returns Common variables merged with user-defined variables
 */
export const parseVariables = (
  userVariables: Record<string, string>,
  injectedVariables: Record<string, string> = {}
): Record<string, string> => {
  const resolvedVariables: Record<string, string> = {};
  for (const [key, value] of Object.entries(userVariables)) {
    resolvedVariables[key] = value.replace(VAR_REGEX, (match) =>
      resolveVariable(match, { ...commonVariables, ...injectedVariables })
    );
  }

  return { ...commonVariables, ...resolvedVariables, ...injectedVariables };
};
