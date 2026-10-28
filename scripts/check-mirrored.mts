import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";

const MIRRORS = /^\/\/ Mirrors\b.*\bpythermalcomfort/;

/**
 * Each top-level `describe` led by a `// Mirrors … pythermalcomfort` comment,
 * keyed by its title, as the text from that comment to its closing `});`.
 *
 * @throws Error when such a comment leads anything but a
 * `describe("<title>", …)` call, or two of them lead one title.
 */
export function mirroredDescribes(source: string): Map<string, string> {
  const file = ts.createSourceFile("test.ts", source, ts.ScriptTarget.Latest);
  const found = new Map<string, string>();
  for (const statement of file.statements) {
    const mirrors = ts
      .getLeadingCommentRanges(source, statement.pos)
      ?.find(({ pos, end }) => MIRRORS.test(source.slice(pos, end)));
    if (mirrors === undefined) continue;
    const call = ts.isExpressionStatement(statement)
      ? statement.expression
      : undefined;
    const title =
      call !== undefined &&
      ts.isCallExpression(call) &&
      ts.isIdentifier(call.expression) &&
      call.expression.text === "describe"
        ? call.arguments[0]
        : undefined;
    if (title === undefined || !ts.isStringLiteral(title)) {
      const line = file.getLineAndCharacterOfPosition(mirrors.pos).line + 1;
      throw new Error(
        `the // Mirrors comment on line ${String(line)} leads no describe("<title>", …) call`,
      );
    }
    if (found.has(title.text))
      throw new Error(`two mirrored describes are titled "${title.text}"`);
    found.set(title.text, source.slice(mirrors.pos, statement.end));
  }
  return found;
}

function show(commit: string, path: string): string {
  const shown = spawnSync("git", ["show", `${commit}:${path}`], {
    encoding: "utf8",
  });
  if (shown.status !== 0) throw new Error(shown.stderr.trim());
  return shown.stdout;
}

/**
 * Checks the template's "Tests unchanged" rule: every mirrored `describe` of
 * the test file at `path` is byte-identical between commits `base` and `head`
 * (decision 215). Run as
 * `node scripts/check-mirrored.mts <base> <head> <test file>`, the script
 * exits with the status returned, or 2 when this throws.
 *
 * @returns 0 when every mirrored `describe` is identical, 1 after printing a
 * diff of each that is not.
 * @throws Error when the file cannot be read at a commit, holds no mirrored
 * `describe` there, or {@link mirroredDescribes} throws.
 */
function main(base: string, head: string, path: string): number {
  const before = mirroredDescribes(show(base, path));
  const after = mirroredDescribes(show(head, path));
  for (const [commit, found] of [
    [base, before],
    [head, after],
  ] as const) {
    if (found.size === 0)
      throw new Error(`${path} holds no mirrored describe at ${commit}`);
  }

  const dir = mkdtempSync(join(tmpdir(), "check-mirrored-"));
  let status = 0;
  try {
    for (const title of new Set([...before.keys(), ...after.keys()])) {
      const base_text = before.get(title) ?? "";
      const head_text = after.get(title) ?? "";
      if (base_text === head_text) {
        process.stdout.write(`describe("${title}") unchanged\n`);
        continue;
      }
      status = 1;
      writeFileSync(join(dir, "base"), base_text);
      writeFileSync(join(dir, "head"), head_text);
      process.stdout.write(
        `describe("${title}") differs between ${base} and ${head}\n`,
      );
      spawnSync("git", ["diff", "--no-index", "--no-color", "base", "head"], {
        cwd: dir,
        stdio: "inherit",
      });
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  return status;
}

if (process.argv[1] === import.meta.filename) {
  const [base, head, path] = process.argv.slice(2);
  if (base === undefined || head === undefined || path === undefined) {
    process.stderr.write(
      "usage: node scripts/check-mirrored.mts <base> <head> <test file>\n",
    );
    process.exit(2);
  }
  try {
    process.exit(main(base, head, path));
  } catch (error) {
    process.stderr.write(`${(error as Error).message}\n`);
    process.exit(2);
  }
}
