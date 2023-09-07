import fs from "fs/promises";
import path from "path";
import template from "lodash/template.js";
import GithubSlugger from "github-slugger";
import { util } from "documentation";
import hljs from "highlight.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function injectDocnames(entry) {
  tryInjectDocname(entry);
  if (entry.members.static.length === 0) return;
  for (const member of entry.members.static) {
    injectDocnames(member);
  }
}

let topLevelTitles = new Set();

export default async function (comments, config) {
  var linkerStack = new LinkerStack(config).namespaceResolver(
    comments,
    function (namespace) {
      return "#" + getSlug(namespace);
    },
  );

  for (let comment of comments) {
    injectDocnames(comment);
  }

  for (const toplevel of comments) {
    topLevelTitles.add(toplevel.name);
  }

  var formatters = createFormatters(linkerStack.link);

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
        return formatters.markdown(ast);
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
    await fs.readFile(path.join(__dirname, "section_list._"), "utf8"),
    sharedImports,
  );
  sharedImports.imports.renderSection = template(
    await fs.readFile(path.join(__dirname, "section._"), "utf8"),
    sharedImports,
  );
  sharedImports.imports.renderNote = template(
    await fs.readFile(path.join(__dirname, "note._"), "utf8"),
    sharedImports,
  );
  sharedImports.imports.renderParamProperty = template(
    await fs.readFile(path.join(__dirname, "paramProperty._"), "utf8"),
    sharedImports,
  );

  var pageTemplate = template(
    await fs.readFile(path.join(__dirname, "index._"), "utf8"),
    sharedImports,
  );

  const string = pageTemplate({ docs: comments, config });

  if (!config.output) {
    return string;
  }

  await copyDir(__dirname + "/assets/", config.output + "/assets/");
  await fs.writeFile(config.output + "/index.html", string, "utf8");
}