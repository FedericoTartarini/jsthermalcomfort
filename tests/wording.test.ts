import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

/**
 * The left column of ADR 0025's rewriting table (2026-11-18 amendment) and
 * the reStructuredText markup it replaces. A pattern matches the TSDoc text,
 * so a code comment that stays upstream's is not read.
 */
const FORBIDDEN: readonly {
  readonly rule: string;
  readonly pattern: RegExp;
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
  { rule: "`:math:` becomes a code span", pattern: /:math:/g },
  { rule: "`.. math::` becomes a code span", pattern: /\.\. math::/g },
];

/** Each forbidden match in the TSDoc of `source`, as `line: text (rule)`. */
function forbidden_matches(source: string): string[] {
  const found: string[] = [];
  for (const block of source.matchAll(/\/\*\*[\s\S]*?\*\//g)) {
    for (const { rule, pattern } of FORBIDDEN) {
      for (const match of block[0].matchAll(pattern)) {
        const offset = block.index + match.index;
        const line = source.slice(0, offset).split("\n").length;
        found.push(`${line}: ${match[0]} (${rule})`);
      }
    }
  }
  return found.sort((a, b) => Number.parseInt(a) - Number.parseInt(b));
}

// The helper namespaces; src/models/ is not scanned yet.
const DIRECTORIES = ["environment", "clothing", "psychrometrics", "utilities"];

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
    "the wind speed at height :math:`h`",
    ".. math::",
  ])("flag %j", (text) => {
    expect(forbidden_matches(`/** ${text} */`)).not.toEqual([]);
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
    expect(forbidden_matches(`/** ${text} */`)).toEqual([]);
  });

  test("read TSDoc only", () => {
    expect(forbidden_matches("// Return a dataclass instance")).toEqual([]);
  });
});

describe("the TSDoc of the helper namespaces", () => {
  test.each(files)("%s: has no Python wording or reStructuredText", (file) => {
    const source = readFileSync(
      new URL(`../src/${file}`, import.meta.url),
      "utf8",
    );
    expect(forbidden_matches(source)).toEqual([]);
  });
});
