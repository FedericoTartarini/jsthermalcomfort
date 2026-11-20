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
 */
import { readFileSync } from "node:fs";
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
  ReflectionKind,
  ReflectionSymbolId,
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

/** Gives a shared type no page, so it is written out on its module's page. */
class SiteRouter extends KindRouter {
  /** @param {Reflection} target */
  getPageKind(target) {
    return isSharedType(target) ? undefined : super.getPageKind(target);
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
  const anchor = context.slugger.slug(title);
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
 * The section headings of a signature's body, in the page's order: each `h4`
 * outside a list, which leaves out the headings of a parameter's or an
 * output's own comment. A heading without an id, such as Parameters or
 * Returns, gets the id and the permalink that the theme gives a block tag's
 * heading. A heading that repeats the one before it, as a second `@throws`
 * tag's does, is not listed again.
 *
 * Logs an error for a heading that starts with no text, as one would after a
 * TypeDoc upgrade that changes the theme's markup.
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
    if (typeof text !== "string" || text.trim() === "") {
      context.theme.application.logger.error(
        `${context.model.getFullName()}: a section heading has no text, so the page's table of contents cannot name it`,
      );
      return headings;
    }
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
 * The default theme's partials, with a categorized module's page as one list,
 * a module's page ending in its shared section, a shared type's header
 * naming its kind, and a function's page
 * listing its sections under "On This Page".
 */
class SiteRenderContext extends DefaultThemeRenderContext {
  /** @param {ConstructorParameters<typeof DefaultThemeRenderContext>} args */
  constructor(...args) {
    super(...args);
    const moduleReflection = this.moduleReflection;
    this.moduleReflection = (
      /** @type {DeclarationReflection | ProjectReflection} */ module,
    ) =>
      JSX.createElement(
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
      headings.splice(start, Infinity, ...sectionHeadings(this, body));
      return body;
    };
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

/** The default theme with the site's partials and navigation. */
class SiteTheme extends DefaultTheme {
  /** @param {ProjectReflection} project */
  buildNavigation(project) {
    return pagesOnly(super.buildNavigation(project));
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

/** @param {Application} app */
export async function load(app) {
  app.renderer.defineRouter("jsthermalcomfort", SiteRouter);
  app.renderer.defineTheme("jsthermalcomfort", SiteTheme);
  const exportsByModule = await packageExports();
  app.internationalization.addTranslations("en", {
    tag_modelInfo: "Model info",
  });
  app.converter.on(Converter.EVENT_BEGIN, (context) => {
    for (const name of hiddenTypeNames(context.programs))
      context.inlineType.add(name);
  });
  app.converter.on(Converter.EVENT_RESOLVE_BEGIN, (context) =>
    placeModelInfo(app, context.project, exportsByModule),
  );
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
