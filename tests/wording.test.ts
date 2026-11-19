import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

/**
 * The left column of ADR 0025's rewriting table (2026-11-18 amendment) and
 * the reStructuredText markup it replaces. A pattern matches the TSDoc text,
 * so a code comment that stays upstream's is not read. A rule with
 * `directories` reads only those directories.
 */
const FORBIDDEN: readonly {
  readonly rule: string;
  readonly pattern: RegExp;
  readonly directories?: readonly string[];
}[] = [
  { rule: '"dataclass" becomes "object"', pattern: /\bdataclass(?:es)?\b/gi },
  { rule: '"attribute" becomes "property"', pattern: /\battributes?\b/gi },
  // "for instance" is another sense of the word.
  {
    rule: '"instance" becomes "object"',
    pattern: /(?<!\bfor )\binstances?\b/gi,
  },
  {
    rule: "`True` and `False` become `true` and `false`",
    pattern: /\b(?:True|False)\b/g,
  },
  // A helper's real `NaN` differs in case, and stays.
  { rule: '"nan" becomes `null`', pattern: /\bnan\b/g },
  // No model output is NaN (ADR 0023, 2026-11-03 amendment), so each real
  // NaN in a model's TSDoc, of an input or a private function, is in ALLOWED.
  {
    rule: "a model output's NaN becomes `null`; a real NaN is in ALLOWED",
    pattern: /\bNaN\b/g,
    directories: ["models"],
  },
  {
    rule: "`None` becomes `null` or `undefined`",
    pattern: /\bNone\b/g,
  },
  // Only the sense of raising an error: "raises the temperature" stays.
  {
    rule: '"raises" an error becomes "throws"',
    pattern: /\braise[sd]?\s+(?:an?\s+)?`{0,2}\w*(?:error|exception)\b/gi,
  },
  // A JavaScript class is a type name, and stays.
  {
    rule: "a Python error class becomes the JavaScript class",
    pattern:
      /\b(?!(?:Error|TypeError|RangeError|SyntaxError|ReferenceError|EvalError|URIError|AggregateError)\b)\w+Error\b/g,
  },
  { rule: "`:sub:` becomes `<sub>`", pattern: /:sub:/g },
  // Upstream's subscripted insulation symbols, such as (I :sub:`cl,r`),
  // written with an underscore in place of `<sub>`.
  { rule: "`:sub:` becomes `<sub>`, not an underscore", pattern: /\bI_\w/g },
  { rule: "`:math:` becomes a code span", pattern: /:math:/g },
  { rule: "`.. math::` becomes a code span", pattern: /\.\. math::/g },
];

/**
 * Text a pattern matches that the table does not rewrite, each with its
 * reason. A match inside one of these texts, in its file, is not flagged.
 */
const ALLOWED: readonly {
  readonly file: string;
  readonly text: string;
  readonly reason: string;
}[] = [
  {
    file: "models/two_nodes_gagge.ts",
    text: "Defaults to False, which computes it from `v` and `clo`. False and 0\n * both mean the value is computed; True and NaN are rejected.",
    reason:
      "the table would give `false`, which the library rejects (deviation two_nodes_gagge-3), so upstream's words stay",
  },
  {
    file: "models/sports_heat_stress_risk.ts",
    text: "a `_SportsValues` instance",
    reason: "`_SportsValues` is a JavaScript class",
  },
  {
    file: "models/sports_heat_stress_risk.ts",
    text: "a valid _SportsValues instance",
    reason: "`_SportsValues` is a JavaScript class",
  },
  {
    file: "models/sports_heat_stress_risk.ts",
    text: "not instance fields",
    reason:
      "the fields of an instance, contrasted with class-level constants: another sense than the returned object",
  },
  {
    file: "models/sports_heat_stress_risk.ts",
    text: "a frozen dataclass decorator",
    reason: "Python's decorator, which the table does not rewrite",
  },
  {
    file: "models/ridge_regression_predict_t_re_t_sk.ts",
    text: "the enum instance",
    reason:
      "Python's enum member, which the table does not rewrite: `Sex.male` is a string here",
  },
  {
    file: "models/sports_heat_stress_risk.ts",
    text: "due to NaN thresholds",
    reason: "a real NaN of the private solver",
  },
  {
    file: "models/solar_gain.ts",
    text: "Returns NaN",
    reason: "a real NaN of the private `_projected_area_factor`",
  },
  {
    file: "models/ridge_regression_predict_t_re_t_sk.ts",
    text: "out-of-range values set to NaN",
    reason: "a real NaN of the private `_check_ridge_regression_compliance`",
  },
];

/**
 * Each forbidden match in the TSDoc of `source`, the text of `file` (a path
 * under `src/`), as `line: text (rule)`.
 */
function forbidden_matches(source: string, file: string): string[] {
  const directory = file.slice(0, file.indexOf("/"));
  const allowed: (readonly [number, number])[] = [];
  for (const { text } of ALLOWED.filter((entry) => entry.file === file)) {
    for (
      let start = source.indexOf(text);
      start !== -1;
      start = source.indexOf(text, start + 1)
    ) {
      allowed.push([start, start + text.length]);
    }
  }
  const found: string[] = [];
  for (const block of source.matchAll(/\/\*\*[\s\S]*?\*\//g)) {
    for (const { rule, pattern, directories } of FORBIDDEN) {
      if (directories !== undefined && !directories.includes(directory)) {
        continue;
      }
      for (const match of block[0].matchAll(pattern)) {
        const offset = block.index + match.index;
        if (allowed.some(([start, end]) => offset >= start && offset < end)) {
          continue;
        }
        const line = source.slice(0, offset).split("\n").length;
        found.push(`${line}: ${match[0]} (${rule})`);
      }
    }
  }
  return found.sort((a, b) => Number.parseInt(a) - Number.parseInt(b));
}

// The five public directories; JOS3's files are JavaScript and not read.
const DIRECTORIES = [
  "models",
  "environment",
  "clothing",
  "psychrometrics",
  "utilities",
];

/** The text of `file`, a path under `src/`. */
function read_source(file: string): string {
  return readFileSync(new URL(`../src/${file}`, import.meta.url), "utf8");
}

const files = DIRECTORIES.flatMap((directory) =>
  readdirSync(new URL(`../src/${directory}/`, import.meta.url))
    .filter((name) => name.endsWith(".ts"))
    .map((name) => `${directory}/${name}`),
);

describe("the wording patterns", () => {
  test.each([
    "A dataclass containing the Heat Index.",
    "use the `hi` attribute of the returned `HI` instance",
    "If True, rounds output value. If False, it does not.",
    "the function returns nan.",
    "Defaults to None.",
    "any other value raises a ``ValueError``.",
    "Python raises ZeroDivisionError here",
    "(`I`:sub:`T`)",
    "insulation (I_cl,r)",
    "the wind speed at height :math:`h`",
    ".. math::",
  ])("flag %j", (text) => {
    expect(forbidden_matches(`/** ${text} */`, "environment/x.ts")).not.toEqual(
      [],
    );
  });

  test.each([
    "returns `NaN` when the input is `NaN`.",
    "for instance, a seated person.",
    "use the `hi` property of the returned `HI` object",
    "@throws `TypeError` If the input is not a number.",
    "@throws `RangeError` If the value is negative.",
    "If `true`, rounds output value; returns `null`.",
    "Activity raises the skin temperature.",
    "<sub>T</sub> and `v(h)`",
  ])("pass %j", (text) => {
    expect(forbidden_matches(`/** ${text} */`, "environment/x.ts")).toEqual([]);
  });

  test("flag NaN in a model only", () => {
    for (const text of ["returns NaN.", "returns `NaN`."]) {
      const source = `/** the function ${text} */`;
      expect(forbidden_matches(source, "models/x.ts")).not.toEqual([]);
      expect(forbidden_matches(source, "environment/x.ts")).toEqual([]);
    }
  });

  test("pass a model's real NaN where it is allowed", () => {
    expect(
      forbidden_matches("/** Returns NaN if … */", "models/solar_gain.ts"),
    ).toEqual([]);
  });

  test("pass an allowed text in its file only", () => {
    const source = "/** Use it to obtain a `_SportsValues` instance. */";
    expect(
      forbidden_matches(source, "models/sports_heat_stress_risk.ts"),
    ).toEqual([]);
    expect(forbidden_matches(source, "models/x.ts")).not.toEqual([]);
  });

  test("read TSDoc only", () => {
    expect(
      forbidden_matches("// Return a dataclass instance", "environment/x.ts"),
    ).toEqual([]);
  });
});

describe("the TSDoc of the public directories", () => {
  test.each(files)("%s: has no Python wording or reStructuredText", (file) => {
    expect(forbidden_matches(read_source(file), file)).toEqual([]);
  });

  test.each(ALLOWED)("$file: holds $text", ({ file, text }) => {
    expect(read_source(file)).toContain(text);
  });
});
