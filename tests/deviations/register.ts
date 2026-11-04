import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import ts from "typescript";

// Reads the deviation registers, resolves each row's TS site to its symbol,
// and finds the comments that cite a row, in the format
// docs/deviations/README.md defines (ADR 0019). The cross-check test uses all
// of it. Each row's `parity` is parsed for the parity suite (ADR 0020), which
// exempts what it names.

const REGISTERS = "docs/deviations";

// The directories whose comments may cite a row.
const SITES = ["src", "tests"];

const COLUMNS = [
  "id",
  "part",
  "upstream site",
  "TS site",
  "reason",
  "class/ADR",
  "status",
  "date",
  "parity",
];

const PARTS = [
  "input",
  "output",
  "logic",
  "comment",
  "v2-addition",
  "structure",
] as const;

type Part = (typeof PARTS)[number];

const STATUSES: Readonly<Record<string, Pick<Row, "status" | "doubtful">>> = {
  approved: { status: "approved", doubtful: false },
  pending: { status: "pending", doubtful: false },
  "pending (doubtful)": { status: "pending", doubtful: true },
};

// The Parity list each item's word adds its name to.
const PARITY_LISTS = {
  output: "outputs",
  warning: "warnings",
  throw: "throws",
} as const;

const PARITY_WORDS = Object.keys(PARITY_LISTS).join("|");

// One parity item: output `name`, warning `key` or throw `message`, the name
// in a code span.
const PARITY_ITEM = new RegExp(`^(${PARITY_WORDS}) \`([^\`]+)\`$`);

// A class/ADR cell that names a class or an addition from the README.
const CLASS_ADR = /^(C|addition): (.+) \(ADR (\d{4})\)$/;

// A TS site: the file and the symbol, each in a code span.
const TS_SITE = /^`([^`]+)` `([^`]+)`$/;

// The citation form: "deviation" and the id, in any comment.
const CITATION = /\b[Dd]eviation ([a-z_][a-z0-9_]*-\d+)/g;

/** What the parity suite exempts for one row. */
export interface Parity {
  readonly outputs: readonly string[];
  readonly warnings: readonly string[];
  /** The messages of throws the library adds where upstream returns. */
  readonly throws: readonly string[];
}

/** One register row, with the file and line it is on. */
export interface Row {
  readonly file: string;
  readonly line: number;
  readonly id: string;
  readonly part: Part;
  readonly upstream_site: string;
  readonly ts_file: string;
  readonly ts_symbol: string;
  readonly reason: string;
  readonly class_adr: string;
  readonly status: "approved" | "pending";
  readonly doubtful: boolean;
  readonly date: string;
  readonly parity: Parity;
}

/** A comment that cites a row id. */
export interface Citation {
  readonly file: string;
  readonly line: number;
  readonly id: string;
}

/** The rows read from one or more registers, and what failed to parse. */
export interface Parsed {
  readonly rows: Row[];
  readonly failures: string[];
}

/** The README's classes and additions, each label mapped to its ADR. */
export interface Approved {
  readonly classes: ReadonlyMap<string, string>;
  readonly additions: ReadonlyMap<string, string>;
}

/** Splits a table line into its cells, keeping an escaped pipe in its cell. */
function cells_of(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/(?<!\\)\|$/, "")
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim());
}

function is_table_line(line: string): boolean {
  return line.trim().startsWith("|");
}

function is_date(text: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const date = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(text);
}

function is_part(text: string): text is Part {
  return (PARTS as readonly string[]).includes(text);
}

function parse_parity(text: string): Parity | undefined {
  const parity = { outputs: [], warnings: [], throws: [] } as {
    [K in keyof Parity]: string[];
  };
  if (text === "none") return parity;
  const items = text.split(new RegExp(`, (?=(?:${PARITY_WORDS}) \`)`));
  if (new Set(items).size !== items.length) return undefined;
  for (const item of items) {
    const match = PARITY_ITEM.exec(item);
    if (match === null) return undefined;
    const name = (match[2] ?? "").replaceAll("\\|", "|");
    parity[PARITY_LISTS[match[1] as keyof typeof PARITY_LISTS]].push(name);
  }
  return parity;
}

