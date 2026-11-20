// @ts-check
/**
 * The site's TypeDoc plugin, which `typedoc.json` loads (ADR 0020's
 * 2026-11-20 amendment). It changes what a page holds, never the source
 * comments (ADR 0025). It is a JavaScript module because Node 22.13.0, the
 * minimum in `engines`, loads a TypeScript one only with
 * `--experimental-strip-types`, on by default from Node 22.18.0
 * (https://github.com/nodejs/node/blob/main/doc/changelogs/CHANGELOG_V22.md#22.18.0).
 *
 * A function that returns an object lists each output once under Returns:
 * each item of its `@returns` list becomes the description of the returned
 * object's property of that name, in the list's order, which
 * `tests/models/returnsList.test.ts` keeps as `INFO.outputs`, then
 * `warnings`. A type hidden from
 * the site is written out where it is used, as TypeDoc's `@inlineType` tag
 * does, so a function that returns one by name, as `set_tmp` returns `SET`,
 * lists its outputs too.
 *
 * A model's page ends with the section "Model info". It prints the model's
 * `*_INFO` constant, found by its `name`, as the value a program imports from
 * `lib/`. Each other constant or class exported from the model's source file,
 * such as `PHS_LIMITS_ISO_7933`, follows in the same form; a constant that
 * holds a classifier the model info already prints gets one sentence naming
 * it instead. None of these constants keeps its own page.
 *
 * A function's page lists its sections under "On This Page", in the page's
 * order: Parameters, Returns, Example and its other sections, and on a
 * model's page Model info last.
 *
 * A module whose members carry `@category` tags, as `models` does, lists its
 * members as one list in the order of its index file's exports, a class
 * such as `JOS3` among the functions. Each run of members in one category
 * sits under the category's title and its `@categoryDescription`, as an
 * introduction sits above its models on upstream's page
 * (`docs/documentation/models.rst:131-160` and `:218-298` at v4.8.1).
 *
 * The `models` page ends with the section "Model info and warnings", built
 * from the exports declared in `src/_internal/`, which only `models`
 * re-exports. It lists each such export with a page of its own, as
 * `classifyFromBins`, and writes out in full each such type, such as
 * `ModelWarning`, which has no page; a link to such a type opens the section
 * at it. `typedoc.json` selects the router and the theme defined
 * here.
 *
 * Every page's header holds the site's name, the version linked to the
 * changelog, the page links Installation, Documentation, Contributing and
 * Authors, search, the theme button and `navigationLinks` as icons. The theme
 * button drives TypeDoc's own theme control, moved from the "Settings" panel,
 * which goes; `docs/site.js` cycles it.
 *
 * The left column lists "Modules", each module by the subpath a program
 * imports it from, then "Guides and notes", each hand-written page by its
 * title, both in pythermalcomfort's order, with no kind icon; `docs/site.js`
 * keeps every module collapsed but the one of the function page shown. The
 * home page and the header's other pages have no left column on a wide
 * screen. A page's title names no kind, and a hand-written page's title, the
 * `title` of its frontmatter, is the `#` heading it opens with; its file
 * still names its page.
 *
 * The header's Documentation link opens the project's page, `modules.html`,
 * as the overview of the documentation that pythermalcomfort's Documentation
 * link opens: the left column's groups in its order, each module with its
 * summary and its members that have a page, in the order of the module's own
 * page, then the hand-written pages by title.
 *
 * The site's two typefaces come from their `@fontsource` packages: the docs
 * build copies their font files and licences into the site and every page
 * links their `@font-face` rules, so that no page asks another host for a
 * font.
 *
 * A template of TypeDoc's that the theme wraps, editing the markup it
 * returns (`wrapTemplate`, `editMarkup`), fails the docs build naming the
 * template when that markup is not what the edit expects, as after a TypeDoc
 * upgrade.
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { inspect } from "node:util";
import {
  Comment,
  CommentTag,
  Converter,
  DefaultTheme,
  DefaultThemeRenderContext,
  i18n,
  JSX,
  KindRouter,
  PageKind,
  ReflectionKind,
  ReflectionSymbolId,
  RendererEvent,
  Slugger,
} from "typedoc";
import ts from "typescript";

/**
 * @import { Application, CommentDisplayPart, ContainerReflection, DeclarationReflection, NavigationElement, PageEvent, PageHeading, ProjectReflection, Reflection, ReflectionCategory, SignatureReflection, SomeType } from "typedoc"
 */

/**
 * Where a constant without a page is shown: its function, and the anchor of
 * its heading on the function's page.
 *
 * @typedef {Map<Reflection, { fn: DeclarationReflection, anchor: string }>} MovedConstants
 */

/**
 * An item of a `@returns` list: the output it names, and its description.
 *
 * @typedef {{ name: string | undefined, description: CommentDisplayPart[] }} ReturnsItem
 */

/**
 * The names of the types and interfaces in the project's own source files
 * that carry `@hidden`.
 *
 * @param {readonly ts.Program[]} programs
 * @returns {string[]}
 */
function hiddenTypeNames(programs) {
  const names = [];
  for (const program of programs) {
    for (const file of program.getSourceFiles()) {
      if (
        file.isDeclarationFile ||
        program.isSourceFileFromExternalLibrary(file)
      )
        continue;
      for (const statement of file.statements) {
        if (
          (ts.isTypeAliasDeclaration(statement) ||
            ts.isInterfaceDeclaration(statement)) &&
          ts
            .getJSDocTags(statement)
            .some((tag) => tag.tagName.text === "hidden")
        )
          names.push(statement.name.text);
      }
    }
  }
  return names;
}

/**
 * The object types a signature returns: the object, or each object of a
 * union.
 *
 * @param {SomeType | undefined} type
 * @returns {DeclarationReflection[]}
 */
function returnedObjects(type) {
  if (type?.type === "reflection") return [type.declaration];
  if (type?.type === "union") return type.types.flatMap(returnedObjects);
  return [];
}

/**
 * Splits the content of a `@returns` tag into the text before its list, if
 * any, and the parts of each `- ` item.
 *
 * @param {readonly CommentDisplayPart[]} content
 * @returns {{ head: CommentDisplayPart[], items: CommentDisplayPart[][] }}
 */
function splitItems(content) {
  /** @type {CommentDisplayPart[]} */
  const head = [];
  /** @type {CommentDisplayPart[][]} */
  const items = [];
  for (const part of content) {
    if (part.kind !== "text") {
      (items.at(-1) ?? head).push(part);
      continue;
    }
    part.text.split(/\n(?=- )/).forEach((piece, i) => {
      const atContentStart = head.length === 0 && items.length === 0;
      // The list may open the content, with no text before it.
      const opensItem = i > 0 || (atContentStart && piece.startsWith("- "));
      if (opensItem) items.push([]);
      const text = opensItem ? piece.slice(2) : piece;
      if (text !== "") (items.at(-1) ?? head).push({ kind: "text", text });
    });
  }
  return { head: trimEnd(head), items };
}

/**
 * The parts with trailing whitespace removed from the last one, and an
 * emptied last part dropped.
 *
 * @param {CommentDisplayPart[]} parts
 * @returns {CommentDisplayPart[]}
 */
function trimEnd(parts) {
  const last = parts.at(-1);
  if (last?.kind !== "text") return parts;
  const text = last.text.trimEnd();
  return text === ""
    ? parts.slice(0, -1)
    : [...parts.slice(0, -1), { ...last, text }];
}

/**
 * An item's output name, from its leading code span, and its description,
 * the parts after ` - `.
 *
 * @param {readonly CommentDisplayPart[]} item
 * @returns {ReturnsItem}
 */
function nameAndDescription(item) {
  const [first, ...rest] = item;
  if (first?.kind !== "code") return { name: undefined, description: [] };
  const [next, ...others] = rest;
  const description =
    next?.kind === "text"
      ? [{ ...next, text: next.text.replace(/^\s*-\s*/, "") }, ...others]
      : rest;
  return {
    name: first.text.replace(/^`+|`+$/g, ""),
    description: trimEnd(
      description.filter((part) => part.kind !== "text" || part.text !== ""),
    ),
  };
}

/**
 * Moves each item of the `@returns` lists of a function's signatures to the
 * returned objects' property of its name, orders those properties as the
 * list, and logs an error for an item that names no property.
 *
 * @param {Application} app
 * @param {DeclarationReflection} fn
 */
