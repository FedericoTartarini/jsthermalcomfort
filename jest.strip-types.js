// Jest transform for .ts sources: Node's built-in type stripping, no extra deps.
import { stripTypeScriptTypes } from "node:module";

export default {
  process(src) {
    return { code: stripTypeScriptTypes(src) };
  },
};