/** Says what is wrong with a class/ADR cell, or nothing when it is valid. */
function class_adr_failure(
  cell: string,
  approved: Approved,
): string | undefined {
  if (cell === "none" || /^ADR \d{4}$/.test(cell)) return undefined;
  const match = CLASS_ADR.exec(cell);
  if (match === null) {
    return `has class/ADR "${cell}", expected C: <class> (ADR 00xx), addition: <addition> (ADR 00xx), ADR 00xx or none`;
  }
  const [, kind, label = "", adr = ""] = match;
  const [noun, table] =
    kind === "C"
      ? ["class", approved.classes]
      : ["addition", approved.additions];
  const listed = table.get(label);
  if (listed === undefined) {
    return `names the ${noun} "${label}", which the README does not list`;
  }
  if (listed !== adr) {
    return `cites ADR ${adr} for the ${noun} "${label}", which the README gives ADR ${listed}`;
  }
  return undefined;
}

/**
 * Reads the README's class and addition tables: the tables whose first
 * column is headed `Class` and `Addition`, with the ADR in the last column.
 */
export function read_approved(text: string): Approved {
  const lines = text.split("\n");
  const table = (heading: string): Map<string, string> => {
    const map = new Map<string, string>();
    const header = lines.findIndex(
      (line) => is_table_line(line) && cells_of(line)[0] === heading,
    );
    if (header === -1) return map;
    for (const line of lines.slice(header + 2)) {
      if (!is_table_line(line)) break;
      const cells = cells_of(line);
      map.set(cells[0] ?? "", cells.at(-1) ?? "");
    }
    return map;
  };
  return { classes: table("Class"), additions: table("Addition") };
}

/**
 * Parses one register. The register's name is its file name without `.md`,
 * and every row id is that name, a hyphen and a number from 1. A class/ADR
 * cell must name a class or an addition as `approved` lists it.
 */
export function parse_register(
  file: string,
  text: string,
  approved: Approved,
): Parsed {
  const name = basename(file, ".md");
  const lines = text.split("\n");
  const header = lines.findIndex(
    (line, i) =>
      is_table_line(line) &&
      cells_of(line).join("|") === COLUMNS.join("|") &&
      /^[\s|:-]+$/.test(lines[i + 1] ?? ""),
  );
  if (header === -1) {
    return {
      rows: [],
      failures: [`${file}: no table with the columns ${COLUMNS.join(" | ")}`],
    };
  }

  const rows: Row[] = [];
  const failures: string[] = [];
  const seen = new Map<string, number>();
  let end = header + 2;
  while (end < lines.length && is_table_line(lines[end] ?? "")) end++;
  const stray = lines.findIndex((line, i) => i > end && is_table_line(line));
  if (stray !== -1) {
    failures.push(
      `${file}:${stray + 1}: a table line after the register table ends`,
    );
  }
  for (let i = header + 2; i < end; i++) {
    const line = i + 1;
    const cells = cells_of(lines[i] ?? "");
    const [id = "", part = "", upstream_site = "", ts_site = "", reason = ""] =
      cells;
    const [class_adr = "", status = "", date = "", parity = ""] =
      cells.slice(5);
    const at = `${file}:${line}: ${id}`;
    if (cells.length !== COLUMNS.length) {
      failures.push(
        `${at} has ${cells.length} cells, expected ${COLUMNS.length}`,
      );
      continue;
    }
    if (!new RegExp(`^${name}-[1-9]\\d*$`).test(id)) {
      failures.push(`${at} is not an id of the form ${name}-<n>`);
      continue;
    }
    const before = failures.length;
    COLUMNS.forEach((column, c) => {
      if (cells[c] === "") failures.push(`${at} has an empty ${column} cell`);
    });
    if (!is_part(part)) {
      failures.push(
        `${at} has part "${part}", expected one of ${PARTS.join(", ")}`,
      );
    }
    const class_failure = class_adr_failure(class_adr, approved);
    if (class_failure !== undefined) failures.push(`${at} ${class_failure}`);
    const parsed_status = STATUSES[status];
    if (parsed_status === undefined) {
      failures.push(
        `${at} has status "${status}", expected one of ${Object.keys(STATUSES).join(", ")}`,
      );
    }
    if (!is_date(date)) {
      failures.push(`${at} has date "${date}", expected a YYYY-MM-DD date`);
    }
    const site = TS_SITE.exec(ts_site);
    if (ts_site !== "" && site === null) {
      failures.push(
        `${at} has TS site "${ts_site}", expected a file and a symbol, each in a code span`,
      );
    }
    const parsed_parity = parse_parity(parity);
    if (parsed_parity === undefined) {
      failures.push(
        `${at} has parity "${parity}", expected none or distinct items such as output \`name\` or warning \`key\`, separated by ", "`,
      );
    }
    const first = seen.get(id);
    if (first !== undefined) {
      failures.push(`${at} repeats the row at line ${first}`);
      continue;
    }
    seen.set(id, line);
    if (
      failures.length > before ||
      !is_part(part) ||
      site === null ||
      parsed_status === undefined ||
      parsed_parity === undefined
    ) {
      continue;
    }
    rows.push({
      file,
      line,
      id,
      part,
      upstream_site,
      ts_file: site[1] ?? "",
      ts_symbol: site[2] ?? "",
      reason,
      class_adr,
      ...parsed_status,
      date,
      parity: parsed_parity,
    });
  }
  return { rows, failures };
}

