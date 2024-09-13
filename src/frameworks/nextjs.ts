import path from "node:path";
import fs from "node:fs/promises";
import { copyFileAndCreateDir } from "../templator.js";
import { copyApiToFile, getAllImportsRawFromFile } from "../legacy/lib.js";
import { cpath, ppath } from "../lib.js";
import { generateNextApiRoutes } from "../legacy/next.js";

export const makeOnFileChangeNextJs = () => {
  return async (changedFile: string) => {
    console.log(`File changed: ${changedFile}`);

    if (changedFile === ".env") {
      await fs.copyFile(cpath(".env"), ppath(".env"));
      return;
    }

    try {
      const fileExt = path.extname(changedFile);

      // Copy the user's file to the project
      await copyFileAndCreateDir(
        changedFile,
        ppath("src", "app", "user", `app${fileExt}`)
      );

      console.log("Updating API routes");

      const imports = await getAllImportsRawFromFile(changedFile);

      await copyApiToFile(changedFile, imports, ppath("user_api.mjs"));

      await generateNextApiRoutes(
        (await import(ppath("user_api.mjs"))).api,
        ppath("src", "pages")
      );

      console.log("Project files updated successfully");
    } catch (error) {
      console.error("Error updating project files:", error);
    }
  };
};
