import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, test } from "vitest";

// JS-only: upstream is Python and has no bundler. `package.json` declares
// `"sideEffects": false`, so a bundler leaves out a module whose exports are
// unused without running it. That is true only while a module does nothing at
// import but declare, which these checks read from every file under `src/`
// with the TypeScript compiler. They do not follow a call in a top-level
// initialiser into the function it calls.
const root = fileURLToPath(new URL("..", import.meta.url));

const sources = readdirSync(join(root, "src"), {
  recursive: true,
  encoding: "utf8",
})
  .filter((name) => /\.(ts|js)$/.test(name))
  .map((name) => join("src", name));

/**
 * The top-level statements of `text` that are not a declaration, an export or
 * an import that binds a name, each as `file:line: first line of the statement`.
 */
function import_time_statements(file: string, text: string): string[] {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const found: string[] = [];
  for (const statement of source.statements) {
    if (
      (ts.isImportDeclaration(statement) &&
        statement.importClause !== undefined) ||
      ts.isExportDeclaration(statement) ||
      ts.isExportAssignment(statement) ||
      ts.isFunctionDeclaration(statement) ||
      ts.isClassDeclaration(statement) ||
      ts.isVariableStatement(statement) ||
      ts.isTypeAliasDeclaration(statement) ||
      ts.isInterfaceDeclaration(statement)
    )
      continue;
    const { line } = source.getLineAndCharacterOfPosition(
      statement.getStart(source),
    );
    const first_line = statement.getText(source).split("\n", 1).join("");
    found.push(`${file}:${String(line + 1)}: ${first_line}`);
  }
  return found;
}

describe("sideEffects (JS-only)", () => {
  test("package.json declares the package free of side effects", () => {
    const manifest = JSON.parse(
      readFileSync(join(root, "package.json"), "utf8"),
    ) as { sideEffects?: unknown };
    expect(manifest.sideEffects).toBe(false);
  });

  test("no file under src/ does anything at import but declare", () => {
    expect(sources).toContain(join("src", "index.ts"));
    expect(
      sources.flatMap((file) =>
        import_time_statements(file, readFileSync(join(root, file), "utf8")),
      ),
    ).toEqual([]);
  });

  test("the check reports a bare import, an assignment and a call, and only those", () => {
    const text = [
      'import "./polyfill.js";',
      'import { a } from "./a.js";',
      "export const b = a();",
      "export function c() {}",
      "globalThis.d = 1;",
      "c();",
      "export type E = number;",
    ].join("\n");
    expect(import_time_statements("fixture.ts", text)).toEqual([
      'fixture.ts:1: import "./polyfill.js";',
      "fixture.ts:5: globalThis.d = 1;",
      "fixture.ts:6: c();",
    ]);
  });
});
