import path from "node:path";
import { loadStepsFile, runAll } from "./builder.js";
import { closeWatchers, rebuild, setupWatcher } from "./vite-react-ts.js";

const main = async (mainFile: string) => {
  const projectDir = ".snaptail";
  const stepsFile = await loadStepsFile(
    "../src/kits/vite-react-hono-base.json",
    {
      $base: "./",
    }
  );
  // Init base Vite-Hono project
  await runAll(stepsFile.steps);

  let watchers = [];
  // const mainFile = "user.tsx";
  // await viteReactTsSetup();
  console.log("trigger build");
  await rebuild(path.join(process.cwd(), mainFile), projectDir);
  watchers.push(setupWatcher(mainFile, projectDir));

  // Cleanup
  process.on("SIGINT", () => {
    closeWatchers(watchers);
    process.exit(0);
  });
};

main("user.tsx");
