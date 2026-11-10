import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import {
  check_repository,
  check_symbols,
  cross_check,
  find_citations,
  parse_register,
  read_approved,
} from "./deviations/register.ts";

// The register format, the TS site's symbol and the comment form are defined
// in docs/deviations/README.md (ADR 0019).
const root = fileURLToPath(new URL("..", import.meta.url));

// The README's class and addition tables, cut down to one row each.
const APPROVED = read_approved(
  [
    "| Class | What differs from upstream | ADR |",
    "| --- | --- | --- |",
    "| scalars only | A public model takes scalars. | 0022 |",
    "",
    "| Addition | What it adds | ADR |",
    "| --- | --- | --- |",
    "| `Units` | The `Units` constant. | 0019 |",
  ].join("\n"),
);

function parse(file: string, text: string): ReturnType<typeof parse_register> {
  return parse_register(file, text, APPROVED);
}

const PARITY_EXPECTED =
  'expected none or distinct items such as output `name` or warning `key`, separated by ", "';

const NO_TABLE =
  "no table with the columns id | part | upstream site | TS site | reason | class/ADR | status | date | parity";

const HEADER = [
  "| id | part | upstream site | TS site | reason | class/ADR | status | date | parity |",
  "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
];

function register(...rows: string[]): string {
  return ["# utci", "", ...HEADER, ...rows, ""].join("\n");
}

function row(id: string, status = "approved", parity = "none"): string {
  return `| ${id} | input | \`models/utci.py:138\` | \`src/models/utci.ts\` \`utci\` | why | C: scalars only (ADR 0022) | ${status} | 2026-10-27 | ${parity} |`;
}

const FILE = "docs/deviations/utci.md";

