import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { v2_infos } from "./testUtils.ts";

// Nothing else checks the `@returns` list against INFO.outputs (ADR 0023).
describe("the function's @returns list", () => {
  test.each(v2_infos)(
    "$info.name: its @returns names each INFO.outputs key, in order",
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
      expect(names).toEqual(Object.keys(info.outputs));
    },
  );
});
