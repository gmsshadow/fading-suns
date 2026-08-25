/**
 * Fading Suns 2nd Edition Revised — the alien races (p.83, p.88).
 *
 * Pure data and functions; no Foundry VTT API references, so this module is
 * unit-testable in plain Node.
 *
 * Races are not a bundle of bonuses. They move the *bases* a character starts
 * from and the *maxima* they may reach: a Vorox begins with Strength 4 and may
 * climb to 12, where a human begins at 3 and stops at 10. Some also fix a Spirit
 * trait as primary, grant a language for nothing, or forbid the occult outright.
 *
 * "A player must spend some of her Extra points on special powers and abilities
 *  unique to the character's race — she must pay for a royal Vorox's extra limbs
 *  and poison claw." (p.88)
 */

/** Where a human character starts and stops (p.87, p.72). */
export const HUMAN_BASE = 3;
export const HUMAN_MAX = 10;

/**
 * A playable race.
 * @typedef {object} Race
 * @property {string} key
 * @property {string} label
 * @property {number} cost                              Extra points to play (p.88).
 * @property {Record<string, number>} bases             Characteristic dot path to starting value.
 * @property {Record<string, number>} maxima            Characteristic dot path to ceiling.
 * @property {string} [forcedPrimary]                   A Spirit trait that is always primary.
 * @property {string} [freeLanguage]                    Granted at no cost.
 * @property {boolean} [noOccult]                       Cannot awaken Psi or Theurgy.
 * @property {Record<string, number>} [tourAllowance]   Overrides to Extra Stage skill allowances.
 */

/** @type {Record<string, Race>} */
export const RACES = {
  human: {
    key: "human",
    label: "Human",
    cost: 0,
    bases: {},
    maxima: {}
  },

  urObun: {
    key: "urObun",
    label: "Ur-Obun",
    // "Ur-Obun characters cost two Extras points to play." (p.88)
    cost: 2,
    bases: { "body.dexterity": 4 },
    maxima: { "body.strength": 9, "body.endurance": 9 },
    freeLanguage: "Speak (Obunish)",
    // "Psi (base 1; 3 pts) or Theurgy (base 1; 3 pts)" — the player picks one.
    occultChoice: ["occult.psi", "occult.theurgy"],
    // "Their first Tour gives them only 12 pts for skills. (If an Obun wishes to
    //  become an Imperial Cohort, he gains only 9 pts for skills.)" (p.83)
    tourAllowance: {
      "Tour of Duty": 12,
      "Cohort Tour of Duty": 9
    },
    // "If the character purchases the Natal Psi Psychic Awakening history, he
    //  adds the Psi 3 to his current rating." (p.83)
    occultAdds: true
  },

  urUkar: {
    key: "urUkar",
    label: "Ur-Ukar",
    cost: 0,
    bases: { "body.dexterity": 4, "mind.tech": 4, "occult.psi": 1, "occult.urge": 1 },
    maxima: { "body.strength": 9, "body.endurance": 9 },
    freeLanguage: "Speak (Ukarish)",
    occultAdds: true
  },

  vorox: {
    key: "vorox",
    label: "Vorox",
    // "10 Extras points (16 pts for a royal Vorox with poison claw)" (p.88)
    cost: 10,
    royalCost: 16,
    bases: {
      "body.strength": 4, "body.endurance": 4,
      "mind.wits": 2, "mind.tech": 1
    },
    maxima: { "body.strength": 12, "body.endurance": 12 },
    forcedPrimary: "spirit.passion",
    freeLanguage: "Speak (Voroxish)",
    // "No Occult (Cannot awaken Psi or Theurgy)" (p.83)
    noOccult: true
  }
};

/**
 * Look up a race, falling back to human.
 * @param {string} key
 * @returns {Race}
 */
export function getRace(key) {
  return RACES[key] ?? RACES.human;
}

/* -------------------------------------------- */
/*  Bases and maxima                            */
/* -------------------------------------------- */

/**
 * Where a character of this race starts in a given characteristic.
 *
 * Occult traits begin at zero for everyone unless the race says otherwise, and
 * Spirit traits are handled by the primary/opposed pairing rather than here.
 *
 * @param {string} raceKey
 * @param {string} path     Dot path, e.g. "body.strength".
 * @returns {number}
 */
export function characteristicBase(raceKey, path) {
  const race = getRace(raceKey);
  if (path in race.bases) return race.bases[path];
  if (path.startsWith("occult.")) return 0;
  if (path.startsWith("spirit.")) return HUMAN_BASE;
  return HUMAN_BASE;
}

/**
 * The highest a character of this race may take a characteristic.
 * @param {string} raceKey
 * @param {string} path
 * @returns {number}
 */
export function characteristicMax(raceKey, path) {
  const race = getRace(raceKey);
  return race.maxima[path] ?? HUMAN_MAX;
}

/**
 * Every characteristic whose base or maximum this race moves, for display.
 * @param {string} raceKey
 * @returns {Array<{path: string, base: number|null, max: number|null}>}
 */
export function racialModifiers(raceKey) {
  const race = getRace(raceKey);
  const paths = new Set([...Object.keys(race.bases), ...Object.keys(race.maxima)]);

  return [...paths].sort().map(path => ({
    path,
    base: race.bases[path] ?? null,
    max: race.maxima[path] ?? null
  }));
}

/* -------------------------------------------- */
/*  Restrictions                                */
/* -------------------------------------------- */

/**
 * Whether this race may take an occult Extra Stage.
 * "No Occult (Cannot awaken Psi or Theurgy)" — the Vorox affliction (p.83).
 * @param {string} raceKey
 * @returns {boolean}
 */
export function canAwakenOccult(raceKey) {
  return !getRace(raceKey).noOccult;
}

/**
 * The skill allowance a Tour of Duty grants this race.
 *
 * The Ur-Obun get less, because part of the tour is spent being Obun about it:
 * 12 points on a first Tour rather than 14, and 9 as a Cohort rather than 11.
 *
 * @param {string} raceKey
 * @param {string} stageName   The Extra Stage's name, without its type prefix.
 * @param {number} printed     The allowance the stage itself declares.
 * @returns {number}
 */
export function tourAllowance(raceKey, stageName, printed) {
  const overrides = getRace(raceKey).tourAllowance ?? {};
  return overrides[stageName] ?? printed;
}

/**
 * What playing this race costs in Extra points (p.88).
 * @param {string} raceKey
 * @param {boolean} [royal]   A royal Vorox, with the poison claw.
 * @returns {number}
 */
export function racialCost(raceKey, royal = false) {
  const race = getRace(raceKey);
  return royal && race.royalCost ? race.royalCost : race.cost;
}

/**
 * Whether an occult Extra Stage sets the trait or adds to it.
 *
 * Ur-Obun and Ur-Ukar already have a rating, and "adds the Psi 3 to his current
 * rating" (p.83), where a human's Natal Psi simply sets it to 3.
 *
 * @param {string} raceKey
 * @returns {boolean}
 */
export function occultAdds(raceKey) {
  return !!getRace(raceKey).occultAdds;
}
