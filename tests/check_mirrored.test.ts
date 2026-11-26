import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { mirroredDescribes } from "../scripts/check-mirrored.mts";

// The parsing behind scripts/check-mirrored.mts, which compares a test file's
// mirrored describes between two commits (template "Commits", decision 215).
const source = readFileSync(
  new URL("check_mirrored/fixture.ts", import.meta.url),
  "utf8",
);
const original = mirroredDescribes(source);

describe("mirroredDescribes", () => {
  test("finds each describe from its // Mirrors line to its closing });", () => {
    const first = source.slice(
      source.indexOf("// Mirrors pythermalcomfort"),
      source.indexOf("\n\n// Mirrors the position"),
    );
    const choice = source.slice(
      source.indexOf("// Mirrors the position"),
      source.indexOf("\n\n// What upstream's"),
    );

    expect(mirroredDescribes(source)).toEqual(
      new Map([
        ["test_first", first],
        ["test_choice_field", choice],
      ]),
    );
  });

  test("changes with an edit inside a mirrored describe only", () => {
    const inside = mirroredDescribes(source.replace("row %#", "row %d"));
    const outside = mirroredDescribes(
      source
        .replace("const rows", "let rows")
        .replace("expect(rows[0]).toBe(1)", "expect(rows[1]).toBe(2)"),
    );

    expect(inside.get("test_first")).not.toBe(original.get("test_first"));
    expect(outside).toEqual(original);
  });

  test("throws on a // Mirrors comment that leads no describe call", () => {
    expect(() =>
      mirroredDescribes(
        source.replace('describe("test_choice_field"', 'describe.skip("x"'),
      ),
    ).toThrow('the // Mirrors comment on line 22 leads no describe("<title>"');
  });

  test("throws on two mirrored describes with one title", () => {
    expect(() =>
      mirroredDescribes(
        source.replace('describe("test_choice_field"', 'describe("test_first"'),
      ),
    ).toThrow('two mirrored describes are titled "test_first"');
  });

  test("finds none in a file without a // Mirrors line", () => {
    expect(
      mirroredDescribes(source.replaceAll("// Mirrors", "// See")),
    ).toEqual(new Map());
  });
});
