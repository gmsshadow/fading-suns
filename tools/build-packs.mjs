/**
 * Compendium build script.
 *
 * Writes each pack's documents to packs/_source/<pack>/ as readable JSON (so the
 * data is diffable in version control) and then compiles them into the LevelDB
 * directory that Foundry v11+ expects at packs/<pack>/.
 *
 * Usage:
 *   npm install
 *   npm run build:packs
 *
 * Document ids are derived deterministically from the document's natural key, so
 * rebuilding a pack does not churn ids or break links from other documents.
 */

import { ClassicLevel } from "classic-level";
import { createHash } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { LEARNED_SKILLS } from "./learned-skills.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ID_ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/**
 * Derive a stable 16-character Foundry document id from a natural key.
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
 * Build the documents for the Learned Skills pack.
 * @returns {object[]}
 */
function buildLearnedSkills() {
  return LEARNED_SKILLS.map((skill, index) => {
    const key = skill.specialty ? `${skill.name} (${skill.specialty})` : skill.name;
    return {
      _id: stableId(`Item.learned-skills.${key}`),
      name: key,
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
        "fading-suns": {
          // Faction-restricted skills such as Speak (Graceful Tongue), p.99.
          factionSkill: skill.f ?? null
        }
      },
      _stats: { systemId: "fading-suns", systemVersion: "0.3.0" }
    };
  });
}

/** Packs to build, keyed by the pack name declared in system.json. */
const PACKS = {
  "learned-skills": { type: "Item", documents: buildLearnedSkills }
};

/* -------------------------------------------- */

for (const [name, config] of Object.entries(PACKS)) {
  const documents = config.documents();
  const collection = config.type === "Item" ? "items" : "actors";

  // 1. Human-readable source, one file per document, for version control.
  const sourceDir = path.join(ROOT, "packs", "_source", name);
  rmSync(sourceDir, { recursive: true, force: true });
  mkdirSync(sourceDir, { recursive: true });

  const seen = new Map();
  for (const doc of documents) {
    const label = doc.system?.specialty ? `${doc.name}-${doc.system.specialty}` : doc.name;
    const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (seen.has(slug)) throw new Error(`Duplicate document slug "${slug}" in pack "${name}"`);
    seen.set(slug, doc._id);
    writeFileSync(path.join(sourceDir, `${slug}.json`), JSON.stringify(doc, null, 2) + "\n");
  }

  // Guard against hash collisions in the derived ids.
  const ids = new Set(documents.map(d => d._id));
  if (ids.size !== documents.length) throw new Error(`Duplicate document id in pack "${name}"`);

  // 2. Compile to the LevelDB directory Foundry loads.
  const packDir = path.join(ROOT, "packs", name);
  rmSync(packDir, { recursive: true, force: true });
  mkdirSync(packDir, { recursive: true });

  const db = new ClassicLevel(packDir, { valueEncoding: "json" });
  await db.open();
  const batch = db.batch();
  for (const doc of documents) batch.put(`!${collection}!${doc._id}`, doc);
  await batch.write();
  await db.close();

  console.log(`  built ${name}: ${documents.length} documents`);
}

console.log("Packs built.");
