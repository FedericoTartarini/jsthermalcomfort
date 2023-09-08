import fs from "fs/promises";
import path from "path";
import template from "lodash/template.js";
import GithubSlugger from "github-slugger";
import { util } from "documentation";
import hljs from "highlight.js";
import { fileURLToPath } from "url";

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
        name = par.type.expression.name;
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
    if (javascriptTypes.has(posType.toLowerCase())) continue;
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

function getNameInQuotes(entry, description) {
  const secondIndex = description.slice(1).indexOf('"');
  if (description.indexOf('"') !== 0 || secondIndex === -1) {
    console.error(
      `Failed while trying to fix property with space for property in ${entry.name} at ${entry.context.file}`,
    );
    console.error(`Prop with description of ${description}`);
    process.exit(1);
  }
  // include quotes and secondIndex will be one off due to slicing in above line
  return description.slice(0, secondIndex + 2);
}

function getPropertyDescription(description) {
  const startOfDescription = description.indexOf("- ");
  if (startOfDescription < 0) return "";
  return description.slice(startOfDescription + 2);
}

function tryFixPropertiesWithSpaces(entry) {
  if (entry.properties === undefined) return;
  for (let property of entry.properties) {
    if (property.name !== "null") continue;
    const description = property.description.children[0].children[0].value;
    const propertyName = getNameInQuotes(entry, description);
    const propertyDescription = getPropertyDescription(description);
    property.name = propertyName;
    property.description.children[0].children[0].value = propertyDescription;
  }
}

function walkComments(entry) {
  tryInjectDocname(entry);
  tryInjectDependentTypes(entry);
  tryFixPropertiesWithSpaces(entry);
  if (entry.members.static.length === 0) return;
  for (const member of entry.members.static) {
    walkComments(member);
  }
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
      isType,
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