function joinReturnsToOutputs(app, fn) {
  /** @type {{ tag: CommentTag, objects: DeclarationReflection[], head: CommentDisplayPart[], items: ReturnsItem[] }[]} */
  const parsedLists = [];
  // Overloads may share one comment, so every list is read before any is
  // changed.
  for (const signature of fn.signatures ?? []) {
    const objects = returnedObjects(signature.type);
    const tag = signature.comment?.getTag("@returns");
    if (objects.length === 0 || tag === undefined) continue;
    const { head, items } = splitItems(tag.content);
    if (items.length === 0) continue;
    parsedLists.push({
      tag,
      objects,
      head,
      items: items.map(nameAndDescription),
    });
  }
  // An item is checked against every overload's outputs: `two_nodes_gagge`'s
  // first overload returns only `set` and `warnings` of the list it shares.
  const outputs = new Set(
    parsedLists.flatMap(({ objects }) =>
      objects.flatMap((object) => object.getProperties().map((p) => p.name)),
    ),
  );
  const listed = new Set(
    parsedLists.flatMap(({ items }) => items.map(({ name }) => name)),
  );
  for (const name of listed) {
    if (name === undefined || !outputs.has(name))
      app.logger.error(
        `${fn.getFullName()}: an item of its @returns list, ${name === undefined ? "one that does not start with a code span" : `\`${name}\``}, matches no output`,
      );
  }
  for (const { tag, objects, head, items } of parsedLists) {
    const order = items.map(({ name }) => name);
    for (const object of objects) {
      for (const property of object.getProperties()) {
        const item = items.find(({ name }) => name === property.name);
        if (item !== undefined && item.description.length > 0)
          property.comment = new Comment(
            Comment.cloneDisplayParts(item.description),
          );
      }
      object.children?.sort(byNameIn(order));
    }
    tag.content = head;
  }
}

/**
 * A comparison that sorts reflections by their names' places in the list,
 * with names it does not hold after the rest.
 *
 * @param {readonly (string | undefined)[]} order
 * @returns {(a: Reflection, b: Reflection) => number}
 */
function byNameIn(order) {
  const rank = (/** @type {string} */ name) => {
    const index = order.indexOf(name);
    return index === -1 ? order.length : index;
  };
  return (a, b) => rank(a.name) - rank(b.name);
}

/** The width in columns within which a printed value keeps a line. */
const PRINT_WIDTH = 80;

/**
 * The exports of each of the package's subpaths, imported by the package's
 * name as a program imports them, keyed by the subpath's module name.
 *
 * @returns {Promise<Map<string, Record<string, unknown>>>}
 */
async function packageExports() {
  /** @type {{ name: string, exports: Record<string, unknown> }} */
  const pkg = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  );
  const subpaths = Object.keys(pkg.exports)
    .filter((key) => key !== ".")
    .map((key) => key.slice(2));
  return new Map(
    await Promise.all(
      subpaths.map(
        async (subpath) =>
          /** @type {[string, Record<string, unknown>]} */ ([
            subpath,
            await import(`${pkg.name}/${subpath}`),
          ]),
      ),
    ),
  );
}

/**
 * The brackets and the entries of an object or array, each entry with the
 * text before its value; a class instance's opening bracket is preceded by
 * its class's name, as `console.log` prints it.
 *
 * @param {object} value
 * @returns {{ open: string, close: string, entries: [string, unknown][] }}
 */
function bracketsAndEntries(value) {
  if (Array.isArray(value))
    return { open: "[", close: "]", entries: value.map((v) => ["", v]) };
  const prototype = Object.getPrototypeOf(value);
  const prefix =
    prototype === Object.prototype ? "" : `${value.constructor.name} `;
  return {
    open: `${prefix}{ `,
    close: " }",
    entries: Object.entries(value).map(([key, v]) => [
      `${/^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key)}: `,
      v,
    ]),
  };
}

/**
 * A value as JavaScript source on one line. A function or class is printed
 * as `console.log` prints it, such as `[Function: message]` or
 * `[class _SportsValues]`, since its source names constants it does not
 * resolve.
 *
 * @param {unknown} value
 * @returns {string}
 */
function printOnOneLine(value) {
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "function") return inspect(value);
  if (typeof value !== "object" || value === null) return String(value);
  const { open, close, entries } = bracketsAndEntries(value);
  if (entries.length === 0) return `${open.trimEnd()}${close.trimStart()}`;
  return `${open}${entries.map(([key, v]) => key + printOnOneLine(v)).join(", ")}${close}`;
}

/**
 * A value as JavaScript source: an object or array on one line when it ends
 * within `PRINT_WIDTH` columns, else one entry per line, indented by two
 * spaces a level.
 *
 * @param {unknown} value
 * @param {string} indent The indentation of the value's first line.
 * @param {number} column The column at which the value starts.
 * @returns {string}
 */
function printValue(value, indent = "", column = 0) {
  const line = printOnOneLine(value);
  if (
    typeof value !== "object" ||
    value === null ||
    column + line.length <= PRINT_WIDTH
  )
    return line;
  const { open, close, entries } = bracketsAndEntries(value);
  const inner = `${indent}  `;
  const lines = entries.map(
    ([key, v]) =>
      `${inner}${key}${printValue(v, inner, inner.length + key.length)},`,
  );
  return [open.trimEnd(), ...lines, `${indent}${close.trimStart()}`].join("\n");
}

/**
 * The path of each classifier in a model info, keyed by the classifier.
 *
 * @param {unknown} value
 * @param {string} path
 * @param {Map<unknown, string>} found
 * @returns {Map<unknown, string>}
 */
function classifierPaths(value, path = "", found = new Map()) {
  if (typeof value !== "object" || value === null) return found;
  for (const [key, child] of Object.entries(value)) {
    const childPath = path === "" ? key : `${path}.${key}`;
    if (key === "classifier") found.set(child, childPath);
    else classifierPaths(child, childPath, found);
  }
  return found;
}

/**
 * A class's constructor and properties as a TypeScript declaration.
 *
 * @param {DeclarationReflection} cls
 * @returns {string}
 */
function printClass(cls) {
  const lines = [];
  for (const child of cls.children ?? []) {
    if (child.kindOf(ReflectionKind.Constructor))
      for (const signature of child.signatures ?? [])
        lines.push(
          `  constructor(${(signature.parameters ?? []).map((p) => `${p.name}: ${p.type}`).join(", ")});`,
        );
    else if (child.kindOf(ReflectionKind.Property))
      lines.push(
        `  ${child.flags.isReadonly ? "readonly " : ""}${child.name}: ${child.type};`,
      );
  }
  return [`class ${cls.name} {`, ...lines, "}"].join("\n");
}

/**
 * A heading with an export's name, its comment's summary and a code block.
 * The heading is plain text: TypeDoc 0.28 builds a heading's anchor from its
 * text tokens only (`getTokenTextContent` in `node_modules/typedoc/dist/index.js`),
 * so a code span gives the anchor `_`.
 *
 * @param {string} name
 * @param {Comment | undefined} comment
 * @param {string} language
 * @param {string} code
 * @returns {CommentDisplayPart[]}
 */
function block(name, comment, language, code) {
  const summary = comment ? Comment.cloneDisplayParts(comment.summary) : [];
  return [
    { kind: "text", text: `\n\n##### ${name}\n\n` },
    ...summary,
    { kind: "text", text: `${summary.length > 0 ? "\n\n" : ""}` },
    { kind: "code", text: `\`\`\`${language}\n${code}\n\`\`\`` },
  ];
}

/**
 * Whether a reflection is the given one or one of its descendants.
 *
 * @param {Reflection | undefined} reflection
 * @param {Reflection} ancestor
 * @returns {boolean}
 */
function isWithin(reflection, ancestor) {
  for (let r = reflection; r !== undefined; r = r.parent)
    if (r === ancestor) return true;
  return false;
}

/**
 * Points each `{@link}` to a removed reflection at its block on the
 * function's page, and logs an error for a link from any other page.
 *
 * A link's target is matched by the public `qualifiedName` and `fileName` of
 * its `ReflectionSymbolId`, since TypeDoc 0.28's lookup from a symbol to its
 * reflections is `@internal`.
 *
 * @param {Application} app
 * @param {ProjectReflection} project
 * @param {MovedConstants} moved
 */
function retargetLinks(app, project, moved) {
  const targets = [...moved].map(([constant, place]) => ({
    constant,
    place,
    file: constant.isDeclaration()
      ? constant.sources?.[0]?.fullFileName
      : undefined,
  }));
  for (const reflection of Object.values(project.reflections)) {
    const comment = reflection.comment;
    if (comment === undefined) continue;
    const parts = [
      ...comment.summary,
      ...comment.blockTags.flatMap((tag) => tag.content),
    ];
    for (const part of parts) {
      if (
        part.kind !== "inline-tag" ||
        !(part.target instanceof ReflectionSymbolId)
      )
        continue;
      const symbol = part.target;
      const match = targets.find(
        ({ constant, file }) =>
          symbol.qualifiedName === constant.name && symbol.fileName === file,
      );
      if (match === undefined) continue;
      const { constant, place } = match;
      if (isWithin(reflection, place.fn)) part.target = `#${place.anchor}`;
      else
        app.logger.error(
          `${reflection.getFullName()}: links to ${constant.name}, which is shown only on ${place.fn.getFullName()}'s page`,
        );
    }
  }
}

/**
 * A constant's part of the section: a block with its value, a class's block
 * with its declaration, or, for a constant that holds a classifier the model
 * info prints, one sentence per classifier naming the export.
 *
 * @param {DeclarationReflection} constant
 * @param {unknown} value The constant's value; unused for a class.
 * @param {Map<unknown, string>} classifiers
 * @returns {{ parts: CommentDisplayPart[], hasHeading: boolean }}
 */
function constantBlock(constant, value, classifiers) {
  if (constant.kindOf(ReflectionKind.Class))
    return {
      parts: block(constant.name, constant.comment, "ts", printClass(constant)),
      hasHeading: true,
    };
  const printed = [
    { held: value, accessor: "" },
    ...Object.entries(value ?? {}).map(([key, held]) => ({
      held,
      accessor: `[${JSON.stringify(key)}]`,
    })),
  ].filter(({ held }) => classifiers.has(held));
  if (printed.length === 0)
    return {
      parts: block(constant.name, constant.comment, "js", printValue(value)),
      hasHeading: true,
    };
  const text = printed
    .map(
      ({ held, accessor }) =>
        `\n\n\`${classifiers.get(held)}\` is the export \`${constant.name}${accessor}\`.`,
    )
    .join("");
  return { parts: [{ kind: "text", text }], hasHeading: false };
}

/**
 * Appends the section "Model info" to the last signature of each `*_INFO`
 * constant's function, with the function's other constants, and removes
 * their pages. Logs an error for a model info that matches no function.
 *
 * @param {Application} app
 * @param {ProjectReflection} project
 * @param {Map<string, Record<string, unknown>>} exportsByModule
 */
function placeModelInfo(app, project, exportsByModule) {
  /** @type {MovedConstants} */
  const moved = new Map();
  for (const info of project.getReflectionsByKind(ReflectionKind.Variable)) {
    if (!info.name.endsWith("_INFO")) continue;
    const module = /** @type {ContainerReflection} */ (info.parent);
    const exports = exportsByModule.get(module.name) ?? {};
    const value = /** @type {{ name?: unknown } | undefined} */ (
      exports[info.name]
    );
    if (value === undefined) {
      app.logger.error(
        `${info.getFullName()} is not exported by jsthermalcomfort/${module.name}`,
      );
      continue;
    }
    const fn = module.children?.find(
      (child) =>
        child.kindOf(ReflectionKind.Function) && child.name === value.name,
    );
    const signature = fn?.signatures?.at(-1);
    if (fn === undefined || signature === undefined) {
      app.logger.error(
        `${info.getFullName()}: its name, ${JSON.stringify(value.name)}, matches no function of ${module.name}`,
      );
      continue;
    }
    const file = fn.sources?.[0]?.fullFileName;
    const constants = (module.children ?? []).filter(
      (child) =>
        child !== info &&
        child.kindOf(ReflectionKind.Variable | ReflectionKind.Class) &&
        child.sources?.[0]?.fullFileName === file,
    );
    const isClass = (/** @type {DeclarationReflection} */ r) =>
      Number(r.kindOf(ReflectionKind.Class));
    // Values before classes: a class describes what a value above holds.
    constants.sort((a, b) => isClass(a) - isClass(b));
    // One slugger per page, as the theme keeps one per page.
    const slugger = new Slugger(app.options.getValue("sluggerConfiguration"));
    const infoAnchor = slugger.slug(info.name);
    moved.set(info, { fn, anchor: infoAnchor });
    const classifiers = classifierPaths(value);
    /** @type {CommentDisplayPart[]} */
    const content = block(info.name, undefined, "js", printValue(value));
    for (const constant of constants) {
      const { parts, hasHeading } = constantBlock(
        constant,
        exports[constant.name],
        classifiers,
      );
      content.push(...parts);
      // A constant only named sits under the model info's heading.
      const anchor = hasHeading ? slugger.slug(constant.name) : infoAnchor;
      moved.set(constant, { fn, anchor });
    }
    signature.comment = signature.comment?.clone() ?? new Comment();
    signature.comment.blockTags.push(new CommentTag("@modelInfo", content));
  }
  retargetLinks(app, project, moved);
  for (const reflection of moved.keys()) project.removeReflection(reflection);
}

/** The heading of the `models` page's last section. */
const SHARED_SECTION = "Model info and warnings";

/** The folder whose exports every model shares, with a trailing slash. */
const SHARED_FOLDER = fileURLToPath(
  new URL("../src/_internal/", import.meta.url),
).replaceAll("\\", "/");

/**
 * Whether a reflection is a module's export declared in `src/_internal/`, as
 * `ModelWarning` and `classifyFromBins` are.
 *
 * @param {Reflection} reflection
 * @returns {reflection is DeclarationReflection}
 */
function isShared(reflection) {
  return (
    reflection.isDeclaration() &&
    reflection.parent?.kindOf(ReflectionKind.Module) === true &&
    (reflection.sources?.[0]?.fullFileName.startsWith(SHARED_FOLDER) ?? false)
  );
}

/**
 * Whether a reflection is a shared interface or type alias, which has no page
 * of its own.
 *
 * @param {Reflection} reflection
 * @returns {reflection is DeclarationReflection}
 */
function isSharedType(reflection) {
  return (
    isShared(reflection) &&
    reflection.kindOf(ReflectionKind.Interface | ReflectionKind.TypeAlias)
  );
}

/**
 * Takes each shared export out of its module's groups, so that the module's
 * page lists it only in the section "Model info and warnings".
 *
 * @param {ProjectReflection} project
 */
function ungroupShared(project) {
  for (const module of project.getReflectionsByKind(ReflectionKind.Module)) {
    if (!module.isDeclaration() || module.groups === undefined) continue;
    for (const group of module.groups)
      group.children = group.children.filter((child) => !isShared(child));
    module.groups = module.groups.filter((group) => group.children.length > 0);
  }
}

/** The folder of the hand-written pages that `typedoc.json` lists. */
const DOCS_FOLDER = fileURLToPath(new URL("../docs/", import.meta.url));

/**
 * A hand-written page's file under `docs/`, without its extension, such as
 * `installation` or `deviations/README`. The site finds a page by its file,
 * since the page's name is the `title` of its frontmatter.
 *
 * @param {Reflection} doc
 * @returns {string | undefined}
 */
function documentFile(doc) {
  const path = doc.project.files.getReflectionPath(doc);
  if (path === undefined) return undefined;
  return relative(DOCS_FOLDER, path).split(sep).join("/").replace(/\.md$/, "");
}

/**
 * The hand-written page of `file` (as {@link documentFile} names it), or
 * `undefined` when `typedoc.json`'s `projectDocuments` does not list it.
 *
 * @param {ProjectReflection} project
 * @param {string} file
 * @returns {Reflection | undefined}
 */
function documentOf(project, file) {
  return project.documents?.find((doc) => documentFile(doc) === file);
}

/**
 * Fails the docs build for a hand-written page whose name, the `title` of its
 * frontmatter, which the left column and the browser tab show, is not the
 * text of the `#` heading the page opens with.
 *
 * @param {Application} app
 * @param {ProjectReflection} project
 */
function checkDocumentTitles(app, project) {
  for (const doc of project.documents ?? []) {
    const text = doc.content.map((part) => part.text).join("");
    const heading = /^# (.+)/.exec(text.trimStart())?.[1]?.trim();
    if (heading !== doc.name)
      app.logger.error(
        `docs/${documentFile(doc)}.md: the title in its frontmatter, "${doc.name}", is not the text of the # heading it opens with${heading === undefined ? " (none)" : `, "${heading}"`}`,
      );
  }
}

/**
 * Gives a shared type no page, so it is written out on its module's page, and
 * names a hand-written page's file after its own file, as TypeDoc does for a
 * page without a `title`: `documents/deviations_README.html`.
 */
class SiteRouter extends KindRouter {
  /** @param {Reflection} target */
  getPageKind(target) {
    return isSharedType(target) ? undefined : super.getPageKind(target);
  }

  /** @param {Reflection} reflection */
  getIdealBaseName(reflection) {
    const file = reflection.isDocument() ? documentFile(reflection) : undefined;
    return file === undefined
      ? super.getIdealBaseName(reflection)
      : `documents/${file.replaceAll("/", "_")}`;
  }
}

/**
 * A shared type's header: `interface` with its properties, as the type's own
 * page would show it, or `type` with its definition. The default theme
 * prints a type shown on another page as a property, `NumericField: any`
 * (`.scratch/v2-release-checks/evidence/model-pages/`, patch 26).
 *
 * @param {DefaultThemeRenderContext} context
 * @param {DeclarationReflection} type
 * @returns {JSX.Element}
 */
function typeHeader(context, type) {
  const preview = context.reflectionPreview(type);
  if (preview !== undefined) return preview;
  const isAlias = type.kindOf(ReflectionKind.TypeAlias);
  return JSX.createElement(
    "div",
    { class: "tsd-signature" },
    JSX.createElement(
      "span",
      { class: "tsd-signature-keyword" },
      isAlias ? "type" : "interface",
    ),
    " ",
    JSX.createElement(
      "span",
      { class: ReflectionKind.classString(type.kind) },
      type.name,
    ),
    isAlias && type.type !== undefined
      ? [
          " ",
          JSX.createElement("span", { class: "tsd-signature-symbol" }, "="),
          " ",
          context.type(type.type),
        ]
      : null,
  );
}

/**
 * The permalink the theme puts at the end of a heading.
 *
 * @param {DefaultThemeRenderContext} context
 * @param {string} anchor
 * @returns {JSX.Element}
 */
function permalink(context, anchor) {
  return JSX.createElement(
    "a",
    {
      href: `#${anchor}`,
      "aria-label": i18n.theme_permalink(),
      class: "tsd-anchor-icon",
    },
    context.icons.anchor(),
  );
}

/**
 * A titled section of a module's page, which "On This Page" lists under its
 * title, in the markup of the theme's member groups (`members` and
 * `moduleReflection` in TypeDoc 0.28).
 *
 * @param {DefaultThemeRenderContext} context
 * @param {string} title
 * @param {() => JSX.Children} content Called once the section has started,
 *   so that the headings it adds are listed under the title.
 * @returns {JSX.Element}
 */
function titledSection(context, title, content) {
  context.page.startNewSection(title);
  return sectionMarkup(context, title, context.slugger.slug(title), content);
}

/**
 * A section's markup, as {@link titledSection} gives it, without starting a
 * section of "On This Page".
 *
 * @param {DefaultThemeRenderContext} context
 * @param {string} title
 * @param {string} anchor The id of the section's heading.
 * @param {() => JSX.Children} content
 * @returns {JSX.Element}
 */
function sectionMarkup(context, title, anchor, content) {
  return JSX.createElement(
    "details",
    { class: "tsd-panel-group tsd-member-group tsd-accordion", open: true },
    JSX.createElement(
      "summary",
      { class: "tsd-accordion-summary", "data-key": `section-${title}` },
      context.icons.chevronDown(),
      JSX.createElement(
        "h2",
        { class: "tsd-anchor-link", id: anchor },
        title,
        permalink(context, anchor),
      ),
    ),
    content(),
  );
}

/**
 * The summaries of a module's members, as the theme lists them.
 *
 * @param {DefaultThemeRenderContext} context
 * @param {DeclarationReflection[]} members
 * @returns {JSX.Element}
 */
function memberSummaries(context, members) {
  return JSX.createElement(
    "dl",
    { class: "tsd-member-summaries" },
    members.map((member) => context.moduleMemberSummary(member)),
  );
}

/**
 * The section "Model info and warnings" of a module's page: a summary of each
 * shared export with its own page, then each shared type in full.
 *
 * @param {DefaultThemeRenderContext} context
 * @param {DeclarationReflection | ProjectReflection} module
 * @returns {JSX.Element | null}
 */
function sharedSection(context, module) {
  const shared = (module.children ?? []).filter(isShared);
  if (shared.length === 0) return null;
  const withPage = shared.filter((reflection) => !isSharedType(reflection));
  const types = shared.filter(isSharedType);
  return titledSection(context, SHARED_SECTION, () =>
    JSX.createElement(
      "section",
      null,
      withPage.length > 0 ? memberSummaries(context, withPage) : null,
      types.map((type) => context.member(type)),
    ),
  );
}

/**
 * Whether a reflection is a module whose members carry `@category` tags,
 * which makes its page one list of its members.
 *
 * @param {Reflection} reflection
 * @returns {reflection is DeclarationReflection}
 */
function isCategorized(reflection) {
  return (
    reflection.isDeclaration() &&
    reflection.kindOf(ReflectionKind.Module) &&
    (reflection.categories?.length ?? 0) > 0
  );
}

/**
 * A categorized module's page, in place of the theme's groups by kind: its
 * comment, then one list of its members other than the shared ones, in the
 * order of its index file's exports. Each run of members in one category
 * sits under the category's title and its `@categoryDescription`.
 *
 * @param {DefaultThemeRenderContext} context
 * @param {DeclarationReflection} module
 * @returns {JSX.Element}
 */
function categorizedList(context, module) {
  const uncategorized = context.options.getValue("defaultCategory");
  /** @type {Map<Reflection, ReflectionCategory>} */
  const categoryOf = new Map();
  for (const category of module.categories ?? [])
    if (category.title !== uncategorized)
      for (const child of category.children) categoryOf.set(child, category);
  /** @type {{ category: ReflectionCategory | undefined, members: DeclarationReflection[] }[]} */
  const runs = [];
  for (const child of module.children ?? []) {
    if (isShared(child)) continue;
    const category = categoryOf.get(child);
    const run = runs.at(-1);
    if (run !== undefined && run.category === category) run.members.push(child);
    else runs.push({ category, members: [child] });
  }
  return JSX.createElement(
    JSX.Fragment,
    null,
    // The module's comment as the default `moduleReflection` partial shows
    // it (TypeDoc 0.28).
    module.hasComment(context.options.getValue("notRenderedTags"))
      ? JSX.createElement(
          "section",
          { class: "tsd-panel tsd-comment" },
          context.commentSummary(module),
          context.commentTags(module),
        )
      : null,
    runs.map(({ category, members }, index) => {
      if (category === undefined) {
        // A run after the first follows a titled section, and "On This
        // Page" lists it apart from that section.
        if (index > 0) context.page.startNewSection("");
        return JSX.createElement(
          "section",
          { class: "tsd-panel-group tsd-member-group" },
          memberSummaries(context, members),
        );
      }
      return titledSection(context, category.title, () =>
        JSX.createElement(
          "section",
          { class: "site-category" },
          category.description
            ? JSX.createElement(
                "div",
                { class: "tsd-comment tsd-typography" },
                JSX.createElement(JSX.Raw, {
                  html: context.markdown(category.description),
                }),
              )
            : null,
          memberSummaries(context, members),
        ),
      );
    }),
  );
}

/**
 * Whether the page is the documentation's overview: the project's own page,
 * `modules.html`, which the header's Documentation link opens. The home page
 * shows the project's readme, and `hierarchy.html` its class hierarchy.
 *
 * @param {PageEvent<Reflection>} page
 * @returns {boolean}
 */
function isOverview(page) {
  return page.model.isProject() && page.pageKind === PageKind.Reflection;
}

/**
 * A module's members that have a page, in the order its own page lists them:
 * a categorized module's as {@link categorizedList} does, any other's by the
 * theme's groups by kind (`moduleReflection` in TypeDoc 0.28, for a module
 * without categories), then those of its section "Model info and warnings".
 *
 * @param {DefaultThemeRenderContext} context
 * @param {DeclarationReflection} module
 * @returns {Reflection[]}
 */
function membersWithPage(context, module) {
  const children = module.children ?? [];
  // A second name, so that the type guard does not narrow `module` to `never`.
  /** @type {Reflection} */
  const reflection = module;
  /** @type {Reflection[]} */
  const own = isCategorized(reflection)
    ? children.filter((child) => !isShared(child))
    : (module.groups ?? []).flatMap((group) => group.children);
  return [...own, ...children.filter(isShared)].filter((member) =>
    context.router.hasOwnDocument(member),
  );
}

/**
 * A module in the overview: its name, linked to its page, which "On This
 * Page" lists; its summary; and its members that have a page, each linked.
 *
 * @param {DefaultThemeRenderContext} context
 * @param {DeclarationReflection} module
 * @returns {JSX.Element}
 */
function overviewModule(context, module) {
  const anchor = context.slugger.slug(module.name);
  context.page.pageHeadings.push({ link: `#${anchor}`, text: module.name });
  return JSX.createElement(
    JSX.Fragment,
    null,
    JSX.createElement(
      "h3",
      { class: "tsd-anchor-link", id: anchor },
      JSX.createElement("a", { href: context.urlTo(module) }, module.name),
      permalink(context, anchor),
    ),
    context.commentShortSummary(module),
    JSX.createElement(
      "ul",
      { class: "site-overview-members" },
      membersWithPage(context, module).map((member) =>
        JSX.createElement(
          "li",
          null,
          JSX.createElement("a", { href: context.urlTo(member) }, member.name),
        ),
      ),
    ),
  );
}

/**
 * The documentation's overview, in place of the project page's list of
 * modules and documents: each group of {@link NAVIGATION_GROUPS} as a
 * section, in the left column's order. A module is shown by
 * {@link overviewModule}, a hand-written page as a link with its title. A
 * group of pages only is one entry of "On This Page", since its pages are
 * elsewhere. An entry the project lacks is left out; `siteNavigation` fails
 * the docs build for it.
 *
 * @param {DefaultThemeRenderContext} context
 * @param {ProjectReflection} project
 * @returns {JSX.Element}
 */
function overview(context, project) {
  /** @type {Map<string, DeclarationReflection>} */
  const modules = new Map();
  for (const child of project.children ?? [])
    if (child.kindOf(ReflectionKind.Module)) modules.set(child.name, child);
  return JSX.createElement(
    JSX.Fragment,
    null,
    NAVIGATION_GROUPS.map(([label, keys]) => {
      /** @type {DeclarationReflection[]} */
      const groupModules = [];
      /** @type {Reflection[]} */
      const pages = [];
      for (const key of keys) {
        const module = modules.get(key);
        const page =
          module === undefined ? documentOf(project, key) : undefined;
        if (module !== undefined) groupModules.push(module);
        else if (page !== undefined) pages.push(page);
      }
      const content = () =>
        JSX.createElement(
          "section",
          { class: "site-overview" },
          groupModules.map((module) => overviewModule(context, module)),
          pages.length > 0
            ? JSX.createElement(
                "ul",
                { class: "site-overview-pages" },
                pages.map((page) =>
                  JSX.createElement(
                    "li",
                    null,
                    JSX.createElement(
                      "a",
                      { href: context.urlTo(page) },
                      page.name,
                    ),
                  ),
                ),
              )
            : null,
        );
      if (groupModules.length > 0)
        return titledSection(context, label, content);
      context.page.startNewSection("");
      const anchor = context.slugger.slug(label);
      context.page.pageHeadings.push({ link: `#${anchor}`, text: label });
      return sectionMarkup(context, label, anchor, content);
    }),
  );
}

/**
 * The browser tab's title of the documentation's overview, edited from what
 * TypeDoc's `defaultLayout` template returns: "Documentation" before the
 * project's name, as a hand-written page's title stands before it.
 *
 * @param {JSX.Element} markup
 * @param {unknown} _template The page's template, which this edit leaves.
 * @param {PageEvent<Reflection>} props
 * @returns {JSX.Element}
 */
function overviewTab(markup, _template, props) {
  if (!isOverview(props)) return markup;
  const title = expectElement(
    markup,
    (element) => element.tag === "title",
    "the browser tab's title, a title element",
  );
  title.children = ["Documentation | ", ...title.children];
  return markup;
}

/**
 * The names a file exports by value, in the order of its `export { … }`
 * lists.
 *
 * @param {string} file
 * @returns {string[]}
 */
function exportedNames(file) {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
  );
  return source.statements.flatMap((statement) =>
    ts.isExportDeclaration(statement) &&
    !statement.isTypeOnly &&
    statement.exportClause !== undefined &&
    ts.isNamedExports(statement.exportClause)
      ? statement.exportClause.elements.map((element) => element.name.text)
      : [],
  );
}

