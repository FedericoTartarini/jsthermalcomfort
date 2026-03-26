/**
 * JSDoc Theme for jsthermalcomfort
 *
 * This file handles the generation of the documentation site using documentation.js.
 * It partitions JSDoc comments into logical sections (Models, Psychrometrics, Utilities),
 * maps internal function names to display titles, and renders EJS templates into HTML pages.
 */

import fs from "fs/promises";
import path from "path";
import lodash from "lodash";
const { template } = lodash;
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

/**
 * Standard JavaScript types that shouldn't be linked to custom documentation pages.
 */
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

/**
 * Creates a custom markdown formatter for documentation.js.
 */
function createCustomMarkdownFormatter(getHref) {
  const rerouteLinks = _rerouteLinks.bind(undefined, getHref);
  return (ast) => {
    if (ast) {
      return remark()
        .use(html, { sanitize: false })
        .stringify(highlighter(rerouteLinks(ast)));
    }
    return "";
  };
}

const { LinkerStack, createFormatters } = util;

/**
 * Recursively copies a directory.
 */
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

/**
 * Checks if a section represents a Type definition.
 */
function isType(section) {
  if (section.type === undefined) return false;
  return section.type.type === "NameExpression";
}

/**
 * Checks if a section represents a Function.
 */
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

/**
 * Generates a unique slug for a string.
 */
function getSlug(str) {
  if (slugs[str] === undefined) {
    slugs[str] = slugger.slug(str);
  }
  return slugs[str];
}

/**
 * Display Name Mapping
 *
 * IMPORTANT: If you add a new model or function to the project, you MUST add its
 * internal name and desired display title to this dictionary to ensure it appears
 * correctly in the Documentation and Table of Contents.
 */
const displayNameMap = {
  // Models
  heat_index: "Heat Index (HI)",
  phs: "Predicted Heat Strain (PHS)",
  humidex: "Humidex",
  net: "Normal Effective Temperature (NET)",
  wbgt: "Wet Bulb Globe Temperature (WBGT)",
  discomfort_index: "Discomfort Index (DI)",
  discomfort_index_array: "Discomfort Index — Array (DI)",
  two_nodes: "Two-Node Model (Gagge)",
  two_nodes_array: "Two-Node Model — Array",
  set_tmp: "Standard Effective Temperature (SET)",
  set_tmp_array: "Standard Effective Temperature — Array",
  wc: "Wind Chill Index (WCI)",
  adaptive_en: "Adaptive EN-16798",
  adaptive_en_array: "Adaptive EN-16798 — Array",
  at: "Apparent Temperature (AT)",
  pmv_ppd: "PMV-PPD Model",
  pmv_ppd_array: "PMV-PPD — Array",
  adaptive_ashrae: "Adaptive ASHRAE-55",
  adaptive_ashrae_array: "Adaptive ASHRAE-55 — Array",
  solar_gain: "Solar Gain (MRT Delta)",
  cooling_effect: "Cooling Effect (CE)",
  athb: "Adaptive Thermal Heat Balance (ATHB)",
  athb_array: "Adaptive Thermal Heat Balance — Array",
  pmv: "Predicted Mean Vote (PMV)",
  pmv_array: "Predicted Mean Vote — Array",
  a_pmv: "Adjusted PMV (aPMV)",
  a_pmv_array: "Adjusted PMV — Array",
  ankle_draft: "Ankle Draft",
  e_pmv: "Extended PMV (ePMV)",
  e_pmv_array: "Extended PMV — Array",
  vertical_tmp_grad_ppd: "Vertical Temperature Gradient PPD",
  use_fans_heatwaves: "Use of Fans During Heatwaves",
  clo_tout: "Clothing Insulation (Tout)",
  clo_tout_array: "Clothing Insulation (Tout) — Array",
  utci: "Universal Thermal Climate Index (UTCI)",
  utci_array: "Universal Thermal Climate Index — Array",
  pet_steady: "Physiological Equivalent Temperature (PET)",
  JOS3: "JOS-3 Thermoregulation Model",
  // Psychrometrics
  p_sat: "Saturation Vapor Pressure (p_sat)",
  p_sat_torr: "Saturation Vapor Pressure in Torr",
  p_sat_torr_array: "Saturation Vapor Pressure in Torr — Array",
  t_o: "Operative Temperature (t_o)",
  t_o_array: "Operative Temperature — Array",
  enthalpy: "Enthalpy",
  t_wb: "Wet Bulb Temperature (t_wb)",
  t_mrt: "Mean Radiant Temperature (t_mrt)",
  t_mrt_array: "Mean Radiant Temperature — Array",
  psy_ta_rh: "Psychrometric Properties (psy_ta_rh)",
  // Utilities
  body_surface_area: "Body Surface Area (BSA)",
  v_relative: "Relative Air Speed (v_relative)",
  v_relative_array: "Relative Air Speed — Array",
  clo_dynamic: "Dynamic Clothing Insulation",
  clo_dynamic_array: "Dynamic Clothing Insulation — Array",
  units_converter: "Units Converter",
  units_converter_array: "Units Converter — Array",
  running_mean_outdoor_temperature: "Running Mean Outdoor Temperature",
  f_svv: "Sky Vault View Factor (f_svv)",
  // Clo
  clo_typical_ensembles: "Typical Ensembles (Clo)",
  clo_individual_garments: "Individual Garments (Clo)",
  // Met
  met_typical_tasks: "Typical Tasks (Met)",
};