/**
 * Finds the row ids that one source file's comments cite. Only comments
 * count, as the TypeScript parser finds them, so a string or a regular
 * expression that holds the form cites nothing.
 */
export function find_citations(file: string, text: string): Citation[] {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  // Every comment is the trailing comment of the token before it, or a
  // leading comment of the token after it; keyed by start, each counts once.
  const comments = new Map<number, string>();
  const visit = (node: ts.Node): void => {
    if (ts.isJSDoc(node)) return;
    for (const range of [
      ...(ts.getLeadingCommentRanges(text, node.pos) ?? []),
      ...(ts.getTrailingCommentRanges(text, node.end) ?? []),
    ]) {
      comments.set(range.pos, text.slice(range.pos, range.end));
    }
    node.getChildren(source).forEach(visit);
  };
  visit(source);

  const citations: Citation[] = [];
  for (const [pos, comment] of [...comments].sort(([a], [b]) => a - b)) {
    for (const match of comment.matchAll(CITATION)) {
      const { line } = source.getLineAndCharacterOfPosition(pos + match.index);
      citations.push({ file, line: line + 1, id: match[1] ?? "" });
    }
  }
  return citations;
}

/**
 * Checks the rows against the citations: every cited id has a row, and no row
 * is pending. A row needs no citation, since its TS site names its symbol.
 */
export function cross_check(
  rows: readonly Row[],
  citations: readonly Citation[],
): string[] {
  const ids = new Set(rows.map((row) => row.id));
  const failures = citations
    .filter((citation) => !ids.has(citation.id))
    .map(
      ({ file, line, id }) => `${file}:${line}: cites ${id}, which has no row`,
    );
  for (const { file, line, id, status, doubtful } of rows) {
    if (status === "pending") {
      failures.push(
        `${file}:${line}: ${id} is pending${doubtful ? " (doubtful)" : ""}`,
      );
    }
  }
  return failures;
}

type Declaration =
  | ts.FunctionDeclaration
  | ts.ClassDeclaration
  | ts.InterfaceDeclaration
  | ts.TypeAliasDeclaration
  | ts.EnumDeclaration
  | ts.VariableDeclaration;

function is_declaration(node: ts.Node): node is Declaration {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isClassDeclaration(node) ||
    ts.isInterfaceDeclaration(node) ||
    ts.isTypeAliasDeclaration(node) ||
    ts.isEnumDeclaration(node) ||
    ts.isVariableDeclaration(node)
  );
}