/**
 * Sorts a categorized module's children in the order of its index file's
 * exports, which its `@sortStrategy` sorted by kind, so that its page and its
 * navigation list a class among the functions at its export's place. Logs an
 * error for a category with no `@categoryDescription`, as a misspelled
 * `@category` title makes.
 *
 * @param {Application} app
 * @param {ProjectReflection} project
 */
function listInExportOrder(app, project) {
  const uncategorized = app.options.getValue("defaultCategory");
  for (const module of project.getReflectionsByKind(ReflectionKind.Module)) {
    if (!isCategorized(module)) continue;
    for (const category of module.categories ?? [])
      if (
        category.title !== uncategorized &&
        category.description === undefined
      )
        app.logger.error(
          `${module.getFullName()}: the category "${category.title}" of ${category.children.map((c) => c.name).join(", ")} has no @categoryDescription`,
        );
    const file = module.sources?.[0]?.fullFileName;
    if (file === undefined) {
      app.logger.error(
        `${module.getFullName()}: its index file is unknown, so its members cannot be listed in export order`,
      );
      continue;
    }
    const byExport = byNameIn(exportedNames(file));
    module.children?.sort(byExport);
    module.childrenIncludingDocuments?.sort(byExport);
  }
}

/**
 * Thrown by the edit of a wrapped template when the markup that TypeDoc's
 * template returned is not what the edit expects; `what` names what is
 * missing.
 */
