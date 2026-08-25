/**
 * Fading Suns 2nd Edition Revised — combat mathematics.
 *
 * Pure functions only; no Foundry VTT API references, so this module is
 * unit-testable in plain Node.
 *
 * Rulebook anchors:
 *   p.64   Multiple actions, the Penalty Chart
 *   p.164  Initiative
 *   p.174  Range bands
 *   p.296  Weapons Key: Strength requirement, range penalties
 *   p.296  Energy Shields Key: activation threshold and absorption
 */

/* -------------------------------------------- */
/*  Range (p.174, p.296)                        */
/* -------------------------------------------- */

/** Goal penalties by range band (p.296). */
export const RANGE_PENALTIES = Object.freeze({
  short: 0,
  long: -2,
  extreme: -4
});

/**
 * Which band a distance falls into.
 *
 * "RNG: Range in meters (Short/Long Range; any distance past long is Extreme)."
 *
 * @param {number} distance   Metres between attacker and target.
 * @param {number} short      The weapon's short range.
 * @param {number} long       The weapon's long range.
 * @returns {"short"|"long"|"extreme"}
 */
export function rangeBand(distance, short, long) {
  if (!Number.isFinite(distance) || distance <= short) return "short";
  if (distance <= long) return "long";
  return "extreme";
}

/**
 * The goal modifier for firing at a given distance.
 * @param {number} distance
 * @param {number} short
 * @param {number} long
 * @returns {number}
 */
export function rangePenalty(distance, short, long) {
  return RANGE_PENALTIES[rangeBand(distance, short, long)];
}

/* -------------------------------------------- */
/*  Strength requirement (p.296)                */
/* -------------------------------------------- */

/** The penalty for wielding a weapon too heavy for the character (p.296). */
export const UNDER_STRENGTH_PENALTY = -2;

/**
 * "STR: Strength required to wield the weapon (otherwise -2 goal roll)."
 * @param {number} required
 * @param {number} strength
 * @returns {number}
 */
export function strengthPenalty(required, strength) {
  if (!required || strength >= required) return 0;
  return UNDER_STRENGTH_PENALTY;
}

/* -------------------------------------------- */
/*  Multiple actions (p.64)                     */
/* -------------------------------------------- */

/** The most actions a character may attempt in one turn (p.64). */
export const MAX_ACTIONS = 3;

/**
 * The penalty for attempting several actions in one turn.
 *
 * The Penalty Chart gives Demanding (-4) for two actions and Tough (-6) for
 * three, which is where the rules cap it (p.64).
 *
 * @param {number} actions   How many actions are being attempted this turn.
 * @returns {number}
 */
export function multipleActionPenalty(actions) {
  const count = Math.max(1, Math.round(actions ?? 1));
  if (count <= 1) return 0;
  if (count === 2) return -4;
  return -6;
}

/* -------------------------------------------- */
/*  Initiative (p.164)                          */
/* -------------------------------------------- */

/**
 * A character's initiative rating.
 *
 * "Each character's rating is equal to the skill he is using, and the character
 *  with the highest rating acts first... In the case of ties, characters compare
 *  their Wits characteristics. If Wits scores tie, the actions are considered to
 *  be simultaneous." (p.164)
 *
 * Initiative is not rolled. Wits is folded in as a hundredth so that a tracker
 * sorting on one number breaks ties the way the rulebook says, while leaving the
 * whole part readable as the skill rating.
 *
 * "Note also that multiple action penalties and wound penalties are applied to
 *  initiative ratings in addition to goal rolls." (p.164)
 *
 * @param {object} options
 * @param {number} options.skill              Rating of the skill being used.
 * @param {number} [options.wits=0]           For breaking ties.
 * @param {number} [options.modifier=0]       From the weapon or combat action.
 * @param {number} [options.woundPenalty=0]   From lost vital levels (p.125).
 * @param {number} [options.actions=1]        Actions attempted this turn.
 * @returns {number}
 */
