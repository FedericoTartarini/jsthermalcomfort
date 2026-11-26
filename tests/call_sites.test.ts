import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, test } from "vitest";

// The counterpart of upstream's tests/test_call_site_arguments.py (#441), on
// the repository's files (seam S3). Swapping two same-typed arguments, such
// as tdb and tr, still runs and returns a plausible number, so the check
// reads the call sites with the TypeScript compiler instead.
const root = fileURLToPath(new URL("..", import.meta.url));
const FIXTURE = "tests/call_sites/fixture.ts";

// Parameter names used interchangeably for the same quantity, as upstream's
// _ALIASES.
const ALIASES = [new Set(["v", "vr"])];

/** The variable an argument is built from, `tdb` for `-tdb` or `tdb[i]`. */
function base_name(node: ts.Expression): string | undefined {
  let expr: ts.Expression = node;
  for (;;) {
    if (ts.isElementAccessExpression(expr)) expr = expr.expression;
    else if (ts.isPrefixUnaryExpression(expr)) expr = expr.operand;
    else if (ts.isBinaryExpression(expr)) expr = expr.left;
    else if (
      ts.isParenthesizedExpression(expr) ||
      ts.isNonNullExpression(expr) ||
      ts.isAsExpression(expr) ||
      ts.isSatisfiesExpression(expr)
    )
      expr = expr.expression;
    else break;
  }
  if (ts.isIdentifier(expr)) return expr.text.replace(/^_+/, "");
  if (ts.isPropertyAccessExpression(expr))
    return expr.name.text.replace(/^_+/, "");
  return undefined;
}

function is_transposed(
  arg_name: string | undefined,
  param: string,
  params: readonly string[],
): boolean {
  if (arg_name === undefined || arg_name === param) return false;
  if (ALIASES.some((alias) => alias.has(arg_name) && alias.has(param)))
    return false;
  return params.includes(arg_name);
}

/** The function a call resolves to, if it is declared in one of `sources`. */
function callee(
  checker: ts.TypeChecker,
  call: ts.CallExpression,
  sources: ReadonlySet<string>,
): ts.FunctionDeclaration | undefined {
  const target = ts.isPropertyAccessExpression(call.expression)
    ? call.expression.name
    : call.expression;
  let symbol = checker.getSymbolAtLocation(target);
  if (symbol === undefined) return undefined;
  if (symbol.flags & ts.SymbolFlags.Alias)
    symbol = checker.getAliasedSymbol(symbol);
  return symbol.declarations?.find(
    (declaration): declaration is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(declaration) &&
      sources.has(declaration.getSourceFile().fileName),
  );
}

/**
 * Every argument in `files` named like a different parameter of the function
 * it is passed to: positionally, or as a property of an inputs object passed
 * to a model. Upstream's test binds keyword arguments the same way
 * (`tests/test_call_site_arguments.py:147`).
 */
function transposed_arguments(
  program: ts.Program,
  files: readonly string[],
): string[] {
  const checker = program.getTypeChecker();
  const sources = new Set(
    program
      .getSourceFiles()
      .filter((file) => !file.isDeclarationFile)
      .map((file) => file.fileName),
  );
  const problems: string[] = [];
  for (const file of files) {
    const source = program.getSourceFile(join(root, file));
    if (source === undefined) throw new Error(`${file} is not in the program`);
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node)) {
        const declaration = callee(checker, node, sources);
        if (declaration !== undefined) check(source, node, declaration);
      }
      ts.forEachChild(node, visit);
    };
    const check = (
      source: ts.SourceFile,
      call: ts.CallExpression,
      declaration: ts.FunctionDeclaration,
    ): void => {
      const line =
        source.getLineAndCharacterOfPosition(call.getStart()).line + 1;
      const report = (arg: ts.Expression, param: string, name: string) =>
        problems.push(
          `${file}:${line}: '${arg.getText()}' is passed as '${param}', but '${name}' is also a parameter`,
        );
      const params = declaration.parameters.flatMap((p) =>
        ts.isIdentifier(p.name) ? [p.name.text.replace(/^_+/, "")] : [],
      );
      call.arguments.forEach((arg, i) => {
        const parameter = declaration.parameters[i];
        if (parameter === undefined) return;
        if (ts.isObjectLiteralExpression(arg)) {
          const keys = checker
            .getTypeAtLocation(parameter)
            .getProperties()
            .map((property) => property.name);
          for (const property of arg.properties) {
            if (!ts.isPropertyAssignment(property)) continue;
            const key = property.name.getText().replace(/^["']|["']$/g, "");
            const name = base_name(property.initializer);
            if (is_transposed(name, key, keys))
              report(property.initializer, key, name ?? "");
          }
          return;
        }
        if (!ts.isIdentifier(parameter.name)) return;
        const param = parameter.name.text.replace(/^_+/, "");
        const name = base_name(arg);
        if (is_transposed(name, param, params)) report(arg, param, name ?? "");
      });
    };
    visit(source);
  }
  return problems;
}

function program_of(files: readonly string[]): ts.Program {
  const config = ts.getParsedCommandLineOfConfigFile(
    join(root, "configs/tsconfig.json"),
    {},
    { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => undefined },
  );
  if (config === undefined) throw new Error("configs/tsconfig.json not read");
  return ts.createProgram({
    rootNames: [...config.fileNames, ...files.map((file) => join(root, file))],
    options: config.options,
  });
}

// The TypeScript files in src/, less the port of scipy's fsolve: upstream's
// test reads pythermalcomfort's own files (PACKAGE_DIR,
// tests/test_call_site_arguments.py:16, :35), and MINPACK passes one array or
// dimension for two parameters by design (qrfac(n, n, …)).
const MIGRATED = ts.sys
  .readDirectory(join(root, "src"), [".ts"])
  .map((file) => relative(root, file))
  .filter((file) => file !== "src/_internal/fsolve.ts");

describe("test_call_site_arguments", () => {
  test("test_no_transposed_arguments", () => {
    expect(MIGRATED.length).toBeGreaterThan(0);
    expect(transposed_arguments(program_of(MIGRATED), MIGRATED)).toEqual([]);
  });

  test.todo(
    "test_package_calls_use_keyword_arguments: no counterpart, as models take an inputs object and helpers are positional (ADR 0022)",
  );
});

describe("the call-site check (JS-only)", () => {
  test("reports the fixture's transposed arguments, and only those", () => {
    const problems = transposed_arguments(program_of([FIXTURE]), [FIXTURE]);
    expect(problems).toEqual([
      `${FIXTURE}:20: 'tr' is passed as 'tdb', but 'tr' is also a parameter`,
      `${FIXTURE}:20: 'tdb' is passed as 'tr', but 'tdb' is also a parameter`,
      `${FIXTURE}:22: '-tdb' is passed as 'tr', but 'tdb' is also a parameter`,
      `${FIXTURE}:23: 'tdb + 1' is passed as 'tr', but 'tdb' is also a parameter`,
      `${FIXTURE}:25: 'tr' is passed as 'tdb', but 'tr' is also a parameter`,
      `${FIXTURE}:25: 'tdb' is passed as 'tr', but 'tdb' is also a parameter`,
    ]);
  });
});