/** The top-level declaration named `name` in `source`, exported or not. */
function declaration_of(
  source: ts.SourceFile,
  name: string,
): Declaration | undefined {
  return source.statements
    .flatMap((statement): readonly ts.Node[] =>
      ts.isVariableStatement(statement)
        ? statement.declarationList.declarations
        : [statement],
    )
    .filter(is_declaration)
    .find(
      (node) =>
        node.name !== undefined &&
        ts.isIdentifier(node.name) &&
        node.name.text === name,
    );
}

/**
 * Whether `source` declares the dotted `symbol`: a top-level name, then a
 * property of its type at each step, inherited members included. A value's
 * members are its value's (`INFO.inputs.tdb`); a type's are its instances'
 * (`HI.warnings`).
 */
function declares(
  checker: ts.TypeChecker,
  source: ts.SourceFile,
  symbol: string,
): boolean {
  const [head = "", ...members] = symbol.split(".");
  const declaration = declaration_of(source, head);
  if (declaration?.name === undefined) return false;
  let current = checker.getSymbolAtLocation(declaration.name);
  for (const member of members) {
    if (current === undefined) return false;
    const is_value =
      (current.flags & ts.SymbolFlags.Value) !== 0 &&
      (current.flags & ts.SymbolFlags.Class) === 0;
    const type = is_value
      ? checker.getTypeOfSymbol(current)
      : checker.getDeclaredTypeOfSymbol(current);
    current = checker.getPropertyOfType(type, member);
  }
  return current !== undefined;
}

/**
 * Checks that each row's TS site file exists and declares its symbol. The
 * files are compiled together, so a member inherited from another file
 * resolves.
 */
export function check_symbols(root: string, rows: readonly Row[]): string[] {
  const files = [...new Set(rows.map((row) => join(root, row.ts_file)))];
  const program = ts.createProgram(
    files.filter((path) => existsSync(path)),
    {
      noEmit: true,
      allowJs: true,
      allowImportingTsExtensions: true,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      target: ts.ScriptTarget.ES2022,
      skipLibCheck: true,
    },
  );
  const checker = program.getTypeChecker();
  const failures: string[] = [];
  for (const { file, line, id, ts_file, ts_symbol } of rows) {
    const at = `${file}:${line}: ${id} names`;
    const source = program.getSourceFile(join(root, ts_file));
    if (source === undefined) {
      failures.push(`${at} ${ts_file}, which does not exist`);
    } else if (!declares(checker, source, ts_symbol)) {
      failures.push(
        `${at} \`${ts_symbol}\`, which ${ts_file} does not declare`,
      );
    }
  }
  return failures;
}

/** Reads every register under docs/deviations/, the README aside. */
export function read_registers(root: string): Parsed {
  const approved = read_approved(
    readFileSync(join(root, REGISTERS, "README.md"), "utf8"),
  );
  const rows: Row[] = [];
  const failures: string[] = [];
  for (const name of readdirSync(join(root, REGISTERS)).sort()) {
    if (!name.endsWith(".md") || name === "README.md") continue;
    const file = `${REGISTERS}/${name}`;
    const text = readFileSync(join(root, file), "utf8");
    const parsed = parse_register(file, text, approved);
    rows.push(...parsed.rows);
    failures.push(...parsed.failures);
  }
  return { rows, failures };
}

/** Runs the whole cross-check over the repository at `root`. */
export function check_repository(root: string): string[] {
  const { rows, failures } = read_registers(root);
  const citations = SITES.flatMap((dir) =>
    readdirSync(join(root, dir), { recursive: true, encoding: "utf8" })
      .filter((path) => /\.[cm]?[jt]s$/.test(path))
      .sort()
      .flatMap((path) => {
        const file = `${dir}/${path}`;
        return find_citations(file, readFileSync(join(root, file), "utf8"));
      }),
  );
  return [
    ...failures,
    ...cross_check(rows, citations),
    ...check_symbols(root, rows),
  ];
}
