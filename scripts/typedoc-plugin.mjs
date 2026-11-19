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
 */
import { Comment, Converter, ReflectionKind } from "typedoc";
import ts from "typescript";

/**
 * @import { Application, CommentDisplayPart, CommentTag, DeclarationReflection, SomeType } from "typedoc"
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
 * Splits the content of a `@returns` tag into the text before its list and
 * the parts of each `- ` item.
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
      if (i > 0) items.push([]);
      const text = i > 0 ? piece.slice(2) : piece;
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
      object.children?.sort(
        (a, b) => rank(order, a.name) - rank(order, b.name),
      );
    }
    tag.content = head;
  }
}

/**
 * A name's place in the list, with names it does not hold after the rest.
 *
 * @param {readonly (string | undefined)[]} order
 * @param {string} name
 * @returns {number}
 */
function rank(order, name) {
  const index = order.indexOf(name);
  return index === -1 ? order.length : index;
}

/** @param {Application} app */
export function load(app) {
  app.converter.on(Converter.EVENT_BEGIN, (context) => {
    for (const name of hiddenTypeNames(context.programs))
      context.inlineType.add(name);
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
    },
    -150,
  );
}
