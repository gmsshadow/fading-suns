/**
 * Fading Suns 2nd Edition Revised — core resolution mathematics.
 *
 * This module is deliberately free of any Foundry VTT API references so that it
 * can be unit tested in plain Node. Everything here is a pure function.
 *
 * Rulebook anchors (Core Rules, 2nd Edition Revised):
 *   p.64  Goal Roll, Victory Chart
 *   p.65  Effect Dice
 *   p.66  Automatic Success and Failure, Excessive Goal Numbers / Extended Victory Chart
 *   p.67  Critical Success, Critical Failure
 *   p.69  Optional Rule: Accents (accented Victory Charts)
 */

/* -------------------------------------------- */
/*  Victory Charts (p.64, p.69)                 */
/* -------------------------------------------- */

/**
 * A single band of a Victory Chart.
 * @typedef {object} VictoryBand
 * @property {number} min           Lowest number of successes in this band.
 * @property {number} max           Highest number of successes in this band.
 * @property {number} vp            Victory Points awarded.
 * @property {number} vd            Victory Dice awarded.
 * @property {string} accomplishment  Localisation key suffix for the description.
 */

/**
 * The standard Victory Chart (p.64).
 * One victory point per three successes, rounded down, with a floor of one.
 * @type {VictoryBand[]}
 */
export const VICTORY_CHART_STANDARD = [
  { min: 1, max: 2, vp: 1, vd: 0, accomplishment: "BarelySatisfactory" },
  { min: 3, max: 5, vp: 1, vd: 1, accomplishment: "Mediocre" },
  { min: 6, max: 8, vp: 2, vd: 2, accomplishment: "PrettyGood" },
  { min: 9, max: 11, vp: 3, vd: 3, accomplishment: "GoodJob" },
  { min: 12, max: 14, vp: 4, vd: 4, accomplishment: "Excellent" },
  { min: 15, max: 17, vp: 5, vd: 5, accomplishment: "Brilliant" },
  { min: 18, max: 20, vp: 6, vd: 6, accomplishment: "Virtuoso" }
];

/**
 * Victory Chart used when a roll has been positively accented (p.69).
 * One victory point per two successes, rounded down, with a floor of one.
 * @type {VictoryBand[]}
 */
export const VICTORY_CHART_ACCENT_POSITIVE = [
  { min: 1, max: 2, vp: 1, vd: 0, accomplishment: "BarelySatisfactory" },
  { min: 3, max: 4, vp: 1, vd: 1, accomplishment: "Mediocre" },
  { min: 5, max: 6, vp: 2, vd: 2, accomplishment: "PrettyGood" },
  { min: 7, max: 8, vp: 3, vd: 3, accomplishment: "GoodJob" },
  { min: 9, max: 10, vp: 4, vd: 4, accomplishment: "Excellent" },
  { min: 11, max: 12, vp: 5, vd: 5, accomplishment: "Brilliant" },
  { min: 13, max: 14, vp: 6, vd: 6, accomplishment: "Virtuoso" },
  { min: 15, max: 16, vp: 7, vd: 7, accomplishment: "Virtuoso" },
  { min: 17, max: 20, vp: 8, vd: 8, accomplishment: "Virtuoso" }
];

/**
 * Victory Chart used when a roll has been negatively accented (p.69).
 * One victory point per four successes, rounded down, with a floor of one.
 * @type {VictoryBand[]}
 */
export const VICTORY_CHART_ACCENT_NEGATIVE = [
  { min: 1, max: 4, vp: 1, vd: 0, accomplishment: "BarelySatisfactory" },
  { min: 5, max: 8, vp: 1, vd: 1, accomplishment: "Mediocre" },
  { min: 9, max: 12, vp: 2, vd: 2, accomplishment: "PrettyGood" },
  { min: 13, max: 16, vp: 3, vd: 3, accomplishment: "GoodJob" },
  { min: 17, max: 20, vp: 4, vd: 4, accomplishment: "Excellent" }
];

/**
 * Select the Victory Chart appropriate to an accent value (p.69).
 * @param {number} accent   The accent applied to the roll; 0 for an unaccented roll.
 * @returns {VictoryBand[]}
 */
export function chartForAccent(accent = 0) {
  if (accent > 0) return VICTORY_CHART_ACCENT_POSITIVE;
  if (accent < 0) return VICTORY_CHART_ACCENT_NEGATIVE;
  return VICTORY_CHART_STANDARD;
}

/**
 * Look up a number of successes on a Victory Chart.
 * @param {number} successes   The (possibly accented) number rolled.
 * @param {number} [accent=0]  The accent applied to the roll.
 * @returns {VictoryBand}
 */
export function lookupVictoryBand(successes, accent = 0) {
  const chart = chartForAccent(accent);
  const clamped = Math.max(1, Math.min(20, Math.round(successes)));
  return chart.find(b => clamped >= b.min && clamped <= b.max) ?? chart[chart.length - 1];
}

/* -------------------------------------------- */
/*  Extended Victory Chart (p.66)               */
/* -------------------------------------------- */

/**
 * Bonus Victory Points granted by an excessive Goal Number (p.66).
 *
 * The printed Extended Victory Chart runs 21–23 => +1, 24–26 => +2, 27–29 => +3
 * and so on in bands of three, which is `floor((goal - 18) / 3)`.
 *
 * @param {number} goal   The final Goal Number.
 * @returns {number}      Bonus Victory Points, or 0 for Goal Numbers of 20 or less.
 */
export function excessiveGoalBonus(goal) {
  if (!Number.isFinite(goal) || goal <= 20) return 0;
  return Math.floor((goal - 18) / 3);
}

/* -------------------------------------------- */
/*  Goal Roll resolution (p.64, p.66, p.67)     */
/* -------------------------------------------- */