class UnexpectedMarkup extends Error {
  /** @param {string} what */
  constructor(what) {
    super(what);
    this.name = "UnexpectedMarkup";
  }
}

/**
 * The first element in a markup tree that passes `test`.
 *
 * @param {JSX.Children} node
 * @param {(element: JSX.Element) => boolean} test
 * @returns {JSX.Element | undefined}
 */
function findElement(node, test) {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findElement(child, test);
      if (found) return found;
    }
    return undefined;
  }
  if (typeof node !== "object" || node === null) return undefined;
  if (test(node)) return node;
  return findElement(node.children, test);
}

/**
 * The first element in a markup tree that passes `test`; else throws
 * {@link UnexpectedMarkup} with `what`.
 *
 * @param {JSX.Children} node
 * @param {(element: JSX.Element) => boolean} test
 * @param {string} what
 * @returns {JSX.Element}
 */
function expectElement(node, test, what) {
  const found = findElement(node, test);
  if (found === undefined) throw new UnexpectedMarkup(what);
  return found;
}

/**
 * Tests an element by its `id`.
 *
 * @param {string} id
 * @returns {(element: JSX.Element) => boolean}
 */
const withId = (id) => (element) =>
  /** @type {Record<string, unknown> | null} */ (element.props)?.id === id;

