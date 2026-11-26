import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // .scratch/ is the local tracker, ignored only by a global gitignore that
    // Vitest does not read; it holds test files from evidence and run outputs.
    exclude: [...configDefaults.exclude, ".scratch/**"],
  },
});
