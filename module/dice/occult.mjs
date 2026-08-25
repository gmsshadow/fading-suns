/**
 * Fading Suns 2nd Edition Revised — Urge and Hubris (p.144, p.162).
 *
 * Pure functions and data only; no Foundry VTT API references, so this module is
 * unit-testable in plain Node.
 *
 * Psi is shadowed by Urge and Theurgy by Hubris. Both are gained by breaking
 * taboos and shed only by great deeds, and both resist their partner trait:
 * "Psi and Theurgy will come into conflict when a character tries to raise one
 * trait past the level of his Urge or Hubris." (p.135)
 *
 * The rolls below are resistance rolls: the character must FAIL to gain Urge,
 * and must SUCCEED to shed it.
 */

/** The two occult shadows and the traits they resist. */
export const SHADOWS = Object.freeze({
  urge: { trait: "occult.psi", shadow: "occult.urge", label: "Urge" },
  hubris: { trait: "occult.theurgy", shadow: "occult.hubris", label: "Hubris" }
});

/* -------------------------------------------- */
/*  Gaining Urge (p.144)                        */
/* -------------------------------------------- */

/**
 * A taboo or deed, and the roll that resists or achieves it.
 * @typedef {object} OccultTrigger
 * @property {string} key
 * @property {string} label
 * @property {string} characteristic       Dot path of the characteristic rolled.
 * @property {string} [alternate]          Used instead when it is the primary trait.
 * @property {string[]} skills             The skill, or a choice of skills.
 * @property {[number, number]} levels     Levels gained or lost, at the GM's discretion.
 */

/** Taboos that awaken a psychic's Dark Twin (p.144). */
export const URGE_TABOOS = [
  { key: "refusingSacrament", label: "Refusing sacrament", characteristic: "spirit.ego", skills: ["Stoic Mind"], levels: [1, 1] },
  { key: "missingConfession", label: "Missing confession for more than a year", characteristic: "spirit.ego", skills: ["Focus"], levels: [1, 1] },
  { key: "inquisitorialTorture", label: "Suffering Inquisitorial torture", characteristic: "spirit.calm", skills: ["Stoic Mind"], levels: [1, 2] },
  { key: "excommunication", label: "Suffering excommunication", characteristic: "spirit.faith", skills: ["Stoic Mind"], levels: [2, 3] },
  { key: "othersUrge", label: "Exposure to another psychic's Urge", characteristic: "occult.psi", skills: ["Stoic Mind"], levels: [1, 1] },
  { key: "fumbledPower", label: "Fumbling a psychic power roll", characteristic: "occult.psi", skills: ["Stoic Mind", "Focus"], levels: [1, 1] },
  { key: "alienOccult", label: "Exposure to alien occult powers", characteristic: "spirit.faith", alternate: "spirit.ego", skills: ["Stoic Mind"], levels: [1, 1] },
  { key: "evilArtifact", label: "Exposure to an evil artifact", characteristic: "spirit.faith", alternate: "spirit.ego", skills: ["Stoic Mind"], levels: [1, 3] },
  { key: "vendetta", label: "Declaring a vendetta", characteristic: "spirit.passion", skills: ["Focus"], levels: [1, 1] },
  { key: "murder", label: "Murder", characteristic: "spirit.passion", skills: ["Focus"], levels: [1, 2] },
  { key: "stealing", label: "Stealing", characteristic: "mind.wits", skills: ["Focus"], levels: [1, 1] },
  { key: "rebellion", label: "Rebellion against house, Church or Emperor", characteristic: "mind.wits", skills: ["Focus"], levels: [1, 1] }
];

/** Deeds that dissolve the Dark Twin (p.144). */
export const URGE_DEEDS = [
  { key: "pilgrimage", label: "Pilgrimage", characteristic: "spirit.faith", skills: ["Vigor"], levels: [1, 1] },
  { key: "penitent", label: "Church mercy — becoming Penitent", characteristic: "spirit.faith", skills: ["Focus"], levels: [1, 2] },
  { key: "churchMission", label: "Performing a Church mission", characteristic: "spirit.faith", skills: ["Focus"], levels: [1, 1] },
  { key: "soulShard", label: "Exposure to a Soul Shard", characteristic: "occult.psi", skills: ["Stoic Mind", "Focus"], levels: [2, 3] },
  { key: "philosophersStone", label: "Exposure to a Philosopher's Stone", characteristic: "occult.psi", skills: ["Stoic Mind", "Focus"], levels: [1, 1] },
  { key: "selflessSacrifice", label: "Selfless sacrifice", characteristic: "spirit.passion", skills: ["Empathy"], levels: [1, 2] },
  { key: "psiClinic", label: "Exposure to a Second Republic Psi Clinic", characteristic: "spirit.introvert", skills: ["Stoic Mind", "Focus"], levels: [1, 2] }
];