/**
 * Tests an element by one of its classes.
 *
 * @param {string} name
 * @returns {(element: JSX.Element) => boolean}
 */
const withClass = (name) => (element) =>
  String(
    /** @type {Record<string, unknown> | null} */ (element.props)?.class ?? "",
  )
    .split(" ")
    .includes(name);

/** @type {WeakMap<object, Set<string>>} */
const reported = new WeakMap();

/**
 * Logs `message` as an error once per render, which fails the docs build.
 *
 * @param {DefaultThemeRenderContext} context
 * @param {string} message
 */
function reportOnce(context, message) {
  const seen = reported.get(context.theme) ?? new Set();
  reported.set(context.theme, seen);
  if (seen.has(message)) return;
  seen.add(message);
  context.theme.application.logger.error(
    `${message} (first on ${context.page.url})`,
  );
}

/**
 * Runs `edit` on the markup that TypeDoc's template `name` returned. When the
 * edit throws {@link UnexpectedMarkup}, logs an error that names the template,
 * which fails the docs build, and returns `undefined`.
 *
 * @template T
 * @param {DefaultThemeRenderContext} context
 * @param {string} name
 * @param {() => T} edit
 * @returns {T | undefined}
 */
function editMarkup(context, name, edit) {
  try {
    return edit();
  } catch (error) {
    if (!(error instanceof UnexpectedMarkup)) throw error;
    reportOnce(
      context,
      `TypeDoc's "${name}" template returned markup that scripts/typedoc-plugin.mjs does not expect: ${error.message} is missing`,
    );
    return undefined;
  }
}

/**
 * TypeDoc's template `name`, `template`, wrapped: `edit` changes the markup
 * the template returns. Markup the edit does not expect, as after a TypeDoc
 * upgrade, fails the docs build naming the template, and the page keeps
 * TypeDoc's markup.
 *
 * @template {unknown[]} A
 * @param {DefaultThemeRenderContext} context
 * @param {string} name
 * @param {(...args: A) => JSX.Element} template
 * @param {(markup: JSX.Element, ...args: A) => JSX.Element} edit
 * @returns {(...args: A) => JSX.Element}
 */
function wrapTemplate(context, name, template, edit) {
  return (...args) => {
    const markup = template(...args);
    return editMarkup(context, name, () => edit(markup, ...args)) ?? markup;
  };
}

/**
 * The section headings of a signature's body, in the page's order: each `h4`
 * outside a list, which leaves out the headings of a parameter's or an
 * output's own comment. A heading without an id, such as Parameters or
 * Returns, gets the id and the permalink that the theme gives a block tag's
 * heading. A heading that repeats the one before it, as a second `@throws`
 * tag's does, is not listed again.
 *
 * Throws {@link UnexpectedMarkup} for a heading that starts with no text, as
 * one would after a TypeDoc upgrade that changes the theme's markup, since the
 * table of contents could not name it.
 *
 * @param {DefaultThemeRenderContext} context
 * @param {JSX.Children} node
 * @param {PageHeading[]} headings
 * @returns {PageHeading[]}
 */