/**
 * The resolved outcome of a Goal Roll.
 * @typedef {object} GoalRollOutcome
 * @property {number}  natural           The unmodified d20 result.
 * @property {number}  accent            The accent applied (p.69); 0 if unaccented.
 * @property {number}  successes         The number used for the Victory Chart lookup.
 * @property {number}  goal              The final Goal Number.
 * @property {boolean} success           Whether the action succeeded.
 * @property {boolean} automaticSuccess  Natural "1", or accented to "1" (p.66).
 * @property {boolean} automaticFailure  Natural "19", or accented to "19" (p.66).
 * @property {boolean} criticalSuccess   Result exactly equals the Goal Number (p.67).
 * @property {boolean} criticalFailure   Natural "20", or accented above 20 (p.66/p.67).
 * @property {number}  victoryPoints     Final Victory Points after bonuses and doubling.
 * @property {number}  victoryDice       Victory Dice available as damage dice (p.65).
 * @property {number}  excessiveBonus    Bonus VP from an excessive Goal Number (p.66).
 * @property {string}  accomplishment    Localisation key suffix describing the result.
 */

/**
 * Resolve a Goal Roll against a Goal Number.
 *
 * Ordering follows the rulebook precisely:
 *   1. Natural 1 / 19 / 20 are resolved first and are unaffected by accents (p.69).
 *   2. Otherwise the accented result is evaluated; a result that becomes 1, 19 or
 *      above 20 through accenting is treated as if naturally rolled (p.69).
 *   3. Success is result <= Goal Number (p.64).
 *   4. Victory Points come from the Victory Chart, plus any excessive Goal Number
 *      bonus, and the total is doubled on a critical success (p.66/p.67).
 *
 * @param {object} options
 * @param {number} options.natural      The raw d20 result, 1–20.
 * @param {number} options.goal         The final Goal Number, after all modifiers.
 * @param {number} [options.accent=0]   Accent applied to the roll (p.69).
 * @returns {GoalRollOutcome}
 */
export function resolveGoalRoll({ natural, goal, accent = 0 }) {
  const die = Math.max(1, Math.min(20, Math.round(natural)));
  const goalNumber = Math.round(goal);
  const accented = accent !== 0;

  // The value the roll is actually judged on.
  let successes = accented ? die + accent : die;

  let automaticSuccess = false;
  let automaticFailure = false;
  let criticalFailure = false;

  // Step 1 — natural results take precedence and ignore accents entirely (p.66, p.69).
  if (die === 1) {
    automaticSuccess = true;
    successes = 1;
  } else if (die === 19) {
    automaticFailure = true;
    successes = 19;
  } else if (die === 20) {
    criticalFailure = true;
    successes = 20;
  } else if (accented) {
    // Step 2 — an accent can push a roll into an automatic result (p.69).
    if (successes <= 1) {
      automaticSuccess = true;
      successes = 1;
    } else if (successes === 19) {
      automaticFailure = true;
    } else if (successes >= 20) {
      criticalFailure = true;
      successes = 20;
    }
  }

  // Step 3 — determine success (p.64).
  const failed = automaticFailure || criticalFailure;
  const success = automaticSuccess || (!failed && successes <= goalNumber);

  // Critical success: the result exactly equals the Goal Number (p.67). Where the
  // Goal Number exceeds 20 a result of "18" stands in for it instead (p.66).
  const critTarget = goalNumber > 20 ? 18 : goalNumber;
  const criticalSuccess = success && !failed && successes === critTarget;

  // Step 4 — Victory Points (p.64, p.66, p.67).
  const band = lookupVictoryBand(successes, accent);
  const excessiveBonus = excessiveGoalBonus(goalNumber);

  let victoryPoints = 0;
  let victoryDice = 0;
  if (success) {
    victoryPoints = band.vp + excessiveBonus;
    victoryDice = band.vd + excessiveBonus;
    if (criticalSuccess) {
      victoryPoints *= 2;
      victoryDice *= 2;
    }
  }

  return {
    natural: die,
    accent,
    successes,
    goal: goalNumber,
    success,
    automaticSuccess,
    automaticFailure,
    criticalSuccess,
    criticalFailure,
    victoryPoints,
    victoryDice,
    excessiveBonus,
    accomplishment: success ? band.accomplishment : "Failure"
  };
}

/* -------------------------------------------- */
/*  Contested Actions (p.67)                    */
/* -------------------------------------------- */

/**
 * Resolve a contested action by subtracting the lower successes from the higher (p.67).
 * @param {GoalRollOutcome} a
 * @param {GoalRollOutcome} b
 * @returns {{winner: ("a"|"b"|"tie"), margin: number}}
 */
export function resolveContest(a, b) {
  const sa = a.success ? a.successes : 0;
  const sb = b.success ? b.successes : 0;
  if (sa === sb) return { winner: "tie", margin: 0 };
  return sa > sb ? { winner: "a", margin: sa - sb } : { winner: "b", margin: sb - sa };
}

/* -------------------------------------------- */
/*  Vitality (p.125)                            */
/* -------------------------------------------- */

/**
 * Wound penalty applied to all tasks as vital levels are lost (p.125).
 *
 * A character has five vital levels beneath their Endurance levels. Losing the
 * first makes all tasks Hard (-2), the second Demanding (-4), and so on down the
 * standard Penalty Chart (p.64) to Herculean (-10).
 *
 * @param {number} remaining   Current Vitality value.
 * @returns {number}           A penalty of 0 to -10.
 */
export function vitalityPenalty(remaining) {
  const value = Number.isFinite(remaining) ? remaining : 0;
  if (value >= 5) return 0;
  return Math.max(-10, -2 * (5 - Math.max(0, value)));
}
