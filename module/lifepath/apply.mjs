/**
 * Fading Suns 2nd Edition Revised — writing a finished lifepath onto an actor.
 *
 * `buildActorUpdate` is pure and unit-tested; everything below it needs Foundry
 * because it resolves compendium documents.
 */


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

  // Wyrd bought with Extra points raises the maximum above its derived base (p.88).
  if (state.wyrdBonus) update["system.wyrd.bonus"] = state.wyrdBonus;

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

/**
 * Pool Benefices a character may only hold one of.
 *
 * A rank is a **total**, not an increment: Ordained 3 is a Novice and Ordained 5
 * a Deacon, so climbing from one to the other costs the difference of two, and
 * the entry ends up reading 5 rather than 8 (p.123). Pooling therefore keeps the
 * highest rank reached rather than adding the figures together.
 *
 * Entries that name a thing rather than describe the character are left alone:
 * two Allies are two different people, and pooling them into "Ally 8" would be
 * nonsense.
 *
 * @param {Array<{uuid: string, value: number, unique: boolean}>} entries
 * @returns {Array<{uuid: string, value: number, unique: boolean, pooledFrom?: number[]}>}
 */
export function poolBenefices(entries = []) {
  const pooled = new Map();
  const separate = [];

  for (const entry of entries) {
    if (!entry.unique) { separate.push(entry); continue; }

    const existing = pooled.get(entry.uuid);
    if (!existing) {
      pooled.set(entry.uuid, { ...entry, value: entry.value ?? 0, pooledFrom: [entry.value ?? 0] });
      continue;
    }
    existing.value = Math.max(existing.value, entry.value ?? 0);
    existing.pooledFrom.push(entry.value ?? 0);
  }

  // Entries that only appeared once did not really pool.
  for (const entry of pooled.values()) {
    if (entry.pooledFrom.length < 2) delete entry.pooledFrom;
  }

  return [...pooled.values(), ...separate];
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

  // Ranked Benefices pool before they are created, so a career's Ordained 3 and
  // two points bought later arrive as one Deacon rather than two Novices.
  const beneficeDocs = [];
  for (const benefice of state.benefices ?? []) {
    const document = await fromUuid(benefice.key);
    if (!document) continue;
    beneficeDocs.push({
      uuid: benefice.key,
      value: benefice.value,
      unique: document.system.unique,
      document
    });
  }

  for (const entry of poolBenefices(beneficeDocs)) {
    const data = entry.document.toObject();
    delete data._id;
    data.system.value = entry.value;
    newItems.push(data);
  }

  // 4. Combat Actions taught by the stages or bought with Extra points (p.102),
  //    and any psychic powers or theurgic rites granted by an occult stage.
  newItems.push(...await resolveItems((state.combatActions ?? []).map(a => a.key)));
  newItems.push(...await resolveItems(state.powers ?? []));

  // 5. The stages themselves, so the character's history stays on the sheet.
  for (const stage of stages) {
    const data = stage.toObject();
    delete data._id;
    newItems.push(data);
  }

  // 6. Anything the system does not yet model, recorded where it will be read.
  if (state.notes?.length) {
    const heading = game.i18n.localize("FADINGSUNS.Section.History");
    const notes = state.notes.map(n => `<li>${foundry.utils.escapeHTML(n)}</li>`).join("");
    update["system.biography"] =
      `${actor.system.biography ?? ""}<h3>${heading}</h3><ul>${notes}</ul>`;
  }

  // Record that creation has been run, so the wizard can lock itself (p.70).
  update["flags.fading-suns.creationComplete"] = true;
  update["flags.fading-suns.creationDate"] = Date.now();

  await actor.update(update);
  if (skillUpdates.length) await actor.updateEmbeddedDocuments("Item", skillUpdates);
  if (newItems.length) await actor.createEmbeddedDocuments("Item", newItems);

  return actor;
}


/* -------------------------------------------- */
/*  Rank ladders (p.123)                        */
/* -------------------------------------------- */

/**
 * What it costs to climb a ranked Benefice from where you are to a given rank.
 *
 * The published figure is the total, and the ladders are not evenly spaced:
 * Nobility runs 3, 5, 7, 9, 11, 13 — three for the first step and two for each
 * after — while Cash runs 1, 2, 3, 5, 7, 9, 11.
 *
 * @param {number} target   The rank being bought.
 * @param {number} [current=0]   The rank already held, whether granted or bought.
 * @returns {number}        Points to spend; never negative.
 */
export function rankCost(target, current = 0) {
  return Math.max(0, (target ?? 0) - (current ?? 0));
}

/**
 * The rungs of a ranked Benefice, with what each costs from where you are.
 *
 * @param {Array<{value: number, label: string}>} ranks
 * @param {number} [current=0]
 * @returns {Array<{value: number, label: string, cost: number, held: boolean}>}
 */
export function rankLadder(ranks = [], current = 0) {
  return ranks.map(rank => ({
    value: rank.value,
    label: rank.label,
    cost: rankCost(rank.value, current),
    held: rank.value <= current
  }));
}