function sectionHeadings(context, node, headings = []) {
  if (Array.isArray(node)) {
    for (const child of node) sectionHeadings(context, child, headings);
    return headings;
  }
  if (typeof node !== "object" || node === null) return headings;
  if (node.tag === "h4") {
    const text = node.children.find((c) => typeof c === "string");
    if (typeof text !== "string" || text.trim() === "")
      throw new UnexpectedMarkup(
        `the text at the start of a section heading (h4) of ${context.model.getFullName()}`,
      );
    const props = /** @type {Record<string, unknown>} */ (node.props ??= {});
    if (props.id === undefined) {
      const anchor = context.slugger.slug(text);
      props.id = anchor;
      props.class = [props.class, "tsd-anchor-link"].filter(Boolean).join(" ");
      node.children.push(permalink(context, anchor));
    }
    if (headings.at(-1)?.text !== text)
      headings.push({ link: `#${props.id}`, text });
    return headings;
  }
  // A list holds a parameter's or an output's own headings.
  if (node.tag === "ul") return headings;
  return sectionHeadings(context, node.children, headings);
}

/**
 * The header's page links, as pythermalcomfort's site has them: each label
 * with the file of the document it opens (as {@link documentFile} names it),
 * or `undefined` for the project's own page, the documentation's overview.
 *
 * @type {ReadonlyArray<readonly [string, string | undefined]>}
 */
const PAGE_LINKS = [
  ["Installation", "installation"],
  ["Documentation", undefined],
  ["Contributing", "contributing"],
  ["Authors", "authors"],
];

/**
 * A 16 by 16 icon for each of `typedoc.json`'s `navigationLinks`, by its
 * label: GitHub's mark, and simple glyphs for npm, LinkedIn and Google
 * Scholar.
 *
 * @type {Readonly<Record<string, string>>}
 */
const LINK_ICONS = {
  GitHub:
    "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z",
  npm: "M1 1h14v14H1zM3.5 3.5v9h4.5v-7h2.5v7h2V3.5z",
  LinkedIn:
    "M1.5 1h13c.28 0 .5.22.5.5v13a.5.5 0 01-.5.5h-13a.5.5 0 01-.5-.5v-13c0-.28.22-.5.5-.5zM3.2 6.2v6.6h2.1V6.2zm1.05-3.3a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4zM6.7 6.2v6.6h2.1V9.5c0-.9.2-1.7 1.3-1.7s1.1 1 1.1 1.8v3.2h2.1V9.2c0-1.8-.4-3.2-2.5-3.2-1 0-1.7.5-2 1.1V6.2z",
  "Google Scholar":
    "M8 1L0 6.5l3 2.05V12c0 1.66 2.24 3 5 3s5-1.34 5-3V8.55L16 6.5zM8 13c-1.66 0-3-.67-3-1.5V9.9l3 2.05 3-2.05v1.6c0 .83-1.34 1.5-3 1.5z",
};

/**
 * The theme button's icon for each value of TypeDoc's theme control: a
 * half-filled circle for the system theme, a sun and a moon, as the theme
 * switch of pythermalcomfort's site shows.
 *
 * @type {Readonly<Record<string, string>>}
 */
const THEME_ICONS = {
  os: "M8 1a7 7 0 100 14A7 7 0 008 1zm0 1.5v11a5.5 5.5 0 010-11z",
  light:
    "M8 11.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM8 0a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0V.75A.75.75 0 018 0zm0 13a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 018 13zM0 8a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5H.75A.75.75 0 010 8zm13 0a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5A.75.75 0 0113 8zM2.34 2.34a.75.75 0 011.06 0l1.06 1.06a.75.75 0 01-1.06 1.06L2.34 3.4a.75.75 0 010-1.06zm9.2 9.2a.75.75 0 011.06 0l1.06 1.06a.75.75 0 01-1.06 1.06l-1.06-1.06a.75.75 0 010-1.06zM2.34 13.66a.75.75 0 010-1.06l1.06-1.06a.75.75 0 011.06 1.06L3.4 13.66a.75.75 0 01-1.06 0zm9.2-9.2a.75.75 0 010-1.06l1.06-1.06a.75.75 0 011.06 1.06l-1.06 1.06a.75.75 0 01-1.06 0z",
  dark: "M8 1a7 7 0 1 0 7 7 5.5 5.5 0 0 1-7-7z",
};

/**
 * An icon drawn in the text's colour, hidden from a screen reader, which
 * reads the name of the link or button around it.
 *
 * @param {string} path
 * @param {Record<string, string>} [props]
 * @returns {JSX.Element}
 */
function icon(path, props = {}) {
  return JSX.createElement(
    "svg",
    {
      viewBox: "0 0 16 16",
      width: "18",
      height: "18",
      "aria-hidden": "true",
      ...props,
    },
    JSX.createElement("path", { d: path, fill: "currentColor" }),
  );
}

/**
 * The label of the header's page link that opens `model`, a document, or
 * `undefined`.
 *
 * @param {Reflection} model
 * @returns {string | undefined}
 */
function ownPageLink(model) {
  if (!model.isDocument()) return undefined;
  const file = documentFile(model);
  return PAGE_LINKS.find(
    ([, linked]) => linked !== undefined && linked === file,
  )?.[0];
}

/**
 * The label of the header link whose section holds the page: a page link's
 * document, or Documentation for every other page but the home page.
 *
 * @param {PageEvent<Reflection>} page
 * @returns {string | undefined}
 */
function headerSection(page) {
  if (page.url === "index.html") return undefined;
  return ownPageLink(page.model) ?? "Documentation";
}

/**
 * The header's page links, the link of the page's section marked `current`.
 * A document that `typedoc.json` does not list fails the docs build.
 *
 * @param {DefaultThemeRenderContext} context
 * @param {string | undefined} linkClass
 * @returns {JSX.Element[]}
 */
function pageLinks(context, linkClass) {
  const page = context.page;
  const section = headerSection(page);
  return PAGE_LINKS.flatMap(([label, file]) => {
    const target =
      file === undefined ? page.project : documentOf(page.project, file);
    if (target === undefined) {
      reportOnce(
        context,
        `The header links the document docs/${file}.md, which typedoc.json's projectDocuments does not list`,
      );
      return [];
    }
    const current = section === label;
    return [
      JSX.createElement(
        "a",
        {
          // `urlTo` gives "" for the page itself.
          href: context.urlTo(target) || context.relativeURL(page.url),
          class:
            [linkClass, current ? "current" : undefined]
              .filter(Boolean)
              .join(" ") || undefined,
          "aria-current": current
            ? target === page.model
              ? "page"
              : "true"
            : undefined,
        },
        label,
      ),
    ];
  });
}

/**
 * `typedoc.json`'s `navigationLinks`, each as its icon from
 * {@link LINK_ICONS}, named for a screen reader by its label, or with the
 * label shown when `withText` is set. A link without an icon fails the docs
 * build.
 *
 * @param {DefaultThemeRenderContext} context
 * @param {{ withText?: boolean, linkClass?: string }} [options]
 * @returns {JSX.Element[]}
 */
function iconLinks(context, { withText = false, linkClass } = {}) {
  return Object.entries(context.options.getValue("navigationLinks")).flatMap(
    ([label, url]) => {
      const path = LINK_ICONS[label];
      if (path === undefined) {
        reportOnce(
          context,
          `typedoc.json's navigationLinks entry "${label}" has no icon in LINK_ICONS in scripts/typedoc-plugin.mjs`,
        );
        return [];
      }
      return [
        JSX.createElement(
          "a",
          withText
            ? { href: url, class: linkClass }
            : {
                href: url,
                class: linkClass,
                "aria-label": label,
                title: label,
              },
          icon(path),
          withText ? label : null,
        ),
      ];
    },
  );
}

/**
 * The theme button and TypeDoc's own theme control, taken from the
 * "Settings" panel that TypeDoc's `settings` template returns and hidden. The
 * button stays hidden until `docs/site.js` finds the control; that script
 * cycles the control's values. `undefined` when the panel holds no `select`,
 * which fails the docs build.
 *
 * @param {DefaultThemeRenderContext} context
 * @param {() => JSX.Element} settings TypeDoc's `settings` template.
 * @returns {JSX.Element | undefined}
 */
function themeButton(context, settings) {
  const control = editMarkup(context, "settings", () =>
    expectElement(
      settings(),
      (element) => element.tag === "select",
      "the theme control (a select element)",
    ),
  );
  if (control === undefined) return undefined;
  control.props = { ...control.props, hidden: true };
  return JSX.createElement(
    "div",
    { class: "site-theme" },
    JSX.createElement(
      "button",
      {
        type: "button",
        class: "tsd-widget site-theme-button",
        hidden: true,
        "aria-label": "Theme",
      },
      Object.entries(THEME_ICONS).map(([value, path]) =>
        icon(path, { class: "site-theme-icon", "data-theme-value": value }),
      ),
    ),
    control,
  );
}

/**
 * The site's header, edited from what TypeDoc's `toolbar` template returns:
 * the site's name; the version, which opens the changelog; the page links;
 * search; the theme button; and `navigationLinks` as icons. At phone width
 * TypeDoc's style sheet hides `#tsd-toolbar-links` and shows the menu
 * button, and the page and icon links are in the menu (`menuLinks`).
 *
 * @param {DefaultThemeRenderContext} context
 * @param {JSX.Element} markup
 * @param {PageEvent<Reflection>} props
 * @param {() => JSX.Element} settings TypeDoc's `settings` template.
 * @returns {JSX.Element}
 */
