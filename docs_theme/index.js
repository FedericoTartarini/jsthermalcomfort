import fs from "fs/promises";
import path from "path";
import template from "lodash/template.js";
import GithubSlugger from "github-slugger";
import { util } from "documentation";
import hljs from "highlight.js";
import { fileURLToPath } from "url";
import { remark } from "remark";
import _rerouteLinks from "documentation/src/output/util/reroute_links.js";
import highlighter from "documentation/src/output/highlighter.js";
import html from "remark-html";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const javascriptTypes = new Set([
  "string",
  "number",
  "boolean",
  "null",
  "undefined",
  "symbol",
  "bigint",
  "object",
  "t", // templates
]);

function createCustomMarkdownFormatter(getHref) {
  const rerouteLinks = _rerouteLinks.bind(undefined, getHref);
  return (ast) => {
    if (ast) {
      return remark()
        .use(html, { sanitize: false })
        .stringify(highlighter(rerouteLinks(ast)));
    }
    return "";
  }
}

const { LinkerStack, createFormatters } = util;

async function copyDir(sorce, dest) {
  await fs.mkdir(dest, { recursive: true });
  let entries = await fs.readdir(sorce, { withFileTypes: true });

  for (let entry of entries) {
    let srcPath = path.join(sorce, entry.name);
    let destPath = path.join(dest, entry.name);

    entry.isDirectory()
      ? await copyDir(srcPath, destPath)
      : await fs.copyFile(srcPath, destPath);
  }
}

function isType(section) {
  if (section.type === undefined) return false;
  return section.type.type === "NameExpression";
}

function isFunction(section) {
  return (
    section.kind === "function" ||
    (section.kind === "typedef" &&
      section.type &&
      section.type.type === "NameExpression" &&
      section.type.name === "Function")
  );
}

const slugger = new GithubSlugger();
const slugs = {};

function getSlug(str) {
  if (slugs[str] === undefined) {
    slugs[str] = slugger.slug(str);
  }
  return slugs[str];
}

function getDocname(prefix, section, formatters) {
  if (!section.docname) {
    return (
      prefix +
      section.name +
      (formatters ? formatters.parameters(section, true) : "")
    );
  }
  return section.docname;
}

function tryInjectDocname(entry) {
  if (entry.tags === undefined || entry.tags.length === 0) return;
  for (const tag of entry.tags) {
    if (tag.title === "docname") {
      entry.docname = tag.description;
      return;
    }
  }
}

function tryInjectDependentTypes(entry) {
  let entryTypes = [];
  let possibleTypes = [];
  // parameter types
  if (entry.params !== undefined) {
    for (const par of entry.params) {
      if (par.type === undefined) continue;
      let name;
      if (par.type.type === "NameExpression") {
        name = par.type.name;
      } else if (par.type.type === "OptionalType") {
        // kind of suss that we just assume it will be a "NameExpression" but
        // I am fine with this, if we ever hit the case where we need more
        // than this then we can add more complete handling (recurssion)
        if (par.type.expression.type === "NameExpression") {
          name = par.type.expression.name;
        }
      } else {
        continue;
      }
      possibleTypes.push(name);
    }
  }
  // return types
  if (entry.returns !== undefined) {
    for (const ret of entry.returns) {
      if (ret.type === undefined) continue;
      let name;
      if (ret.type.type === "NameExpression") {
        name = ret.type.name;
      } else if (ret.type.type === "TypeApplication") {
        name = ret.type.applications[0].name;
      } else {
        continue;
      }
      possibleTypes.push(name);
    }
  }

  for (const posType of possibleTypes) {
    if (posType === undefined || javascriptTypes.has(posType.toLowerCase()))
      continue;
    const entryType = types.get(posType);
    if (entryType === undefined) {
      console.error(
        `Public function ${entry.name} in ${entry.context.file} uses type ${posType} but it is not included in the documentation`,
      );
      console.error(`Consider making ${posType} public with @public`);
      process.exit(1);
    }
    if (!entryType.rendered) {
      entryTypes.push(entryType.type);
      entryType.rendered = true;
    }
  }
  if (entryTypes.length > 0) entry.types = entryTypes;
}

function walkComments(entry) {
  tryInjectDocname(entry);
  tryInjectDependentTypes(entry);
  if (entry.members.static.length === 0) return;
  for (const member of entry.members.static) {
    walkComments(member);
  }
}

