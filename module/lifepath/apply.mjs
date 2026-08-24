/**
 * Fading Suns 2nd Edition Revised — writing a finished lifepath onto an actor.
 *
 * `buildActorUpdate` is pure and unit-tested; everything below it needs Foundry
 * because it resolves compendium documents.
 */

import { skillLabel } from "./grants.mjs";

/* -------------------------------------------- */
/*  Pure                                        */
/* -------------------------------------------- */

/**
 * Turn the characteristic and primary-flag portions of a lifepath state into a
 * flat update object for `Actor#update`.
 *
 * Characteristics are written as absolute values rather than deltas, because the
 * state already carries the starting ratings the lifepath began from.
 *
 * @param {import("./grants.mjs").LifepathState} state
 * @returns {Record<string, number|boolean>}
 */
export function buildActorUpdate(state) {
  const update = {};

  for (const [path, value] of Object.entries(state.characteristics ?? {})) {
    update[`system.${path}.value`] = value;
  }

  // Only Spirit traits carry a primary flag (p.93).
  for (const [path, primary] of Object.entries(state.primary ?? {})) {
    if (path.startsWith("spirit.")) update[`system.${path}.primary`] = primary;
  }

  return update;
}

/**
 * Split a skill label back into its name and specialty.
 * "Lore (Heraldry)" becomes { name: "Lore", specialty: "Heraldry" }.
 * @param {string} label
 * @returns {{name: string, specialty: string}}
 */
export function parseSkillLabel(label) {
  const match = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(label ?? "");
  if (!match) return { name: (label ?? "").trim(), specialty: "" };
  return { name: match[1].trim(), specialty: match[2].trim() };
}

/**
 * Work out which skills need creating and which need raising.
 *
 * @param {Record<string, number>} skills   Final ratings, keyed by display label.
 * @param {Array<{label: string, id: string, value: number}>} existing
 *        Skills the actor already has.
 * @returns {{updates: Array<{_id: string, "system.value": number}>, missing: string[]}}
 */
export function diffSkills(skills, existing) {
  const byLabel = new Map(existing.map(s => [s.label, s]));
  const updates = [];
  const missing = [];

  for (const [label, value] of Object.entries(skills ?? {})) {
    const current = byLabel.get(label);
    if (!current) missing.push(label);
    else if (current.value !== value) updates.push({ _id: current.id, "system.value": value });
  }

  return { updates, missing };
}

/* -------------------------------------------- */
/*  Foundry-facing                              */
/* -------------------------------------------- */

/**
 * Find a skill in the Learned Skills compendium by its display label.
 * @param {string} label
 * @returns {Promise<object|null>}  Item creation data, or null if not stocked.
 */
async function skillTemplate(label) {
  const pack = game.packs.get("fading-suns.learned-skills");
  if (!pack) return null;
  const index = pack.index.find(i => i.name === label);
  if (!index) return null;
  const document = await pack.getDocument(index._id);
  return document?.toObject() ?? null;
}

/**
 * Build creation data for a skill the actor does not yet have, preferring the
 * compendium entry so that the characteristic pairing and description come with
 * it, and falling back to a bare skill if the pack does not stock it.
 * @param {string} label
 * @param {number} value
 * @returns {Promise<object>}
 */
async function buildSkill(label, value) {
  const template = await skillTemplate(label);
  if (template) {
    template.system.value = value;
    delete template._id;
    return template;
  }

  const { name, specialty } = parseSkillLabel(label);
  return {
    name: specialty ? `${name} (${specialty})` : name,
    type: "skill",
    img: "icons/svg/book.svg",
    system: { value, skillType: "learned", specialty, characteristic: "mind.wits" }
  };
}

/**
 * Resolve a list of compendium uuids into item creation data.
 * @param {string[]} uuids
 * @returns {Promise<object[]>}
 */
async function resolveItems(uuids) {
  const items = [];
  for (const uuid of uuids ?? []) {
    const document = await fromUuid(uuid);
    if (!document) {
      console.warn(`fading-suns | Lifepath references a missing document: ${uuid}`);
      continue;
    }
    const data = document.toObject();
    delete data._id;
    items.push(data);
  }
  return items;
}

/**
 * Write a completed lifepath onto an actor.
 *
 * Everything is assembled first and written in as few operations as possible, so
 * a failure part-way through does not leave a half-built character.
 *
 * @param {Actor} actor
 * @param {import("./grants.mjs").LifepathState} state
 * @param {object} [options]
 * @param {Item[]} [options.stages]   The stage items chosen, recorded on the actor.
 * @returns {Promise<Actor>}
 */
export async function applyLifepathToActor(actor, state, { stages = [] } = {}) {
  // 1. Characteristics and primary flags.
  const update = buildActorUpdate(state);

  // 2. Skills — raise what exists, create what does not.
  const existing = actor.items
    .filter(i => i.type === "skill")
    .map(i => ({ label: i.system.label, id: i.id, value: i.system.value }));
  const { updates: skillUpdates, missing } = diffSkills(state.skills, existing);

  const newItems = [];
  for (const label of missing) newItems.push(await buildSkill(label, state.skills[label]));

  // 3. Blessings, Curses and Benefices.
  newItems.push(...await resolveItems([...state.blessings, ...state.curses]));
  for (const benefice of state.benefices ?? []) {
    const [data] = await resolveItems([benefice.key]);
    if (data) {
      data.system.value = benefice.value;
      newItems.push(data);
    }
  }

  // 4. The stages themselves, so the character's history stays on the sheet.
  for (const stage of stages) {
    const data = stage.toObject();
    delete data._id;
    newItems.push(data);
  }

  // 5. Anything the system does not yet model, recorded where it will be read.
  if (state.notes?.length) {
    const heading = game.i18n.localize("FADINGSUNS.Section.History");
    const notes = state.notes.map(n => `<li>${foundry.utils.escapeHTML(n)}</li>`).join("");
    update["system.biography"] =
      `${actor.system.biography ?? ""}<h3>${heading}</h3><ul>${notes}</ul>`;
  }

  await actor.update(update);
  if (skillUpdates.length) await actor.updateEmbeddedDocuments("Item", skillUpdates);
  if (newItems.length) await actor.createEmbeddedDocuments("Item", newItems);

  return actor;
}
