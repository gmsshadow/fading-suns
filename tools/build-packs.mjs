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
import { COMBAT_ACTIONS } from "./combat-actions.mjs";
import { WEAPONS, ARMOURS } from "./equipment.mjs";
import { PSI_POWERS, THEURGIC_RITES } from "./occult.mjs";

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
      excludes: entry.excl ?? "",
      unique: !!entry.one
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
 * Parse a printed modifier into a number, where it is a plain integer.
 * Values such as "0/-1", "-1/m" and "-" have no single numeric meaning and
 * resolve to zero; the printed string is kept alongside for display.
 * @param {string} printed
 * @returns {number}
 */
function numericModifier(printed) {
  const value = Number(String(printed ?? "").replace(/^\+/, ""));
  return Number.isFinite(value) ? value : 0;
}

/**
 * Build the documents for the Combat Actions pack (p.292–p.295).
 * @returns {object[]}
 */
function buildCombatActions() {
  return COMBAT_ACTIONS.map((action, index) => ({
    _id: stableId(`Item.combat-actions.${action.cat}.${action.n}`),
    name: action.n,
    type: "combatAction",
    img: action.cat === "firearms" ? "icons/svg/target.svg" : "icons/svg/sword.svg",
    system: {
      description: action.e ? `<p>${action.e}</p>` : "",
      category: action.cat,
      level: action.lvl,
      characteristic: action.ch ?? "",
      skill: action.sk ?? "",
      initiative: action.ini ?? "-",
      goal: action.goal ?? "-",
      damage: action.dmg ?? "-",
      initiativeModifier: numericModifier(action.ini),
      goalModifier: numericModifier(action.goal),
      effect: action.e ?? ""
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
const COMBAT_ACTION_LEVELS = new Map(COMBAT_ACTIONS.map(a => [a.n, { cat: a.cat, lvl: a.lvl }]));

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

    if (grant.kind === "combatAction") {
      const action = COMBAT_ACTION_LEVELS.get(grant.key);
      if (!action) throw new Error(`Stage "${stageName}" teaches unknown combat action "${grant.key}"`);
      return {
        ...grant,
        key: referenceUuid("combat-actions", action.cat, grant.key),
        label: grant.key,
        // The level is the point cost, so it must match the compendium (p.88).
        value: action.lvl
      };
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

  // Some stage names recur within a stage type across races and factions —
  // Ur-Ukar and Vorox both have a Chieftain career — so those carry their
  // grouping in the name, as the noble Upbringings already do.
  const seen = {};
  for (const stage of CHARACTER_HISTORIES) {
    const key = `${stage.stage}:${stage.n}`;
    seen[key] = (seen[key] ?? 0) + 1;
  }

  return CHARACTER_HISTORIES.map((stage, index) => ({
    _id: stableId(`Item.character-histories.${stage.stage}.${stage.group ?? ""}.${stage.n}`),
    // Alien stages always carry their race, since "Chieftain" alone says
    // nothing about whether it is Ukari or Vorox. Other stages carry their
    // grouping only where the name would otherwise collide.
    name: (stage.race || seen[`${stage.stage}:${stage.n}`] > 1)
      && stage.group && stage.group !== stage.n
      ? `${STAGE_LABELS[stage.stage]}: ${stage.n} (${stage.group})`
      : `${STAGE_LABELS[stage.stage]}: ${stage.n}`,
    type: "stage",
    img: "icons/svg/book.svg",
    system: {
      description: `<p>${stage.d}</p>`,
      stageType: stage.stage,
      faction: stage.faction,
      group: stage.group ?? "",
      factions: stage.factions ?? [],
      race: stage.race ?? "",
      path: stage.path ?? stage.faction ?? "",
      slot: stage.slot ?? "",
      grants: resolveReferences(stage.grants, stage.n),
      // Suggestions name a Benefice; the uuid is resolved here so the wizard can
      // offer it with one click, and a typo fails the build.
      suggestedBenefices: (stage.suggested ?? []).map(entry => {
        const polarity = BENEFICE_NAMES.get(entry.key);
        if (!polarity) {
          throw new Error(`Stage "${stage.n}" suggests unknown Benefice "${entry.key}"`);
        }
        return {
          label: entry.label,
          uuid: referenceUuid("benefices-afflictions", polarity, entry.key),
          value: entry.value ?? 0,
          note: entry.note ?? ""
        };
      }),
      beneficeRestriction: stage.restriction ?? "",
      extraCost: stage.cost ?? 0,
      allowance: {
        characteristics: stage.allowance?.characteristics ?? 0,
        skills: stage.allowance?.skills ?? 0,
        free: stage.allowance?.free ?? 0
      },
      // Prerequisites name another stage, and documents carry their stage type as
      // a prefix, so the reference is resolved to the full document name here.
      requires: stage.requires ? `${STAGE_LABELS[stage.stage]}: ${stage.requires}` : "",
      exclusive: !!stage.exclusive,
      pending: !!stage.pending
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
 * Build the documents for the Weapons pack (p.296–p.299).
 * @returns {object[]}
 */
function buildWeapons() {
  return WEAPONS.map((weapon, index) => ({
    _id: stableId(`Item.weapons.${weapon.cat}.${weapon.n}`),
    name: weapon.n,
    type: "weapon",
    img: weapon.t === "melee" ? "icons/svg/sword.svg" : "icons/svg/target.svg",
    system: {
      description: weapon.e ? `<p>${weapon.e}</p>` : "",
      weaponType: weapon.t,
      damage: { dice: weapon.d ?? 0, type: weapon.dmgType ?? "wound" },
      characteristic: "body.dexterity",
      skill: weapon.sk,
      range: { short: weapon.rng?.[0] ?? 0, long: weapon.rng?.[1] ?? 0 },
      strength: weapon.str ?? 0,
      size: weapon.sz ?? "",
      initiativeModifier: weapon.ini ?? 0,
      goalModifier: weapon.goal ?? 0,
      rateOfFire: weapon.rate ?? 1,
      shots: { value: weapon.sh ?? 0, max: weapon.sh ?? 0 },
      autofire: !!weapon.auto,
      cost: weapon.c ?? 0,
      costNote: weapon.cn ?? "",
      notes: weapon.e ?? "",
      quantity: 1,
      equipped: false
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
 * Build the documents for the Armour pack (p.299–p.300).
 * @returns {object[]}
 */
function buildArmour() {
  const icons = {
    armour: "icons/svg/shield.svg",
    shield: "icons/svg/shield.svg",
    energyShield: "icons/svg/aura.svg"
  };

  return ARMOURS.map((entry, index) => ({
    _id: stableId(`Item.armour.${entry.cat}.${entry.n}`),
    name: entry.n,
    type: "armour",
    img: icons[entry.cat],
    system: {
      description: entry.e ? `<p>${entry.e}</p>` : "",
      protection: { dice: entry.def ?? 0 },
      coverage: entry.cat === "shield" ? "arms" : "body",
      armourType: entry.cat,
      penalties: {
        strength: entry.str ?? 0,
        dexterity: entry.dex ?? 0,
        vigor: entry.vig ?? 0
      },
      energyShieldCompatible: !!entry.es,
      shieldDamage: entry.shieldDamage ?? 0,
      energyShield: {
        min: entry.min ?? 0,
        max: entry.max ?? 0,
        hits: { value: entry.hits ?? 0, max: entry.hits ?? 0 }
      },
      cost: entry.c ?? 0,
      costNote: entry.cn ?? "",
      notes: entry.e ?? "",
      quantity: 1,
      equipped: false
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
 * Split a printed roll such as "Extrovert + Focus" into a characteristic path
 * and a skill name.
 * @param {string} roll
 * @returns {{characteristic: string, skill: string}}
 */
function parseRoll(roll) {
  const printed = String(roll ?? "").trim();

  // A few rites give no pairing at all — "Special (see text)" — and the printed
  // line is kept rather than forced into a characteristic and skill.
  if (!printed.includes("+")) return { characteristic: "", skill: "", note: printed };

  const [rawCharacteristic, ...rest] = printed.split("+").map(s => s.trim());
  const path = Object.keys(FADING_SUNS_CHARACTERISTICS)
    .find(key => key.endsWith(`.${rawCharacteristic.toLowerCase()}`));

  return { characteristic: path ?? "", skill: rest.join(" + "), note: "" };
}

/** Characteristic dot paths, for resolving the printed roll lines. */
const FADING_SUNS_CHARACTERISTICS = {
  "body.strength": 1, "body.dexterity": 1, "body.endurance": 1,
  "mind.wits": 1, "mind.perception": 1, "mind.tech": 1,
  "spirit.extrovert": 1, "spirit.introvert": 1, "spirit.passion": 1,
  "spirit.calm": 1, "spirit.faith": 1, "spirit.ego": 1,
  "occult.psi": 1, "occult.theurgy": 1, "occult.urge": 1, "occult.hubris": 1
};

/**
 * Chain each entry to the one below it in the same path or sect.
 *
 * "A character chooses a path and must buy each level consecutively" (p.128).
 * The prerequisite is the next lowest level actually published in that group,
 * so Sympathy's level 3 and Omen's level 6 correctly have none.
 *
 * @param {object[]} entries
 * @param {string} groupKey
 * @param {string} pack
 * @returns {Map<string, string>}  Entry name to prerequisite uuid.
 */
function chainPrerequisites(entries, groupKey, pack) {
  const chain = new Map();
  const groups = {};
  for (const entry of entries) (groups[entry[groupKey]] ??= []).push(entry);

  for (const group of Object.values(groups)) {
    const ordered = [...group].sort((a, b) => a.lvl - b.lvl);
    for (let i = 1; i < ordered.length; i++) {
      const previous = ordered[i - 1];
      chain.set(ordered[i].n, referenceUuid(pack, previous[groupKey], previous.n));
    }
  }
  return chain;
}

/**
 * Build the documents for the Psychic Powers pack (p.131–p.143).
 * @returns {object[]}
 */
function buildPsychicPowers() {
  const chain = chainPrerequisites(PSI_POWERS, "path", "psychic-powers");

  return PSI_POWERS.map((power, index) => {
    const { characteristic, skill, note } = parseRoll(power.roll);
    const wyrd = Number.parseInt(power.wyrd, 10);
    return {
      _id: stableId(`Item.psychic-powers.${power.path}.${power.n}`),
      name: power.n,
      type: "psychicPower",
      img: "icons/svg/aura.svg",
      system: {
        description: `<p>${power.d}</p>`,
        level: power.lvl,
        path: power.path,
        wyrdCost: Number.isFinite(wyrd) ? wyrd : 0,
        wyrdNote: Number.isFinite(wyrd) ? "" : power.wyrd,
        characteristic: note ? "" : (characteristic || "occult.psi"),
        skill,
        rollNote: note,
        range: power.rng,
        duration: power.dur,
        requires: chain.get(power.n) ?? ""
      },
      effects: [],
      folder: null,
      sort: (index + 1) * 100000,
      ownership: { default: 0 },
      flags: {},
      _stats: { systemId: "fading-suns" }
    };
  });
}

/**
 * Build the documents for the Theurgic Rites pack (p.147–p.160).
 * @returns {object[]}
 */
function buildTheurgicRites() {
  const chain = chainPrerequisites(THEURGIC_RITES, "sect", "theurgic-rites");

  // Two rite names appear in more than one sect's liturgy — Armor of the
  // Pancreator and Fearsome Majesty — as genuinely different rites. Those get
  // their sect in the name so the sidebar can tell them apart.
  const counts = {};
  for (const rite of THEURGIC_RITES) counts[rite.n] = (counts[rite.n] ?? 0) + 1;
  const sectLabel = sect => sect.replace(/ Rituals$/, "");

  return THEURGIC_RITES.map((rite, index) => {
    const { characteristic, skill, note } = parseRoll(rite.roll);
    const wyrd = Number.parseInt(rite.wyrd, 10);
    return {
      _id: stableId(`Item.theurgic-rites.${rite.sect}.${rite.n}`),
      name: counts[rite.n] > 1 ? `${rite.n} (${sectLabel(rite.sect)})` : rite.n,
      type: "theurgicRite",
      img: "icons/svg/holy-shield.svg",
      system: {
        description: `<p>${rite.d}</p>`,
        level: rite.lvl,
        sect: rite.sect,
        components: rite.comp,
        wyrdCost: Number.isFinite(wyrd) ? wyrd : 0,
        wyrdNote: Number.isFinite(wyrd) ? "" : rite.wyrd,
        characteristic: note ? "" : (characteristic || "occult.theurgy"),
        skill,
        rollNote: note,
        range: rite.rng,
        duration: rite.dur,
        requires: chain.get(rite.n) ?? ""
      },
      effects: [],
      folder: null,
      sort: (index + 1) * 100000,
      ownership: { default: 0 },
      flags: {},
      _stats: { systemId: "fading-suns" }
    };
  });
}

/** Packs to build, keyed by the pack name declared in system.json. */
const PACKS = {
  "learned-skills": { type: "Item", documents: buildLearnedSkills },
  "blessings-curses": { type: "Item", documents: buildBlessings },
  "benefices-afflictions": { type: "Item", documents: buildBenefices },
  "combat-actions": { type: "Item", documents: buildCombatActions },
  weapons: { type: "Item", documents: buildWeapons },
  armour: { type: "Item", documents: buildArmour },
  "psychic-powers": { type: "Item", documents: buildPsychicPowers },
  "theurgic-rites": { type: "Item", documents: buildTheurgicRites },
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
