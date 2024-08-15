import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";

const path = fileURLToPath(import.meta.url);
const root = resolve(dirname(path), ".");

const plugins = [react()];

export default {
  root,
  plugins,
};