/* -------------------------------------------- */
/*  Gaining Hubris (p.162)                      */
/* -------------------------------------------- */

/** Taboos that swell a theurge's pride (p.162). */
export const HUBRIS_TABOOS = [
  { key: "refusingSacrament", label: "Refusing sacrament", characteristic: "spirit.ego", skills: ["Stoic Mind"], levels: [1, 1] },
  { key: "missingConfession", label: "Missing confession for more than a month", characteristic: "spirit.ego", skills: ["Focus"], levels: [1, 1] },
  { key: "inquisitorialTorture", label: "Suffering Inquisitorial torture", characteristic: "spirit.calm", skills: ["Stoic Mind"], levels: [1, 2] },
  { key: "excommunication", label: "Suffering excommunication", characteristic: "spirit.faith", skills: ["Stoic Mind"], levels: [2, 3] },
  { key: "fumbledRite", label: "Fumbling a theurgy rite", characteristic: "occult.theurgy", skills: ["Focus"], levels: [1, 1] },
  { key: "alienOccult", label: "Exposure to alien occult powers", characteristic: "spirit.faith", skills: ["Stoic Mind"], levels: [1, 1] },
  { key: "evilArtifact", label: "Exposure to an evil artifact", characteristic: "spirit.faith", skills: ["Stoic Mind"], levels: [1, 3] },
  { key: "vendetta", label: "Declaring a vendetta", characteristic: "spirit.passion", skills: ["Focus"], levels: [1, 1] },
  { key: "murder", label: "Murder", characteristic: "spirit.passion", skills: ["Focus"], levels: [1, 2] },
  { key: "stealing", label: "Stealing", characteristic: "mind.wits", skills: ["Focus"], levels: [1, 1] },
  { key: "proscribedTech", label: "Inventing proscribed technology", characteristic: "spirit.ego", skills: ["Focus"], levels: [1, 1] },
  { key: "rebellion", label: "Rebellion against your sect", characteristic: "spirit.faith", skills: ["Focus"], levels: [1, 1] },
  { key: "ownSect", label: "Starting your own sect", characteristic: "spirit.faith", skills: ["Focus"], levels: [1, 3] }
];

/** Deeds that restore Grace (p.162). */
export const HUBRIS_DEEDS = [
  { key: "pilgrimage", label: "Pilgrimage", characteristic: "spirit.faith", skills: ["Vigor"], levels: [1, 1] },
  { key: "absolution", label: "Church mercy — absolution for sins", characteristic: "spirit.faith", skills: ["Focus"], levels: [1, 2] },
  { key: "forsaking", label: "Forsaking Theurgy", characteristic: "spirit.faith", skills: ["Focus"], levels: [3, 3], cost: "theurgy" },
  { key: "churchMission", label: "Performing a Church mission", characteristic: "spirit.faith", skills: ["Focus"], levels: [1, 1] },
  { key: "soulShard", label: "Exposure to a Soul Shard", characteristic: "occult.theurgy", skills: ["Stoic Mind", "Focus"], levels: [1, 2] },
  { key: "philosophersStone", label: "Exposure to a Philosopher's Stone", characteristic: "occult.theurgy", skills: ["Stoic Mind", "Focus"], levels: [1, 1] },
  { key: "selflessSacrifice", label: "Selfless sacrifice", characteristic: "spirit.passion", skills: ["Empathy"], levels: [1, 2] },
  { key: "relic", label: "Exposure to a relic — once per relic", characteristic: "spirit.faith", skills: ["Focus"], levels: [1, 1] },
  { key: "converting", label: "Converting heathens or heretics", characteristic: "spirit.faith", skills: ["Empathy"], levels: [1, 2] },
  { key: "convertingSects", label: "Converting other sects or orders", characteristic: "spirit.faith", skills: ["Charm", "Impress"], levels: [1, 1] },
  { key: "renewingFaith", label: "Renewing the faith of one who had lost it", characteristic: "spirit.faith", skills: ["Empathy"], levels: [1, 3] }
];

