/**
 * Repository validation.
 *
 * Catches the classes of mistake that fail silently at runtime rather than
 * throwing: an unregistered localisation key renders as its own key, a missing
 * template path fails only when that sheet is opened, and an item type declared
 * in one registry but not another simply never appears.
 *
 * Usage:
 *   npm run validate
 */

import Handlebars from "handlebars";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const problems = [];
const note = (check, detail) => problems.push(`${check}: ${detail}`);

/**
 * Recursively collect files with any of the given extensions.
 * @param {string} dir
 * @param {string[]} exts
 * @param {string[]} [out]
 * @returns {string[]}
 */
function walk(dir, exts, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const p = path.join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, exts, out);
    else if (exts.some(e => p.endsWith(e))) out.push(p);
  }
  return out;
}

const rel = p => path.relative(ROOT, p);
const templates = walk(path.join(ROOT, "templates"), [".hbs"]);
const modules = walk(path.join(ROOT, "module"), [".mjs"]);

/* -------------------------------------------- */
/*  1. Every template compiles                  */
/* -------------------------------------------- */

for (const file of templates) {
  try {
    Handlebars.precompile(readFileSync(file, "utf8"));
  } catch (err) {
    note("template", `${rel(file)} — ${err.message}`);
  }
}

/* -------------------------------------------- */
/*  2. Manifest and localisation parse          */
/* -------------------------------------------- */

let system, lang;
try {
  system = JSON.parse(readFileSync(path.join(ROOT, "system.json"), "utf8"));
} catch (err) {
  note("system.json", err.message);
}
try {
  lang = JSON.parse(readFileSync(path.join(ROOT, "lang/en.json"), "utf8"));
} catch (err) {
  note("lang/en.json", err.message);
}

/* -------------------------------------------- */
/*  3. Localisation keys resolve                */
/* -------------------------------------------- */

if (lang) {
  const known = new Set();
  (function flatten(obj, prefix = "") {
    for (const [key, value] of Object.entries(obj)) {
      const full = prefix ? `${prefix}.${key}` : key;
      if (value && typeof value === "object") flatten(value, full);
      else known.add(full);
    }
  })(lang);

  const pattern = /["'`](FADINGSUNS\.[A-Za-z0-9_.]+|TYPES\.[A-Za-z]+\.[A-Za-z0-9-]+)["'`]/g;
  for (const file of [...templates, ...modules]) {
    for (const match of readFileSync(file, "utf8").matchAll(pattern)) {
      if (!known.has(match[1])) note("missing i18n key", `${match[1]} in ${rel(file)}`);
    }
  }
}

/* -------------------------------------------- */
/*  4. Template paths referenced in code exist  */
/* -------------------------------------------- */

const templatePattern = /systems\/fading-suns\/(templates\/[A-Za-z0-9/-]+\.hbs)/g;
const referenced = new Set();
for (const file of modules) {
  for (const match of readFileSync(file, "utf8").matchAll(templatePattern)) {
    referenced.add(match[1]);
    if (!existsSync(path.join(ROOT, match[1]))) {
      note("missing template", `${match[1]} referenced by ${rel(file)}`);
    }
  }
}

/* -------------------------------------------- */
/*  5. Applications do not shadow framework accessors  */
/* -------------------------------------------- */

/**
 * ApplicationV2 exposes a number of properties as getters. Assigning to one in a
 * subclass constructor throws at construction time with a message that does not
 * name the class, so it is worth catching here instead.
 */
const RESERVED_ACCESSORS = [
  "state", "id", "title", "element", "window", "rendered", "position",
  "form", "parts", "tabGroups", "classList", "hasFrame", "minimized"
];

for (const file of walk(path.join(ROOT, "module", "applications"), [".mjs"])) {
  const src = readFileSync(file, "utf8");
  for (const name of RESERVED_ACCESSORS) {
    if (new RegExp(`\\bthis\\.${name}\\s*=[^=]`).test(src)) {
      note("shadows framework accessor", `this.${name} assigned in ${rel(file)}`);
    }
  }
}

/* -------------------------------------------- */
/*  6. Item type registries agree               */
/* -------------------------------------------- */

if (system) {
  const declared = Object.keys(system.documentTypes?.Item ?? {}).sort().join(",");
  const read = f => readFileSync(path.join(ROOT, f), "utf8");
  const keysOf = (src, marker) => {
    const block = src.match(new RegExp(`${marker}[^{]*\\{[^}]*\\}`, "s"));
    if (!block) return null;
    return [...block[0].matchAll(/^\s+"?([a-zA-Z]+)"?:/gm)].map(m => m[1]).sort().join(",");
  };

  const registries = {
    "CONFIG.Item.dataModels": keysOf(read("module/fading-suns.mjs"), "CONFIG\\.Item\\.dataModels ="),
    "DETAIL_PARTIALS": keysOf(read("module/applications/item-sheet.mjs"), "DETAIL_PARTIALS ="),
    "DEFAULT_IMAGES": keysOf(read("module/documents/item.mjs"), "DEFAULT_IMAGES =")
  };

  for (const [name, keys] of Object.entries(registries)) {
    if (keys === null) note("registry", `could not parse ${name}`);
    else if (keys !== declared) note("registry", `${name} has [${keys}], system.json declares [${declared}]`);
  }

  if (lang) {
    for (const type of Object.keys(system.documentTypes?.Item ?? {})) {
      if (!lang.TYPES?.Item?.[type]) note("missing type label", `TYPES.Item.${type}`);
    }
    for (const type of Object.keys(lang.TYPES?.Item ?? {})) {
      if (!(type in (system.documentTypes?.Item ?? {}))) note("stale type label", `TYPES.Item.${type}`);
    }
  }

  /* ---- 7. Declared packs exist and are compiled ---- */
  for (const pack of system.packs ?? []) {
    const dir = path.join(ROOT, pack.path);
    if (!existsSync(dir)) {
      note("pack", `${pack.path} does not exist — run "npm run build:packs"`);
      continue;
    }
    const files = readdirSync(dir);
    if (!files.some(f => f.endsWith(".ldb") || f.endsWith(".log"))) {
      note("pack", `${pack.path} contains no LevelDB data`);
    }
  }

  // Nothing but compiled packs may live under packs/.
  const packsRoot = path.join(ROOT, "packs");
  if (existsSync(packsRoot)) {
    const declaredDirs = new Set((system.packs ?? []).map(p => path.basename(p.path)));
    for (const entry of readdirSync(packsRoot)) {
      if (!declaredDirs.has(entry)) {
        note("packs/", `unexpected entry "${entry}" — only compiled packs belong here`);
      }
    }
  }
}

/* -------------------------------------------- */

const orphans = templates.map(rel).filter(p => !referenced.has(p) && !p.includes("/parts/details-"));
for (const orphan of orphans) note("unreferenced template", orphan);

if (problems.length) {
  console.error(`Validation failed — ${problems.length} problem(s):\n`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}

console.log(`Validation passed — ${templates.length} templates, ${modules.length} modules.`);
