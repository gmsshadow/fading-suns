/**
 * Fading Suns 2nd Edition Revised — Effect Dice (p.65).
 *
 * Pure functions only; no Foundry VTT API references, so this module is
 * unit-testable in plain Node.
 *
 * "Results of 1, 2, 3, or 4 are successful; results of 5 or 6 are failures. Each
 *  successful die generates one point: a 'wound' point in the case of damage or
 *  an 'armor' point in the case of armor." (p.65)
 */

/** The highest d6 face that counts as a success on an effect die (p.65). */
export const EFFECT_DIE_SUCCESS_THRESHOLD = 4;

/** Goal Number per die when substituting a d20 for a d6 effect die (p.65). */
export const EFFECT_D20_SUCCESS_THRESHOLD = 13;

/**
 * Count how many effect dice succeeded.
 * @param {number[]} results          Individual die faces.
 * @param {number} [threshold]        Success threshold; defaults to the d6 value of 4.
 * @returns {number}                  Number of wound or armour points generated.
 */
export function countEffectSuccesses(results, threshold = EFFECT_DIE_SUCCESS_THRESHOLD) {
  if (!Array.isArray(results)) return 0;
  return results.reduce((n, r) => n + (r <= threshold ? 1 : 0), 0);
}

/**
 * Work out the damage dice pool for an attack (p.65).
 *
 * "Victory points convert to victory dice on a 1-for-1 basis. A player does not
 *  have to use the entire number of victory dice generated from victory points —
 *  she may choose to 'pull her punch' by using as few as one die. The weapon dice
 *  must still be used in full."
 *
 * @param {object} options
 * @param {number} options.weaponDice           The weapon's own damage dice.
 * @param {number} [options.victoryDice=0]      Victory Dice available from the attack roll.
 * @param {number|null} [options.pulledPunch=null]  Victory Dice the attacker chooses to use.
 * @returns {{weaponDice: number, victoryDice: number, total: number}}
 */
export function damagePool({ weaponDice, victoryDice = 0, pulledPunch = null }) {
  const weapon = Math.max(0, Math.round(weaponDice ?? 0));
  const available = Math.max(0, Math.round(victoryDice ?? 0));

  let used = available;
  if (pulledPunch !== null && pulledPunch !== undefined) {
    // At least one victory die must be used if any are available.
    used = Math.min(available, Math.max(available > 0 ? 1 : 0, Math.round(pulledPunch)));
  }

  return { weaponDice: weapon, victoryDice: used, total: weapon + used };
}

/**
 * Apply wound points against armour, then Vitality (p.65).
 * "Each armor point subtracts one wound point before damage is applied."
 * @param {number} woundPoints
 * @param {number} armourPoints
 * @returns {number}   Wound points that actually reach the target's Vitality.
 */
export function applyArmour(woundPoints, armourPoints) {
  return Math.max(0, Math.round(woundPoints ?? 0) - Math.max(0, Math.round(armourPoints ?? 0)));
}