export function initiativeValue({
  skill, wits = 0, modifier = 0, woundPenalty = 0, actions = 1
} = {}) {
  const rating = (skill ?? 0) + modifier + woundPenalty + multipleActionPenalty(actions);
  return Number((rating + Math.min(wits, 99) / 100).toFixed(2));
}

/**
 * Whether two initiative ratings are genuinely simultaneous — equal skill and
 * equal Wits, which the rulebook resolves as happening at the same moment.
 * @param {number} a
 * @param {number} b
 * @returns {boolean}
 */
export function isSimultaneous(a, b) {
  return a === b;
}

/* -------------------------------------------- */
/*  Energy shields (p.296)                      */
/* -------------------------------------------- */

/**
 * How much damage an energy shield stops.
 *
 * "Protection: The first number is the minimum amount of damage required to
 *  activate the shield / the second number is the maximum amount of damage the
 *  shield can block. Hits: Number of activations per fusion cel." (p.296)
 *
 * A light blow therefore passes straight through without troubling the shield,
 * and a heavy one is capped at the shield's maximum with the remainder getting
 * through. Either way only an activation costs a hit.
 *
 * @param {number} damage      Wound points arriving.
 * @param {object} shield
 * @param {number} shield.min  Damage needed to activate.
 * @param {number} shield.max  Most it can block.
 * @param {number} shield.hits Activations left on the cell.
 * @returns {{blocked: number, through: number, activated: boolean, hitsUsed: number}}
 */
export function energyShieldAbsorb(damage, { min = 0, max = 0, hits = 0 } = {}) {
  const incoming = Math.max(0, Math.round(damage ?? 0));

  // No charge left, or too light to trigger it.
  if (hits <= 0 || incoming < min) {
    return { blocked: 0, through: incoming, activated: false, hitsUsed: 0 };
  }

  const blocked = Math.min(incoming, max);
  return { blocked, through: incoming - blocked, activated: true, hitsUsed: 1 };
}

/* -------------------------------------------- */
/*  Assembling an attack (p.296)                */
/* -------------------------------------------- */

/**
 * Every modifier bearing on an attack roll, itemised so a chat card can show
 * the player where the number came from.
 *
 * @param {object} options
 * @param {number} [options.weaponModifier=0]   The weapon's own goal modifier.
 * @param {number} [options.actionModifier=0]   From a combat action.
 * @param {number} [options.distance=null]      Metres to the target, if known.
 * @param {number} [options.short=0]
 * @param {number} [options.long=0]
 * @param {number} [options.required=0]         Strength the weapon needs.
 * @param {number} [options.strength=0]         The wielder's Strength.
 * @param {number} [options.actions=1]
 * @param {number} [options.situational=0]
 * @returns {{total: number, parts: Array<{label: string, value: number}>}}
 */
export function attackModifiers({
  weaponModifier = 0, actionModifier = 0,
  distance = null, short = 0, long = 0,
  required = 0, strength = 0,
  actions = 1, situational = 0
} = {}) {
  const parts = [];

  if (weaponModifier) parts.push({ label: "Weapon", value: weaponModifier });
  if (actionModifier) parts.push({ label: "Action", value: actionModifier });

  if (distance !== null && long > 0) {
    const band = rangeBand(distance, short, long);
    const penalty = RANGE_PENALTIES[band];
    if (penalty) parts.push({ label: band === "long" ? "LongRange" : "ExtremeRange", value: penalty });
  }

  const understrength = strengthPenalty(required, strength);
  if (understrength) parts.push({ label: "UnderStrength", value: understrength });

  const multiple = multipleActionPenalty(actions);
  if (multiple) parts.push({ label: "MultipleActions", value: multiple });

  if (situational) parts.push({ label: "Situational", value: situational });

  return { total: parts.reduce((n, p) => n + p.value, 0), parts };
}
