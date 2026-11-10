import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import { describe, expect, test } from "vitest";
import { UNLINTED } from "../eslint.config.mjs";

// Lints tests/eslint/fixture.ts with eslint.config.mjs. The fixture is one of
// the named files lint skips, so `ignore: false` lifts that for this run only.
const cwd = fileURLToPath(new URL("..", import.meta.url));
const FIXTURE = "tests/eslint/fixture.ts";
const fixture_lines = readFileSync(
  new URL(`../${FIXTURE}`, import.meta.url),
  "utf8",
).split("\n");
const [result] = await new ESLint({ cwd, ignore: false }).lintFiles([FIXTURE]);
if (result === undefined)
  throw new Error(`ESLint returned no result for ${FIXTURE}`);
const messages = result.messages;

function lines_of(rule: string): number[] {
  return messages.filter((m) => m.ruleId === rule).map((m) => m.line);
}

function line_of(text: string): number {
  return fixture_lines.findIndex((line) => line.includes(text)) + 1;
}

describe("eslint config", () => {
  test("parses the fixture", () => {
    expect(messages.filter((m) => m.fatal)).toEqual([]);
  });

  test("naming-convention rejects mixed names only", () => {
    const names = messages
      .filter((m) => m.ruleId === "@typescript-eslint/naming-convention")
      .map((m) => /`([^`]+)`/.exec(m.message)?.[1]);
    expect(names.sort()).toEqual(
      [
        "Bad_Constant",
        "Bad_Param",
        "badName_Mixed",
        "bad_Inputs",
        "limit_Inputs",
      ].sort(),
    );
  });

  test("restrict-template-expressions allows a number and nothing else", () => {
    expect(
      lines_of("@typescript-eslint/restrict-template-expressions"),
    ).toEqual([line_of("converged: ${")]);
  });

  test("strictTypeChecked and stylisticTypeChecked are on", () => {
    expect(lines_of("@typescript-eslint/no-non-null-assertion")).toEqual([
      line_of("values[0]!"),
    ]);
    expect(lines_of("@typescript-eslint/array-type")).toEqual([
      line_of("Array<number>"),
    ]);
  });

  test("lint covers src/ and tests/ less the named files", async () => {
    const eslint = new ESLint({ cwd });
    for (const file of [
      "vitest.config.ts",
      "src/index.ts",
      "src/utilities/clothing.ts",
      "tests/index.test.ts",
      "tests/types/consumer-check.ts",
    ])
      expect(await eslint.isPathIgnored(file)).toBe(false);
    for (const file of [
      ...UNLINTED,
      "src/jos3_functions/matrix.js",
      "scripts/check-mirrored.mts",
      ".scratch/",
    ])
      expect(await eslint.isPathIgnored(file)).toBe(true);
  });
});