describe("parse_register", () => {
  test("reads each row with its line", () => {
    const { rows, failures } = parse(FILE, register(row("utci-1")));
    expect(failures).toEqual([]);
    expect(rows).toEqual([
      {
        file: FILE,
        line: 5,
        id: "utci-1",
        part: "input",
        upstream_site: "`models/utci.py:138`",
        ts_file: "src/models/utci.ts",
        ts_symbol: "utci",
        reason: "why",
        class_adr: "C: scalars only (ADR 0022)",
        status: "approved",
        doubtful: false,
        date: "2026-10-27",
        parity: { outputs: [], warnings: [], throws: [] },
      },
    ]);
  });

  test("reads a table with no rows", () => {
    expect(parse(FILE, register())).toEqual({
      rows: [],
      failures: [],
    });
  });

  test("reads padded cells, as Prettier aligns them", () => {
    const text = [
      "| id     | part  | upstream site | TS site | reason | class/ADR | status   | date       | parity |",
      "| ------ | :---- | ------------- | ------- | ------ | --------- | -------- | ---------- | ------ |",
      "| utci-1 | logic | `a.py:1`      | `b.ts` `b` | r    | none      | approved | 2026-10-27 | none   |",
    ].join("\n");
    const { rows, failures } = parse(FILE, text);
    expect(failures).toEqual([]);
    expect(rows.map((r) => [r.id, r.part, r.line])).toEqual([
      ["utci-1", "logic", 3],
    ]);
  });

  test("keeps an escaped pipe inside its cell", () => {
    const text = register(
      "| utci-1 | output | `a.py:1` | `b.ts` `b` | `boolean \\| number` | none | approved | 2026-10-27 | none |",
    );
    const { rows, failures } = parse(FILE, text);
    expect(failures).toEqual([]);
    expect(rows[0]?.reason).toBe("`boolean \\| number`");
  });

  test("reads pending and doubtful rows", () => {
    const { rows } = parse(
      FILE,
      register(row("utci-1", "pending"), row("utci-2", "pending (doubtful)")),
    );
    expect(rows.map((r) => [r.status, r.doubtful])).toEqual([
      ["pending", false],
      ["pending", true],
    ]);
  });

  test("reads the parity column", () => {
    const { rows, failures } = parse(
      FILE,
      register(
        row("utci-1", "approved", "output `utci`"),
        row(
          "utci-2",
          "approved",
          "warning `tr - tdb`, warning `pa (kPa)`, output `stress_category`",
        ),
        row("utci-3", "approved", "throw `division by zero`, output `utci`"),
      ),
    );
    expect(failures).toEqual([]);
    expect(rows.map((r) => r.parity)).toEqual([
      { outputs: ["utci"], warnings: [], throws: [] },
      {
        outputs: ["stress_category"],
        warnings: ["tr - tdb", "pa (kPa)"],
        throws: [],
      },
      { outputs: ["utci"], warnings: [], throws: ["division by zero"] },
    ]);
  });

  test("fails a file with no register table", () => {
    expect(parse(FILE, "# utci\n\nNo table.\n").failures).toEqual([
      `${FILE}: ${NO_TABLE}`,
    ]);
  });

  test("fails a table whose columns differ", () => {
    const text = [
      "| id | part | status |",
      "| --- | --- | --- |",
      "| utci-1 | input | approved |",
    ].join("\n");
    expect(parse(FILE, text).failures).toEqual([`${FILE}: ${NO_TABLE}`]);
  });

  test("fails a table line after the table ends", () => {
    const text = register(row("utci-1"), "", row("utci-2", "pending"));
    expect(parse(FILE, text).failures).toEqual([
      `${FILE}:7: a table line after the register table ends`,
    ]);
  });

  test("checks the class/ADR cell against the README's tables", () => {
    const text = register(
      row("utci-1").replace(
        "C: scalars only (ADR 0022)",
        "addition: `Units` (ADR 0019)",
      ),
      row("utci-2").replace("C: scalars only (ADR 0022)", "ADR 0024"),
      row("utci-3", "pending").replace("C: scalars only (ADR 0022)", "none"),
      row("utci-4").replace("scalars only (ADR 0022)", "whatever (ADR 0022)"),
      row("utci-5").replace("(ADR 0022)", "(ADR 0021)"),
      row("utci-6").replace("C: scalars only (ADR 0022)", "addition: `Units`"),
    );
    expect(parse(FILE, text).failures).toEqual([
      `${FILE}:8: utci-4 names the class "whatever", which the README does not list`,
      `${FILE}:9: utci-5 cites ADR 0021 for the class "scalars only", which the README gives ADR 0022`,
      `${FILE}:10: utci-6 has class/ADR "addition: \`Units\`", expected C: <class> (ADR 00xx), addition: <addition> (ADR 00xx), ADR 00xx or none`,
    ]);
  });

  test("reads the class and addition tables of the README", () => {
    expect(APPROVED).toEqual({
      classes: new Map([["scalars only", "0022"]]),
      additions: new Map([["`Units`", "0019"]]),
    });
  });

  test("unescapes a pipe in a parity name", () => {
    const { rows } = parse(
      FILE,
      register(row("utci-1", "approved", "warning `a \\| b`")),
    );
    expect(rows[0]?.parity).toEqual({
      outputs: [],
      warnings: ["a | b"],
      throws: [],
    });
  });

  test("fails parity items not separated by a comma and a space, or repeated", () => {
    const text = register(
      row("utci-1", "approved", "output `a`,warning `b`"),
      row("utci-2", "approved", "output `a`, output `a`"),
    );
    expect(parse(FILE, text).failures).toEqual([
      `${FILE}:5: utci-1 has parity "output \`a\`,warning \`b\`", ${PARITY_EXPECTED}`,
      `${FILE}:6: utci-2 has parity "output \`a\`, output \`a\`", ${PARITY_EXPECTED}`,
    ]);
  });

  test("fails each malformed row with its file, line and id", () => {
    const text = register(
      "| utci-1 | input | a | b | r | none | approved | 2026-10-27 |",
      row("pmv-1"),
      row("utci-01"),
      row("utci-2").replace("| input |", "| inputs |"),
      row("utci-3", "Approved"),
      row("utci-4").replace("2026-10-27", "2026-13-01"),
      row("utci-5", "approved", "output utci"),
      row("utci-6").replace("| why |", "|  |"),
      row("utci-7"),
      row("utci-7"),
      row("utci-8").replace(
        "`src/models/utci.ts` `utci`",
        "`src/models/utci.ts`",
      ),
    );
    expect(parse(FILE, text).failures).toEqual([
      `${FILE}:5: utci-1 has 8 cells, expected 9`,
      `${FILE}:6: pmv-1 is not an id of the form utci-<n>`,
      `${FILE}:7: utci-01 is not an id of the form utci-<n>`,
      `${FILE}:8: utci-2 has part "inputs", expected one of input, output, logic, comment, v2-addition, structure`,
      `${FILE}:9: utci-3 has status "Approved", expected one of approved, pending, pending (doubtful)`,
      `${FILE}:10: utci-4 has date "2026-13-01", expected a YYYY-MM-DD date`,
      `${FILE}:11: utci-5 has parity "output utci", ${PARITY_EXPECTED}`,
      `${FILE}:12: utci-6 has an empty reason cell`,
      `${FILE}:14: utci-7 repeats the row at line 13`,
      `${FILE}:15: utci-8 has TS site "\`src/models/utci.ts\`", expected a file and a symbol, each in a code span`,
    ]);
  });

  test("takes the register name from the file name", () => {
    const text = register(row("_shared-1"));
    expect(parse("docs/deviations/_shared.md", text).failures).toEqual([]);
  });
});