/**
 * @param {string} refText
 * @returns {string}
 */
function getReferenceId(refText) {
  const second = refText.indexOf("]");
  if (refText.indexOf("[") !== 0 || second <= 1) {
    console.error(`Missing [ or ] for reference with text: ${refText}`);
    process.exit(1);
  }
  return `ref_${refText.slice(1, second)}`;
}

function setUpReferencesWithId(referencesEntry) {
  for (let reference of referencesEntry.description.children) {
    reference.id = getReferenceId(reference.children[0].value);
  }
}

function isReferenceSection(entry) {
  return entry.kind === "note" && entry.name === "References";
}

let topLevelTitles = new Set();
let types = new Map();

export default async function (comments, config) {
  var linkerStack = new LinkerStack(config).namespaceResolver(
    comments,
    function (namespace) {
      return "#" + getSlug(namespace);
    },
  );

  for (const toplevel of comments) {
    if (isType(toplevel)) {
      if (types.has(toplevel.name)) {
        console.error(
          `Type with name ${toplevel.name} defined in multiple places. Please use unique type names for better docs support`,
        );
        console.error(`Type defined at: ${toplevel.context.file}`);
        console.error(`  at line: ${toplevel.context.loc.start.line}`);
        process.exit(1);
      }
      types.set(toplevel.name, {
        type: toplevel,
        rendered: false,
      });
    } else {
      topLevelTitles.add(toplevel.name);
    }
  }

  for (let comment of comments) {
    walkComments(comment);
    if (isReferenceSection(comment)) {
      setUpReferencesWithId(comment);
    }
  }

  var formatters = createFormatters(linkerStack.link);
  var customMarkdown = createCustomMarkdownFormatter(linkerStack.link);

  hljs.configure(config.hljs || {});

  var sharedImports = {
    imports: {
      slug(str) {
        return getSlug(str);
      },
      shortSignature(section) {
        var prefix = "";
        if (section.kind === "class") {
          prefix = "new ";
        } else if (!isFunction(section)) {
          return getDocname("", section, undefined);
        }
        return getDocname(prefix, section, formatters);
      },
      signature(section) {
        var returns = "";
        var prefix = "";
        if (section.kind === "class") {
          prefix = "new ";
        } else if (!isFunction(section)) {
          return getDocname("", section, undefined);
        }
        if (section.returns.length) {
          returns = ": " + formatters.type(section.returns[0].type);
        }
        return prefix + section.name + formatters.parameters(section) + returns;
      },
      isFunction,
      isType,
      isReferenceSection,
      md(ast, inline, related) {
        if (related) {
          ast.children[0].children[0].url =
            "#" + ast.children[0].children[0].url;
        }
        if (
          inline &&
          ast &&
          ast.children.length &&
          ast.children[0].type === "paragraph"
        ) {
          ast = {
            type: "root",
            children: ast.children[0].children.concat(ast.children.slice(1)),
          };
        }
        return customMarkdown(ast);
      },
      isTopLevel(section) {
        return topLevelTitles.has(section.name);
      },
      formatType: formatters.type,
      autolink: formatters.autolink,
      highlight(example) {
        if (config.hljs && config.hljs.highlightAuto) {
          return hljs.highlightAuto(example).value;
        }
        return hljs.highlight(example, { language: "js" }).value;
      },
    },
  };

  sharedImports.imports.renderSectionList = template(
    await fs.readFile(path.join(__dirname, "section_list.ejs"), "utf8"),
    sharedImports,
  );
  sharedImports.imports.renderSection = template(
    await fs.readFile(path.join(__dirname, "section.ejs"), "utf8"),
    sharedImports,
  );
  sharedImports.imports.renderNote = template(
    await fs.readFile(path.join(__dirname, "note.ejs"), "utf8"),
    sharedImports,
  );
  sharedImports.imports.renderParamProperty = template(
    await fs.readFile(path.join(__dirname, "paramProperty.ejs"), "utf8"),
    sharedImports,
  );

  var pageTemplate = template(
    await fs.readFile(path.join(__dirname, "index.ejs"), "utf8"),
    sharedImports,
  );

  const string = pageTemplate({ docs: comments, config });

  if (!config.output) {
    return string;
  }

  await copyDir(__dirname + "/assets/", config.output + "/assets/");
  await fs.writeFile(config.output + "/index.html", string, "utf8");
}