/**
 * The triggers for a given shadow.
 * @param {"urge"|"hubris"} shadow
 * @param {"taboo"|"deed"} kind
 * @returns {OccultTrigger[]}
 */
export function triggersFor(shadow, kind) {
  if (shadow === "urge") return kind === "taboo" ? URGE_TABOOS : URGE_DEEDS;
  return kind === "taboo" ? HUBRIS_TABOOS : HUBRIS_DEEDS;
}

/**
 * Look up one trigger.
 * @param {"urge"|"hubris"} shadow
 * @param {"taboo"|"deed"} kind
 * @param {string} key
 * @returns {OccultTrigger|null}
 */
export function findTrigger(shadow, kind, key) {
  return triggersFor(shadow, kind).find(t => t.key === key) ?? null;
}

/**
 * Which characteristic a trigger is rolled against.
 *
 * A few read "Faith (or Ego, if primary)", meaning the character's primary
 * Spirit trait of that pair is used (p.144).
 *
 * @param {OccultTrigger} trigger
 * @param {Record<string, boolean>} [primary]  Which Spirit traits are primary.
 * @returns {string}
 */
export function triggerCharacteristic(trigger, primary = {}) {
  if (!trigger?.alternate) return trigger?.characteristic ?? "";
  return primary[trigger.alternate] ? trigger.alternate : trigger.characteristic;
}

/**
 * How a resistance roll resolves.
 *
 * Taboos are resisted — "the character must fail this roll or else gain Urge".
 * Deeds are the other way about: the roll must succeed to shed a level.
 *
 * @param {object} options
 * @param {"taboo"|"deed"} options.kind
 * @param {boolean} options.success        Whether the Goal Roll succeeded.
 * @param {OccultTrigger} options.trigger
 * @param {number} [options.levels]        The gamemaster's choice within the band.
 * @returns {{change: number, applied: boolean}}  Change is signed: + gains, - sheds.
 */
export function resolveTrigger({ kind, success, trigger, levels }) {
  const [min, max] = trigger?.levels ?? [1, 1];
  const amount = Math.min(max, Math.max(min, levels ?? min));

  if (kind === "taboo") {
    return success ? { change: 0, applied: false } : { change: amount, applied: true };
  }
  return success ? { change: -amount, applied: true } : { change: 0, applied: false };
}

/* -------------------------------------------- */
/*  Resolving conflicts (p.135)                 */
/* -------------------------------------------- */

/**
 * Whether raising an occult trait needs a contest of wills first.
 *
 * "Psi and Theurgy will come into conflict when a character tries to raise one
 *  trait past the level of his Urge or Hubris." Raising Urge or Hubris needs no
 *  such contest — they "simply rise to whatever level is called for".
 *
 * @param {number} trait    Current Psi or Theurgy.
 * @param {number} shadow   Current Urge or Hubris.
 * @returns {boolean}
 */
export function requiresContest(trait, shadow) {
  return (trait ?? 0) >= (shadow ?? 0) && (shadow ?? 0) > 0;
}

/**
 * The rolls open to a character contesting their shadow (p.135).
 * @param {"urge"|"hubris"} shadow
 * @returns {{characteristic: string, skills: string[]}}
 */
export function contestRoll(shadow) {
  if (shadow === "urge") {
    return { characteristic: "mind.wits", skills: ["Stoic Mind", "Charm", "Impress", "Knavery"] };
  }
  return { characteristic: "spirit.faith", skills: ["Empathy", "Vigor", "Charm"] };
}

/* -------------------------------------------- */
/*  A deal with the devil (p.135)               */
/* -------------------------------------------- */

/**
 * What comes of rolling the shadow in place of the trait.
 *
 * "A character may choose to use his Urge or Hubris levels instead of his Psi or
 *  Theurgy for any roll requiring Psi or Theurgy... However, if the roll is
 *  successful, this deal with the devil will have consequences... If the roll
 *  failed, there is no dire effect."
 *
 * @param {"urge"|"hubris"} shadow
 * @param {boolean} success
 * @returns {{consequence: boolean, label: string}}
 */
export function devilsBargain(shadow, success) {
  if (!success) return { consequence: false, label: "None" };
  return {
    consequence: true,
    label: shadow === "urge" ? "DarkTwinAwakens" : "IllEffectsSpread"
  };
}