function getDisplayName(name) {
  return displayNameMap[name] || name;
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

  // Pre-process notes (Changelog, Surveys) to split them by headers for TOC
  const splitNoteByHeaders = (noteName, level = 2) => {
    const note = comments.find(
      (c) =>
        c.kind === "note" &&
        (c.name === noteName || (c.path && c.path[0].name === noteName)),
    );
    if (!note || !note.description || !note.description.children) return [];

    const sections = [];
    let currentSection = {
      kind: "note",
      name: noteName,
      description: { type: "root", children: [] },
      path: [{ name: noteName, kind: "note" }],
    };

    note.description.children.forEach((child) => {
      if (child.type === "heading" && child.depth === level) {
        if (currentSection.description.children.length > 0)
          sections.push(currentSection);
        const name = child.children[0].value;
        currentSection = {
          kind: "note",
          name: name,
          description: { type: "root", children: [] },
          path: [{ name: name, kind: "note" }],
        };
      } else {
        currentSection.description.children.push(child);
      }
    });
    if (currentSection.description.children.length > 0)
      sections.push(currentSection);
    return sections;
  };

  const changelogSections = splitNoteByHeaders("Changelog", 2);
  const surveySections = splitNoteByHeaders("Surveys", 2);

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
      getDisplayName,
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

  // Flatten comments recursively to find all functions/typedefs
  const allFlattened = [];
  function flatten(items) {
    if (!items) return;
    items.forEach((item) => {
      allFlattened.push(item);
      if (item.members) {
        flatten(item.members.static);
        flatten(item.members.instance);
        flatten(item.members.global);
        flatten(item.members.inner);
      }
    });
  }
  flatten(comments);

  // Partition comments
  const partitioned = {
    models: allFlattened.filter((c) => c.memberof === "models"),
    psychrometrics: allFlattened.filter((c) => c.memberof === "psychrometrics"),
    utilities: allFlattened.filter((c) => c.memberof === "utilities"),
    clo: allFlattened.filter(
      (c) =>
        c.memberof === "reference_values" &&
        (c.name.includes("clo") || (c.docname && c.docname.includes("clo"))),
    ),
    met: allFlattened.filter(
      (c) =>
        c.memberof === "reference_values" &&
        (c.name.includes("met") || (c.docname && c.docname.includes("met"))),
    ),
    notes: allFlattened.filter((c) => c.kind === "note"),
  };

  console.log("Partitioned counts:", {
    models: partitioned.models.length,
    psychrometrics: partitioned.psychrometrics.length,
    utilities: partitioned.utilities.length,
    clo: partitioned.clo.length,
    met: partitioned.met.length,
  });

  // Search data collection
  const searchData = [];

  function extractText(ast) {
    if (!ast) return "";
    if (Array.isArray(ast)) return ast.map(extractText).join(" ");
    if (ast.type === "text") return ast.value || "";
    if (ast.children) return ast.children.map(extractText).join(" ");
    return "";
  }

  const pages = [
    {
      name: "index.html",
      docs: splitNoteByHeaders("Overview", 2),
      title: "Overview",
      type: "root",
      pathToRoot: "",
    },
    {
      name: "installation.html",
      docs: splitNoteByHeaders("Installation", 2),
      title: "Installation",
      type: "root",
      pathToRoot: "",
    },
    {
      name: "contributing.html",
      docs: splitNoteByHeaders("Contributing", 2),
      title: "Contributing",
      type: "root",
      pathToRoot: "",
    },
    {
      name: "authors.html",
      docs: splitNoteByHeaders("Authors", 2),
      title: "Authors",
      type: "root",
      pathToRoot: "",
    },
    {
      name: "documentation/models.html",
      docs: partitioned.models,
      title: "Models",
      type: "doc",
      pathToRoot: "../",
    },
    {
      name: "documentation/psychrometrics.html",
      docs: partitioned.psychrometrics,
      title: "Psychrometrics",
      type: "doc",
      pathToRoot: "../",
    },
    {
      name: "documentation/utilities_functions.html",
      docs: partitioned.utilities,
      title: "Utilities functions",
      type: "doc",
      pathToRoot: "../",
    },
    {
      name: "documentation/clo.html",
      docs: partitioned.clo,
      title: "Clo reference values",
      type: "doc",
      pathToRoot: "../",
    },
    {
      name: "documentation/met.html",
      docs: partitioned.met,
      title: "Met reference values",
      type: "doc",
      pathToRoot: "../",
    },
    {
      name: "documentation/surveys.html",
      docs: surveySections.length
        ? surveySections
        : splitNoteByHeaders("Surveys", 2),
      title: "Surveys",
      type: "doc",
      pathToRoot: "../",
    },
    {
      name: "documentation/references.html",
      docs: splitNoteByHeaders("References", 2),
      title: "References",
      type: "doc",
      pathToRoot: "../",
    },
    {
      name: "documentation/examples.html",
      docs: splitNoteByHeaders("Examples and Tutorials", 2),
      title: "Examples",
      type: "doc",
      pathToRoot: "../",
    },
    {
      name: "documentation/changelog.html",
      docs: changelogSections.length
        ? changelogSections
        : splitNoteByHeaders("Changelog", 2),
      title: "Changelog",
      type: "doc",
      pathToRoot: "../",
    },
    {
      name: "documentation/search.html",
      docs: [],
      title: "Search",
      type: "search",
      pathToRoot: "../",
    },
    {
      name: "documentation/index.html",
      docs: [],
      title: "Documentation",
      type: "doc_index",
      pathToRoot: "../",
    },
  ];

  await copyDir(__dirname + "/assets/", config.output + "/assets/");
  await fs.mkdir(path.join(config.output, "documentation"), {
    recursive: true,
  });

  for (const page of pages) {
    console.log(
      `Rendering page: ${page.name}, title: ${page.title}, type: ${page.type}`,
    );
    const string = pageTemplate({
      docs: page.docs,
      config,
      pageTitle: page.title,
      pageType: page.type,
      pathToRoot: page.pathToRoot,
      allDocs: comments,
      partitioned,
      navigation: page.docs, // Fallback for documentation.yml structures
    });
    await fs.writeFile(path.join(config.output, page.name), string, "utf8");

    // Add to search index (excluding search page itself)
    if (page.type !== "search") {
      let content = "";
      if (Array.isArray(page.docs)) {
        page.docs.forEach((doc) => {
          content +=
            (doc.name || "") + " " + extractText(doc.description) + " ";
          if (doc.members) {
            const allMembers = [
              ...(doc.members.static || []),
              ...(doc.members.instance || []),
              ...(doc.members.global || []),
            ];
            allMembers.forEach((m) => {
              content +=
                (m.name || "") + " " + extractText(m.description) + " ";
            });
          }
        });
      }

      searchData.push({
        title: page.title || page.name,
        url: page.name,
        content: content.trim(),
      });
    }
  }

  // Write search data
  await fs.writeFile(
    path.join(config.output, "search-data.json"),
    JSON.stringify(searchData),
    "utf8",
  );
}
