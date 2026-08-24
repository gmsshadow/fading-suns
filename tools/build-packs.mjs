/**
 * Compendium build script.
 *
 * Source documents are written to src/packs/<pack>/ as readable JSON — one file
 * per document, so the data is diffable in version control — and then compiled
 * into the LevelDB directory Foundry loads at packs/<pack>/.
 *
 * Compilation uses Foundry's own @foundryvtt/foundryvtt-cli rather than driving
 * LevelDB by hand, so the output is guaranteed to match what Foundry expects.
 *
 * Two things about the layout are easy to get wrong and both fail silently:
 *
 *   1. Nothing but LevelDB directories may live under packs/. Source JSON is
 *      kept in src/packs/ and excluded from the distributed archive.
 *   2. The CLI keys each document off a "_key" field of the form "!items!<id>"
 *      (or "!actors!<id>"). Without it the pack compiles to an empty database
 *      and reports success. The field is stripped from the stored document.
 *
 * Usage:
 *   npm install
 *   npm run build:packs
 */

import { compilePack } from "@foundryvtt/foundryvtt-cli";
import { ClassicLevel } from "classic-level";
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { LEARNED_SKILLS } from "./learned-skills.mjs";
import { BLESSINGS_AND_CURSES } from "./blessings-curses.mjs";
import { BENEFICES_AND_AFFLICTIONS } from "./benefices.mjs";
import { CHARACTER_HISTORIES } from "./character-histories.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ID_ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/**
 * Derive a stable 16-character Foundry document id from a natural key, so that
 * rebuilding a pack never churns ids or breaks links from other documents.
 * @param {string} key
 * @returns {string}
 */
function stableId(key) {
  const digest = createHash("sha256").update(key).digest();
  let id = "";
  for (let i = 0; i < 16; i++) id += ID_ALPHABET[digest[i] % ID_ALPHABET.length];
  return id;
}

/**
 * Build the documents for the Learned Skills pack (p.99).
 * @returns {object[]}
 */
function buildLearnedSkills() {
  return LEARNED_SKILLS.map((skill, index) => {
    const name = skill.specialty ? `${skill.name} (${skill.specialty})` : skill.name;
    return {
      _id: stableId(`Item.learned-skills.${name}`),
      name,
      type: "skill",
      img: "icons/svg/book.svg",
      system: {
        description: `<p>${skill.desc}</p>`,
        value: 0,
        skillType: "learned",
        characteristic: skill.char,
        specialty: skill.specialty ?? "",
        guildSkill: !!skill.g
      },
      effects: [],
      folder: null,
      sort: (index + 1) * 100000,
      ownership: { default: 0 },
      flags: {
        // Faction-restricted skills such as Speak (Graceful Tongue), p.99.
        "fading-suns": { factionSkill: skill.f ?? null }
      },
      _stats: { systemId: "fading-suns" }
    };
  });
}

/**
 * Build the documents for the Blessings and Curses pack (p.115).
 * @returns {object[]}
 */
function buildBlessings() {
  return BLESSINGS_AND_CURSES.map((trait, index) => ({
    _id: stableId(`Item.blessings-curses.${trait.p}.${trait.n}`),
    name: trait.n,
    type: "blessing",
    img: trait.p === "curse" ? "icons/svg/downgrade.svg" : "icons/svg/regen.svg",
    system: {
      description: "",
      polarity: trait.p,
      category: trait.category,
      cost: trait.c,
      modifiers: trait.mods ?? [],
      restriction: trait.r ?? "",
      always: !!trait.always,
      vitalityModifier: trait.vit ?? 0,
      baseRun: trait.run ?? 0,
      note: trait.note ?? ""
    },
    effects: [],
    folder: null,
    sort: (index + 1) * 100000,
    ownership: { default: 0 },
    flags: {},
    _stats: { systemId: "fading-suns" }
  }));
}

/**
 * Build the documents for the Benefices and Afflictions pack (p.117).
 * @returns {object[]}
 */
function buildBenefices() {
  return BENEFICES_AND_AFFLICTIONS.map((entry, index) => ({
    _id: stableId(`Item.benefices-afflictions.${entry.p}.${entry.n}`),
    name: entry.n,
    type: "benefice",
    img: entry.p === "affliction" ? "icons/svg/downgrade.svg" : "icons/svg/coins.svg",
    system: {
      description: `<p>${entry.d}</p>`,
      polarity: entry.p,
      category: entry.cat,
      value: entry.c,
      ranks: (entry.ranks ?? []).map(r => ({
        value: r.value,
        label: r.label,
        firebirds: r.fb ?? 0,
        income: r.inc ?? 0
      })),
      firebirds: entry.fb ?? 0,
      income: entry.inc ?? 0,
      requires: entry.req ?? "",
      excludes: entry.excl ?? ""
    },
    effects: [],
    folder: null,
    sort: (index + 1) * 100000,
    ownership: { default: 0 },
    flags: {},
    _stats: { systemId: "fading-suns" }
  }));
}

/**
 * Resolve a Blessing, Curse or Benefice referenced by name into its compendium
 * uuid. Stage data names the trait; the id is derived the same way the target
 * pack derives it, so the two cannot drift apart.
 * @param {string} pack
 * @param {string} polarity
 * @param {string} name
 * @returns {string}
 */
function referenceUuid(pack, polarity, name) {
  const id = stableId(`Item.${pack}.${polarity}.${name}`);
  return `Compendium.fading-suns.${pack}.Item.${id}`;
}

/** Names available for reference, so a typo fails the build rather than the game. */
const BLESSING_NAMES = new Map(BLESSINGS_AND_CURSES.map(b => [b.n, b.p]));
const BENEFICE_NAMES = new Map(BENEFICES_AND_AFFLICTIONS.map(b => [b.n, b.p]));

