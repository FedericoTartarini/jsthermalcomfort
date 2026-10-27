import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  ADAPTIVE_ASHRAE_INFO,
  CLO_TOUT_INFO,
  HEAT_INDEX_ROTHFUSZ_INFO,
  SOLAR_GAIN_INFO,
  UTCI_INFO,
} from "../../src/models/index.ts";
import type { ModelInfo } from "../../src/models/index.ts";

// Nothing else checks the `@returns` list against INFO.outputs (ADR 0023).
describe("the function's @returns list", () => {
  test.each<[string, ModelInfo]>([
    ["src/models/adaptive_ashrae.ts", ADAPTIVE_ASHRAE_INFO],
    ["src/models/clo_tout.ts", CLO_TOUT_INFO],
    ["src/models/heat_index_rothfusz.ts", HEAT_INDEX_ROTHFUSZ_INFO],
    ["src/models/solar_gain.ts", SOLAR_GAIN_INFO],
    ["src/models/utci.ts", UTCI_INFO],
  ])("%s names each INFO.outputs key, in order", (path, info) => {
    const source = readFileSync(
      new URL(`../../${path}`, import.meta.url),
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
  });
});