describe("find_citations", () => {
  test("finds ids in line, block and TSDoc comments", () => {
    const text = [
      "/**",
      " * Range rows with the gate off (deviation utci-2).",
      " */",
      "export function utci(): number {",
      "  // deviation utci-1, deviation _shared-3",
      "  return 1; /* Deviation utci-4 */",
      "}",
      "// deviation utci-5",
    ].join("\n");
    expect(find_citations("src/models/utci.ts", text)).toEqual([
      { file: "src/models/utci.ts", line: 2, id: "utci-2" },
      { file: "src/models/utci.ts", line: 5, id: "utci-1" },
      { file: "src/models/utci.ts", line: 5, id: "_shared-3" },
      { file: "src/models/utci.ts", line: 6, id: "utci-4" },
      { file: "src/models/utci.ts", line: 8, id: "utci-5" },
    ]);
  });

  test("ignores the form outside comments", () => {
    const text = [
      'const a = "deviation utci-1";',
      "const b = `deviation utci-2 ${a} // deviation utci-3`;",
      "const c = /deviation utci-4/;",
      "// a deviation may add an export, upstream #484",
    ].join("\n");
    expect(find_citations("src/a.ts", text)).toEqual([]);
  });

  test("reads JavaScript files", () => {
    expect(find_citations("src/a.js", "// deviation utci-1\n")).toEqual([
      { file: "src/a.js", line: 1, id: "utci-1" },
    ]);
  });
});

describe("cross_check", () => {
  const rows = parse(
    FILE,
    register(
      row("utci-1"),
      row("utci-2"),
      row("utci-3", "pending"),
      row("utci-4", "pending (doubtful)"),
    ),
  ).rows;

  test("passes approved rows, cited or not", () => {
    const cited = find_citations("src/models/utci.ts", "// deviation utci-1\n");
    expect(cross_check(rows.slice(0, 2), cited)).toEqual([]);
  });

  test("fails a citation with no row and a pending row", () => {
    const cited = find_citations(
      "src/models/utci.ts",
      [
        "// deviation utci-1",
        "// deviation utci-1",
        "// deviation utci-3",
        "// deviation utci-4",
        "// deviation utci-9",
      ].join("\n"),
    );
    expect(cross_check(rows, cited)).toEqual([
      "src/models/utci.ts:5: cites utci-9, which has no row",
      `${FILE}:7: utci-3 is pending`,
      `${FILE}:8: utci-4 is pending (doubtful)`,
    ]);
  });
});

describe("check_symbols", () => {
  const SITE = "tests/deviations/fixture.ts";
  const sited = (...sites: [string, string][]) =>
    parse(
      FILE,
      register(
        ...sites.map(([file, symbol], i) =>
          row(`utci-${i + 1}`).replace(
            "`src/models/utci.ts` `utci`",
            `\`${file}\` \`${symbol}\``,
          ),
        ),
      ),
    ).rows;

  test("finds declarations, members, inherited members and locals", () => {
    const rows = sited(
      [SITE, "Result"],
      [SITE, "Result.own"],
      [SITE, "Result.inherited"],
      [SITE, "INFO.inputs.tdb.unit"],
      [SITE, "Params.tdb"],
      [SITE, "model"],
      [SITE, "_kernel"],
      [SITE, "Base"],
    );
    expect(rows).toHaveLength(8);
    expect(check_symbols(root, rows)).toEqual([]);
  });

  test("fails a symbol or a member the file does not declare", () => {
    const rows = sited(
      [SITE, "Missing"],
      [SITE, "Result.missing"],
      [SITE, "INFO.inputs.rh"],
      [SITE, "model.params"],
    );
    expect(check_symbols(root, rows)).toEqual([
      `${FILE}:5: utci-1 names \`Missing\`, which ${SITE} does not declare`,
      `${FILE}:6: utci-2 names \`Result.missing\`, which ${SITE} does not declare`,
      `${FILE}:7: utci-3 names \`INFO.inputs.rh\`, which ${SITE} does not declare`,
      `${FILE}:8: utci-4 names \`model.params\`, which ${SITE} does not declare`,
    ]);
  });

  test("fails a file that does not exist", () => {
    const rows = sited(["src/models/missing.ts", "missing"]);
    expect(check_symbols(root, rows)).toEqual([
      `${FILE}:5: utci-1 names src/models/missing.ts, which does not exist`,
    ]);
  });
});

describe("the repository", () => {
  test("the README lists the classes and additions", () => {
    const { classes, additions } = read_approved(
      readFileSync(`${root}docs/deviations/README.md`, "utf8"),
    );
    expect([classes.size, additions.size]).toEqual([11, 7]);
    expect(classes.get("loop cap")).toBe("0015");
    expect(additions.get("gate-off rows")).toBe("0024");
  });

  test("every register agrees with the code", () => {
    expect(check_repository(root)).toEqual([]);
  });
});