/**
 * Walk a stage's grants, replacing trait names with compendium uuids.
 * @param {object[]} grants
 * @param {string} stageName
 * @returns {object[]}
 */
function resolveReferences(grants, stageName) {
  return grants.map(grant => {
    if (grant.kind === "choice") {
      return {
        ...grant,
        options: (grant.options ?? []).map(o => ({
          ...o,
          grants: resolveReferences(o.grants ?? [], stageName)
        }))
      };
    }

    if (grant.kind === "blessing" || grant.kind === "curse") {
      const polarity = BLESSING_NAMES.get(grant.key);
      if (!polarity) throw new Error(`Stage "${stageName}" references unknown trait "${grant.key}"`);
      if (polarity !== grant.kind) {
        throw new Error(`Stage "${stageName}" grants "${grant.key}" as a ${grant.kind}, but it is a ${polarity}`);
      }
      return { ...grant, key: referenceUuid("blessings-curses", polarity, grant.key), label: grant.key };
    }

    if (grant.kind === "benefice") {
      const polarity = BENEFICE_NAMES.get(grant.key);
      if (!polarity) throw new Error(`Stage "${stageName}" references unknown benefice "${grant.key}"`);
      return { ...grant, key: referenceUuid("benefices-afflictions", polarity, grant.key), label: grant.key };
    }

    return grant;
  });
}

/**
 * Build the documents for the Character Histories pack (p.72).
 * @returns {object[]}
 */
function buildCharacterHistories() {
  // Several stage names recur across stage types — "Soldier" is both an
  // Apprenticeship and an Early Career — so the stage is part of the document
  // name. It also groups the pack sensibly in an alphabetical sidebar.
  const STAGE_LABELS = {
    upbringing: "Upbringing",
    apprenticeship: "Apprenticeship",
    earlyCareer: "Early Career",
    tourOfDuty: "Tour of Duty",
    extra: "Extra Stage"
  };

  return CHARACTER_HISTORIES.map((stage, index) => ({
    _id: stableId(`Item.character-histories.${stage.stage}.${stage.n}`),
    name: `${STAGE_LABELS[stage.stage]}: ${stage.n}`,
    type: "stage",
    img: "icons/svg/book.svg",
    system: {
      description: `<p>${stage.d}</p>`,
      stageType: stage.stage,
      faction: stage.faction,
      group: stage.group ?? "",
      grants: resolveReferences(stage.grants, stage.n)
    },
    effects: [],
    folder: null,
    sort: (index + 1) * 100000,
    ownership: { default: 0 },
    flags: {},
    _stats: { systemId: "fading-suns" }
  }));
}

/** Packs to build, keyed by the pack name declared in system.json. */
const PACKS = {
  "learned-skills": { type: "Item", documents: buildLearnedSkills },
  "blessings-curses": { type: "Item", documents: buildBlessings },
  "benefices-afflictions": { type: "Item", documents: buildBenefices },
  "character-histories": { type: "Item", documents: buildCharacterHistories }
};

/* -------------------------------------------- */

for (const [name, config] of Object.entries(PACKS)) {
  const documents = config.documents();
  const collection = config.type === "Item" ? "items" : "actors";

  // 1. Human-readable source, one file per document.
  const sourceDir = path.join(ROOT, "src", "packs", name);
  rmSync(sourceDir, { recursive: true, force: true });
  mkdirSync(sourceDir, { recursive: true });

  const slugs = new Set();
  const ids = new Set();
  for (const doc of documents) {
    const slug = doc.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (slugs.has(slug)) throw new Error(`Duplicate slug "${slug}" in pack "${name}"`);
    if (ids.has(doc._id)) throw new Error(`Duplicate id "${doc._id}" in pack "${name}"`);
    slugs.add(slug);
    ids.add(doc._id);

    const source = { _key: `!${collection}!${doc._id}`, ...doc };
    writeFileSync(path.join(sourceDir, `${slug}.json`), JSON.stringify(source, null, 2) + "\n");
  }

  // 2. Compile to the LevelDB directory Foundry loads.
  const packDir = path.join(ROOT, "packs", name);
  rmSync(packDir, { recursive: true, force: true });
  mkdirSync(packDir, { recursive: true });
  await compilePack(sourceDir, packDir, { log: false });

  // 3. Verify by reading the pack back the way Foundry will. This is done on a
  //    throwaway copy, because opening a LevelDB writes recovery files into the
  //    directory and the shipped pack should stay exactly as the CLI left it.
  const verifyDir = path.join(ROOT, ".verify", name);
  rmSync(verifyDir, { recursive: true, force: true });
  mkdirSync(verifyDir, { recursive: true });
  cpSync(packDir, verifyDir, { recursive: true });

  const db = new ClassicLevel(verifyDir, { valueEncoding: "json", createIfMissing: false });
  await db.open();
  let count = 0;
  for await (const [key, value] of db.iterator()) {
    if (!key.startsWith(`!${collection}!`)) throw new Error(`Malformed key "${key}"`);
    if ("_key" in value) throw new Error(`_key leaked into stored document ${key}`);
    count++;
  }
  await db.close();
  rmSync(path.join(ROOT, ".verify"), { recursive: true, force: true });

  if (count !== documents.length) {
    throw new Error(`Pack "${name}" holds ${count} documents, expected ${documents.length}`);
  }

  // LOCK and LOG are runtime scratch; shipping them serves no purpose.
  for (const scratch of ["LOCK", "LOG", "LOG.old"]) {
    rmSync(path.join(packDir, scratch), { force: true });
  }

  const files = readdirSync(packDir).sort().join(", ");
  console.log(`  ${name}: ${count} documents verified — ${files}`);
}

console.log("Packs built.");