function siteHeader(context, markup, props, settings) {
  const contents = expectElement(
    markup,
    withClass("tsd-toolbar-contents"),
    "the element of class tsd-toolbar-contents",
  );
  const title = expectElement(
    contents.children,
    withClass("title"),
    "the site's name, of class title",
  );
  const links = expectElement(
    contents.children,
    withId("tsd-toolbar-links"),
    "the element of id tsd-toolbar-links",
  );
  const search = ["tsd-search-trigger", "tsd-search"].map((id) =>
    expectElement(contents.children, withId(id), `the element of id ${id}`),
  );
  const menu = expectElement(
    contents.children,
    withId("tsd-toolbar-menu-trigger"),
    "the element of id tsd-toolbar-menu-trigger",
  );
  const project = props.project;
  const changelog = documentOf(project, "changelog");
  if (changelog === undefined)
    reportOnce(
      context,
      `The header's version links the document docs/changelog.md, which typedoc.json's projectDocuments does not list`,
    );
  title.children = [project.name];
  links.children = iconLinks(context);
  contents.children = [
    title,
    project.packageVersion && changelog
      ? JSX.createElement(
          "a",
          {
            href: context.urlTo(changelog) || context.relativeURL(props.url),
            class: "site-version",
            title: "Changelog",
          },
          project.packageVersion,
        )
      : null,
    JSX.createElement(
      "nav",
      { class: "site-pages", "aria-label": "Site" },
      pageLinks(context, undefined),
    ),
    ...search,
    themeButton(context, settings) ?? null,
    links,
    menu,
  ];
  return markup;
}

/**
 * The left column, edited from what TypeDoc's `navigation` template returns:
 * the list that TypeDoc's `main.js` fills, `#tsd-nav-container`, without the
 * link to the project's page above it, since the header's site name links the
 * home page.
 *
 * @param {JSX.Element} markup
 * @returns {JSX.Element}
 */
function leftColumn(markup) {
  const list = expectElement(
    markup,
    withId("tsd-nav-container"),
    "the element of id tsd-nav-container",
  );
  if (!markup.children.includes(list))
    throw new UnexpectedMarkup(
      "the element of id tsd-nav-container, as a child of the navigation,",
    );
  markup.children = [list];
  return markup;
}

/**
 * Whether the page shows the left column on a wide screen: every page but the
 * home page and the header's other pages, as on pythermalcomfort's site
 * (`installation.html` and `authors.html`, checked 2026-11-20). A page
 * without it carries `<meta name="site-layout" content="no-left-column">`,
 * which `docs/custom.css` reads.
 *
 * @param {PageEvent<Reflection>} page
 * @returns {boolean}
 */
function hasLeftColumn(page) {
  return page.url !== "index.html" && ownPageLink(page.model) === undefined;
}

/**
 * The page's title, edited from what TypeDoc's `header` template returns: a
 * reflection's title loses the kind word TypeDoc puts before its name
 * ("Function pmv_ppd_iso"), and the documentation's overview is titled
 * "Documentation" in place of the project's name. The project's and a
 * document's titles carry no kind word.
 *
 * @param {JSX.Element} markup
 * @param {PageEvent<Reflection>} props
 * @returns {JSX.Element}
 */
function pageTitle(markup, props) {
  const model = props.model;
  if (!isOverview(props) && (model.isProject() || model.isDocument()))
    return markup;
  const title = expectElement(
    markup,
    (element) => element.tag === "h1",
    "the page's title, an h1 element",
  );
  if (isOverview(props)) {
    title.children = ["Documentation"];
    return markup;
  }
  const kind = `${ReflectionKind.singularString(model.kind)} `;
  if (title.children[0] !== kind)
    throw new UnexpectedMarkup(
      `the kind word "${kind.trim()}" at the start of the page's title`,
    );
  title.children = title.children.slice(1);
  return markup;
}

/**
 * The menu's links at phone width, in place of TypeDoc's `sidebarLinks`
 * template: the header's page links, then `navigationLinks` with their icons
 * and labels. TypeDoc's style sheet shows a `.tsd-navigation .tsd-nav-link`
 * at phone width only.
 *
 * @param {DefaultThemeRenderContext} context
 * @returns {JSX.Element}
 */
function menuLinks(context) {
  return JSX.createElement(
    "nav",
    {
      id: "tsd-sidebar-links",
      class: "tsd-navigation site-menu-links",
      "aria-label": "Site",
    },
    pageLinks(context, "tsd-nav-link"),
    iconLinks(context, { withText: true, linkClass: "tsd-nav-link" }),
  );
}

/**
 * The default theme's partials, with a categorized module's page as one list,
 * a module's page ending in its shared section, a shared type's header
 * naming its kind, a function's page listing its sections under "On This
 * Page", the site's header with the theme button in place of the
 * "Settings" panel, page titles without a kind word, the left column
 * without the project's link, and the project's page as the documentation's
 * overview, titled "Documentation" in its heading and its browser tab.
 */
class SiteRenderContext extends DefaultThemeRenderContext {
  /** @param {ConstructorParameters<typeof DefaultThemeRenderContext>} args */
  constructor(...args) {
    super(...args);
    const moduleReflection = this.moduleReflection;
    this.moduleReflection = (
      /** @type {DeclarationReflection | ProjectReflection} */ module,
    ) =>
      module.isProject()
        ? overview(this, module)
        : JSX.createElement(
            JSX.Fragment,
            null,
            isCategorized(module)
              ? categorizedList(this, module)
              : moduleReflection(module),
            sharedSection(this, module),
          );
    const memberDeclaration = this.memberDeclaration;
    this.memberDeclaration = (/** @type {DeclarationReflection} */ props) => {
      if (!isSharedType(props)) return memberDeclaration(props);
      // The default partial's content (TypeDoc 0.28), with typeHeader's
      // header; no shared type has type parameters.
      return JSX.createElement(
        JSX.Fragment,
        null,
        typeHeader(this, props),
        this.commentSummary(props),
        props.type ? this.typeDeclaration(props, props.type) : null,
        this.commentTags(props),
        this.memberSources(props),
      );
    };
    const memberSignatureBody = this.memberSignatureBody;
    this.memberSignatureBody = (
      /** @type {SignatureReflection} */ props,
      /** @type {{ hideSources?: boolean } | undefined} */ options,
    ) => {
      const headings = this.page.pageHeadings;
      const start = headings.length;
      const body = memberSignatureBody(props, options);
      if (
        props.parent !== this.model ||
        !this.model.kindOf(ReflectionKind.Function)
      )
        return body;
      // A function's table of contents lists its sections only, not the
      // headings in a comment's text, such as a constant's under Model info.
      const sections = editMarkup(this, "memberSignatureBody", () =>
        sectionHeadings(this, body),
      );
      if (sections) headings.splice(start, Infinity, ...sections);
      return body;
    };
    // The theme control moves from the "Settings" panel into the header, and
    // the panel goes; "On this page" stays in the right column.
    const settings = this.settings;
    this.settings = () => JSX.createElement(JSX.Fragment, null);
    /** @type {DefaultThemeRenderContext["toolbar"]} */
    const toolbar = wrapTemplate(
      this,
      "toolbar",
      this.toolbar,
      (markup, props) => siteHeader(this, markup, props, settings),
    );
    this.toolbar = toolbar;
    this.sidebarLinks = () => menuLinks(this);
    /** @type {DefaultThemeRenderContext["header"]} */
    const header = wrapTemplate(this, "header", this.header, pageTitle);
    this.header = header;
    /** @type {DefaultThemeRenderContext["navigation"]} */
    const navigation = wrapTemplate(
      this,
      "navigation",
      this.navigation,
      leftColumn,
    );
    this.navigation = navigation;
    /** @type {DefaultThemeRenderContext["defaultLayout"]} */
    const defaultLayout = wrapTemplate(
      this,
      "defaultLayout",
      this.defaultLayout,
      overviewTab,
    );
    this.defaultLayout = defaultLayout;
  }
}

/**
 * The navigation's entries without those for a reflection that has no page,
 * whose URL holds an anchor on another page. TypeDoc 0.28 lists such a
 * module child too: without this, the navigation held an entry for each of
 * the 17 shared types (ticket 41 in `.scratch/v2-release-checks/issues/`).
 *
 * @param {NavigationElement[]} elements
 * @returns {NavigationElement[]}
 */
function pagesOnly(elements) {
  return elements
    .filter((element) => !element.path?.includes("#"))
    .map((element) =>
      element.children === undefined
        ? element
        : { ...element, children: pagesOnly(element.children) },
    );
}

