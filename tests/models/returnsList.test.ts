import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { v2_infos } from "./testUtils.ts";

/**
 * The line that ends each model's `@returns` list: the text of
 * `ModelOutputs.warnings`, since the site hides the outputs type's own list
 * (ADR 0025's 2026-11-18 amendment).
 */
const warnings_line = (() => {
  const source = readFileSync(
    new URL("../../src/_internal/modelInfo.ts", import.meta.url),
    "utf8",
  );
  const text = /\/\*\* (.*) \*\/\n\s*readonly warnings:/.exec(source)?.[1];
  if (text === undefined) throw new Error("ModelOutputs.warnings has no TSDoc");
  return ` * - \`warnings\` - ${text}`;
})();

// Nothing else checks the `@returns` list against INFO.outputs (ADR 0023).
describe("the function's @returns list", () => {
  test.each(v2_infos)(
    "$info.name: its @returns names each INFO.outputs key, in order, then warnings",
    ({ info }) => {
      const source = readFileSync(
        new URL(`../../src/models/${info.name}.ts`, import.meta.url),
        "utf8",
      );
      const block = new RegExp(
        String.raw`/\*\*((?:(?!\*/)[\s\S])*)\*/\s*export function ${info.name}\(`,
      ).exec(source);
      const returns = /@returns[\s\S]*?(?=\n \* @|$)/.exec(block?.[1] ?? "");

      expect(returns).not.toBeNull();
      const names = [...(returns?.[0] ?? "").matchAll(/^ \* - `(\w+)`/gm)].map(
        (match) => match[1],
      );
      expect(names).toEqual([...Object.keys(info.outputs), "warnings"]);
      expect(returns?.[0]).toContain(warnings_line);
    },
  );
});