/**
 * The left column's groups, each a label and its entries in pythermalcomfort's
 * order (`docs/documentation/index.rst` at v4.8.1, which also lists `plots`
 * and `met`, with no counterpart here): a module by its name, the subpath a
 * program imports it from, then a hand-written page by its file (as
 * {@link documentFile} names it). The migration guide and the deviation
 * registers, which upstream lacks, close the list. The header's pages are not
 * listed.
 *
 * @type {ReadonlyArray<readonly [string, readonly string[]]>}
 */
const NAVIGATION_GROUPS = [
  [
    "Modules",
    ["models", "utilities", "environment", "psychrometrics", "clothing"],
  ],
  [
    "Guides and notes",
    [
      "surveys",
      "references",
      "examples",
      "changelog",
      "migration-v2",
      "deviations/README",
    ],
  ],
];

/**
 * The navigation's entries without a kind, so that TypeDoc's `main.js` draws
 * no kind icon beside them (TypeDoc 0.28.20 draws one only for an entry with a
 * `kind`).
 *
 * @param {NavigationElement[]} elements
 * @returns {NavigationElement[]}
 */
function withoutKinds(elements) {
  return elements.map(({ kind, icon, children, ...element }) =>
    children === undefined
      ? element
      : { ...element, children: withoutKinds(children) },
  );
}

/**
 * The left column: each group of {@link NAVIGATION_GROUPS} as an entry with
 * its label and neither a link nor children, which TypeDoc's `main.js` draws
 * as a plain `span` (TypeDoc 0.28.20), then the group's modules and pages; a
 * page is listed by its name, which is its `title`. A module or a page that
 * no group lists, or an entry of a group that the project lacks, fails the
 * docs build.
 *
 * @param {DefaultTheme} theme
 * @param {ProjectReflection} project
 * @param {NavigationElement[]} elements TypeDoc's navigation.
 * @returns {NavigationElement[]}
 */
function siteNavigation(theme, project, elements) {
  const error = (/** @type {string} */ message) =>
    theme.application.logger.error(`The left column: ${message}`);
  /** @type {Map<string, string>} */
  const keyOfPath = new Map();
  for (const child of project.children ?? [])
    if (child.kindOf(ReflectionKind.Module))
      keyOfPath.set(theme.router.getFullUrl(child), child.name);
  for (const doc of project.documents ?? []) {
    const file = documentFile(doc);
    if (file !== undefined) keyOfPath.set(theme.router.getFullUrl(doc), file);
  }
  const headerPages = new Set(PAGE_LINKS.map(([, file]) => file));
  /** @type {Map<string, NavigationElement>} */
  const byKey = new Map();
  for (const element of elements) {
    const key =
      element.path === undefined ? undefined : keyOfPath.get(element.path);
    if (key === undefined || !headerPages.has(key))
      byKey.set(key ?? element.text, element);
  }
  /** @type {NavigationElement[]} */
  const column = [];
  for (const [label, keys] of NAVIGATION_GROUPS) {
    column.push({ text: label });
    for (const key of keys) {
      const element = byKey.get(key);
      if (element === undefined)
        error(`"${label}" lists ${key}, which the project does not have`);
      else column.push(element);
      byKey.delete(key);
    }
  }
  for (const key of byKey.keys())
    error(
      `${key} is in no group of NAVIGATION_GROUPS in scripts/typedoc-plugin.mjs`,
    );
  return withoutKinds(column);
}

/** The default theme with the site's partials and navigation. */
class SiteTheme extends DefaultTheme {
  /** @param {ProjectReflection} project */
  buildNavigation(project) {
    return siteNavigation(
      this,
      project,
      pagesOnly(super.buildNavigation(project)),
    );
  }

  /** @param {PageEvent<Reflection>} pageEvent */
  getRenderContext(pageEvent) {
    return new SiteRenderContext(
      this.router,
      this,
      pageEvent,
      this.application.options,
    );
  }
}

/**
 * The site's two typefaces, each a `@fontsource` package (OFL-1.1) among the
 * development dependencies, with the styles `docs/custom.css` uses: a style
 * is the package's CSS file of that name, `400.css` or `400-italic.css`.
 *
 * @type {ReadonlyArray<readonly [string, readonly string[]]>}
 */
const FONTS = [
  ["@fontsource/atkinson-hyperlegible-next", ["400", "400-italic", "700"]],
  ["@fontsource/ibm-plex-mono", ["400", "400-italic", "500", "600"]],
];

/** Where the site keeps its fonts, and the stylesheet that names them. */
const FONTS_DIR = "assets/fonts";
const FONTS_CSS = `${FONTS_DIR}/fonts.css`;

/**
 * Copies {@link FONTS} into the built site, so that no page asks another host
 * for a font: each package's font files and `LICENSE` go to
 * `assets/fonts/<family>/`, and its styles' `@font-face` rules, as the package
 * writes them with their font files' paths changed to that folder, go to
 * `assets/fonts/fonts.css`, which every page links. A package, a style or a
 * font file that is missing, or a rule naming its file otherwise than
 * `./files/<name>`, fails the docs build.
 *
 * @param {Application} app
 * @param {string} out The site's directory.
 */
function copyFonts(app, out) {
  const css = [];
  for (const [pkg, styles] of FONTS) {
    const family = pkg.slice(pkg.indexOf("/") + 1);
    let root;
    try {
      root = dirname(fileURLToPath(import.meta.resolve(`${pkg}/LICENSE`)));
    } catch {
      app.logger.error(
        `The fonts: ${pkg}, which FONTS in scripts/typedoc-plugin.mjs names, is not installed`,
      );
      continue;
    }
    const dir = join(out, FONTS_DIR, family);
    mkdirSync(dir, { recursive: true });
    copyFileSync(join(root, "LICENSE"), join(dir, "LICENSE"));
    for (const style of styles) {
      const source = join(root, `${style}.css`);
      if (!existsSync(source)) {
        app.logger.error(
          `The fonts: ${pkg} has no style ${style} (${style}.css), which FONTS in scripts/typedoc-plugin.mjs names`,
        );
        continue;
      }
      /** @type {string[]} */
      const missing = [];
      const rules = readFileSync(source, "utf8").replace(
        /url\(([^)]*)\)/g,
        (whole, /** @type {string} */ url) => {
          const name = /^\.\/files\/([\w.-]+)$/.exec(url)?.[1];
          if (name === undefined || !existsSync(join(root, "files", name))) {
            missing.push(url);
            return whole;
          }
          copyFileSync(join(root, "files", name), join(dir, name));
          return `url(./${family}/${name})`;
        },
      );
      if (missing.length > 0)
        app.logger.error(
          `The fonts: ${pkg}/${style}.css names ${missing.length} font files that are not in the package's files folder, first ${missing[0]}`,
        );
      css.push(`/* ${pkg}/${style}.css */\n${rules.trim()}\n`);
    }
  }
  writeFileSync(join(out, FONTS_CSS), css.join("\n"));
}

/** @param {Application} app */
export async function load(app) {
  app.renderer.defineRouter("jsthermalcomfort", SiteRouter);
  app.renderer.defineTheme("jsthermalcomfort", SiteTheme);
  const exportsByModule = await packageExports();
  app.internationalization.addTranslations("en", {
    tag_modelInfo: "Model info",
  });
  app.renderer.hooks.on("head.end", (context) =>
    JSX.createElement(
      JSX.Fragment,
      null,
      JSX.createElement("link", {
        rel: "stylesheet",
        href: context.relativeURL(FONTS_CSS),
      }),
      hasLeftColumn(context.page)
        ? null
        : JSX.createElement("meta", {
            name: "site-layout",
            content: "no-left-column",
          }),
    ),
  );
  app.renderer.on(RendererEvent.END, (event) =>
    copyFonts(app, event.outputDirectory),
  );
  app.converter.on(Converter.EVENT_BEGIN, (context) => {
    for (const name of hiddenTypeNames(context.programs))
      context.inlineType.add(name);
  });
  app.converter.on(Converter.EVENT_RESOLVE_BEGIN, (context) => {
    placeModelInfo(app, context.project, exportsByModule);
    checkDocumentTitles(app, context.project);
  });
  // In TypeDoc 0.28, after GroupPlugin (-100), which sorts every reflection's
  // children, and before LinkResolverPlugin (-300), which resolves the links
  // in the moved descriptions.
  app.converter.on(
    Converter.EVENT_RESOLVE_END,
    (context) => {
      for (const fn of context.project.getReflectionsByKind(
        ReflectionKind.Function,
      ))
        if (fn.isDeclaration()) joinReturnsToOutputs(app, fn);
      ungroupShared(context.project);
    },
    -150,
  );
  // In TypeDoc 0.28, after CategoryPlugin (-200), which sets a module's
  // categories.
  app.converter.on(
    Converter.EVENT_RESOLVE_END,
    (context) => listInExportOrder(app, context.project),
    -250,
  );
}
