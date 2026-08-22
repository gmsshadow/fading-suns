/**
 * Fading Suns 2nd Edition Revised — lifepath grant resolution (p.70–p.89).
 *
 * Pure functions only; no Foundry VTT API references, so this module is
 * unit-testable in plain Node.
 *
 * A Character History stage grants a bundle of modifications, written in the
 * rulebook as, for example:
 *
 *   Hawkwood: Characteristics—Strength +1, Dexterity +1, Wits +1,
 *   Extrovert (primary) +2; Skills—Melee +1, Etiquette 1, Lore (Heraldry) 1,
 *   Read Urthish (2 pts); Blessing—Unyielding; Curse—Prideful
 *
 * Four shapes appear in that one line and all four must round-trip:
 *
 *   characteristic   a delta, optionally flagging the trait as primary
 *   skill            a delta, optionally against a named specialty
 *   language         a skill that costs a fixed number of points, refundable
 *                    elsewhere if the character already speaks or reads it (p.72)
 *   blessing/curse   a reference to a Blessing or Curse item
 *
 * Some stages offer a choice — "Extrovert or Introvert +1" — which is modelled
 * as a grant of kind "choice" carrying a list of options.
 */

/** Every grant kind a stage may contain. */
export const GRANT_KINDS = ["characteristic", "skill", "language", "blessing", "curse", "choice"];

/**
 * The highest rating a beginning character may have in any characteristic or
 * skill (p.72). Excess levels must be redistributed rather than lost.
 */
export const STARTING_CAP = 8;

/* -------------------------------------------- */
/*  Choice resolution                           */
/* -------------------------------------------- */

/**
 * Collapse choice grants into concrete grants using the player's selections.
 *
 * @param {object[]} grants                Grants as authored on the stage.
 * @param {Record<string, number>} [choices]  Map of choice id to selected option index.
 * @returns {{grants: object[], pending: object[]}}
 *          `grants` holds the resolved list; `pending` holds any choice that has
 *          not been decided yet, so a wizard can prompt for it.
 */
export function resolveChoices(grants, choices = {}) {
  const resolved = [];
  const pending = [];

  for (const grant of grants ?? []) {
    if (grant.kind !== "choice") {
      resolved.push(grant);
      continue;
    }
    const selection = choices[grant.id];
    const option = Number.isInteger(selection) ? grant.options?.[selection] : undefined;
    if (!option) {
      pending.push(grant);
      continue;
    }
    for (const inner of option.grants ?? []) resolved.push(inner);
  }

  return { grants: resolved, pending };
}

/* -------------------------------------------- */
/*  Applying grants                             */
/* -------------------------------------------- */

/**
 * The running state a lifepath is applied to.
 * @typedef {object} LifepathState
 * @property {Record<string, number>} characteristics  Keyed by dot path, e.g. "body.strength".
 * @property {Record<string, boolean>} primary         Spirit traits flagged primary.
 * @property {Record<string, number>} skills           Keyed by display label, e.g. "Lore (Heraldry)".
 * @property {string[]} blessings                      Item uuids.
 * @property {string[]} curses                         Item uuids.
 * @property {number} sparepoints                      Points refunded by duplicate languages (p.72).
 */

/**
 * Create an empty lifepath state seeded with the given starting values.
 * @param {object} [seed]
 * @param {Record<string, number>} [seed.characteristics]
 * @param {Record<string, number>} [seed.skills]
 * @param {Record<string, boolean>} [seed.primary]
 * @returns {LifepathState}
 */
export function createState({ characteristics = {}, skills = {}, primary = {} } = {}) {
  return {
    characteristics: { ...characteristics },
    primary: { ...primary },
    skills: { ...skills },
    blessings: [],
    curses: [],
    sparePoints: 0
  };
}

/**
 * The display label for a skill grant, matching how the rulebook writes it.
 * @param {object} grant
 * @returns {string}
 */
export function skillLabel(grant) {
  return grant.specialty ? `${grant.key} (${grant.specialty})` : grant.key;
}

/**
 * Apply one stage's grants to a running state.
 *
 * All bonuses are cumulative across stages: a character who learns Remedy 1 in
 * their Apprenticeship and Remedy 1 again in their Early Career ends with
 * Remedy 2 (p.72).
 *
 * @param {LifepathState} state   Mutated in place and returned.
 * @param {object[]} grants       Grants with all choices already resolved.
 * @returns {LifepathState}
 */
export function applyGrants(state, grants) {
  for (const grant of grants ?? []) {
    switch (grant.kind) {
      case "characteristic": {
        const current = state.characteristics[grant.key] ?? 0;
        state.characteristics[grant.key] = current + (grant.value ?? 0);
        // "Faith (primary) +2" both raises the trait and marks it primary (p.93).
        if (grant.primary) {
          state.primary[grant.key] = true;
          const opposed = opposedTrait(grant.key);
          if (opposed) state.primary[opposed] = false;
        }
        break;
      }

      case "skill": {
        const label = skillLabel(grant);
        state.skills[label] = (state.skills[label] ?? 0) + (grant.value ?? 0);
        break;
      }

      case "language": {
        // "If a successive stage provides a character with a language he already
        //  speaks or reads, he may use those points elsewhere." (p.72)
        const label = skillLabel(grant);
        if (state.skills[label] > 0) state.sparePoints += grant.points ?? 0;
        else state.skills[label] = grant.value ?? 1;
        break;
      }

      case "blessing":
        if (!state.blessings.includes(grant.key)) state.blessings.push(grant.key);
        break;

      case "curse":
        if (!state.curses.includes(grant.key)) state.curses.push(grant.key);
        break;

      case "choice":
        throw new Error("applyGrants received an unresolved choice; call resolveChoices first.");

      default:
        throw new Error(`Unknown grant kind "${grant.kind}"`);
    }
  }
  return state;
}

/**
 * Apply a sequence of stages in order.
 * @param {LifepathState} state
 * @param {Array<{grants: object[]}>} stages
 * @param {Record<string, number>} [choices]
 * @returns {{state: LifepathState, pending: object[]}}
 */
export function applyStages(state, stages, choices = {}) {
  const pending = [];
  for (const stage of stages ?? []) {
    const resolved = resolveChoices(stage.grants, choices);
    pending.push(...resolved.pending);
    applyGrants(state, resolved.grants);
  }
  return { state, pending };
}

/* -------------------------------------------- */
/*  The starting cap (p.72)                     */
/* -------------------------------------------- */

/**
 * Find every trait pushed above the beginning-character cap of 8.
 *
 * "The player must take this extra point (lowering the Dexterity score to 8)
 *  and put it into another characteristic." (p.72)
 *
 * @param {LifepathState} state
 * @param {number} [cap]
 * @returns {{overages: Array<{type: string, key: string, value: number, excess: number}>, excess: number}}
 */
export function findOverages(state, cap = STARTING_CAP) {
  const overages = [];
  for (const [key, value] of Object.entries(state.characteristics)) {
    if (value > cap) overages.push({ type: "characteristic", key, value, excess: value - cap });
  }
  for (const [key, value] of Object.entries(state.skills)) {
    if (value > cap) overages.push({ type: "skill", key, value, excess: value - cap });
  }
  const excess = overages.reduce((total, o) => total + o.excess, 0);
  return { overages, excess };
}

/**
 * Clamp every trait to the cap, returning the number of points freed for
 * redistribution. The points are not spent here — the player chooses where they go.
 * @param {LifepathState} state   Mutated in place.
 * @param {number} [cap]
 * @returns {number}              Points the player must now place elsewhere.
 */
export function clampToCap(state, cap = STARTING_CAP) {
  const { overages, excess } = findOverages(state, cap);
  for (const overage of overages) {
    if (overage.type === "characteristic") state.characteristics[overage.key] = cap;
    else state.skills[overage.key] = cap;
  }
  return excess;
}

/* -------------------------------------------- */
/*  Spirit trait pairs (p.93)                   */
/* -------------------------------------------- */

/** The opposed Spirit trait pairs, by dot path. */
const SPIRIT_PAIRS = {
  "spirit.extrovert": "spirit.introvert",
  "spirit.introvert": "spirit.extrovert",
  "spirit.passion": "spirit.calm",
  "spirit.calm": "spirit.passion",
  "spirit.faith": "spirit.ego",
  "spirit.ego": "spirit.faith"
};

/**
 * The trait opposing a given Spirit trait, or null for non-Spirit traits.
 * @param {string} key
 * @returns {string|null}
 */
export function opposedTrait(key) {
  return SPIRIT_PAIRS[key] ?? null;
}

/* -------------------------------------------- */
/*  Point budgets                               */
/* -------------------------------------------- */

/**
 * Points available in Custom Creation (p.87).
 * Character Histories spend the same totals on prebuilt stages instead.
 */
export const CUSTOM_BUDGET = Object.freeze({
  characteristics: 20,
  skills: 30,
  extra: 0
});

/**
 * Points each Character History stage represents (p.88).
 * Used by the wizard to show how much of the budget a chosen stage consumes.
 */
export const STAGE_BUDGET = Object.freeze({
  upbringing: { characteristics: 5, skills: 5 },
  apprenticeship: { characteristics: 5, skills: 10 },
  earlyCareer: { characteristics: 10, skills: 15 }
});

/**
 * Cost to raise a trait by one level with Extra points (p.87).
 */
export const EXTRA_COSTS = Object.freeze({
  characteristic: 3,
  wyrd: 2,
  skill: 1,
  benefice: 1,
  blessing: 1,
  combatAction: 1,
  occultPower: 1
});

/**
 * Total Extra points a stage bundle costs, for validating a custom build.
 * @param {object} spend
 * @returns {number}
 */
export function extraPointCost(spend = {}) {
  return Object.entries(spend).reduce((total, [kind, levels]) => {
    const cost = EXTRA_COSTS[kind];
    if (cost === undefined) throw new Error(`Unknown Extra point category "${kind}"`);
    return total + cost * levels;
  }, 0);
}

/* -------------------------------------------- */
/*  Blessing and Curse limits (p.115)           */
/* -------------------------------------------- */

/** No character may take more than seven modifiers of Blessings, or seven points of Curses. */
export const BLESSING_LIMIT = 7;
export const CURSE_LIMIT = 7;

/**
 * Check a character's Blessings and Curses against the published limits.
 * @param {Array<{modifier: number}>} blessings
 * @param {Array<{cost: number}>} curses
 * @returns {{blessingModifiers: number, cursePoints: number, ok: boolean, problems: string[]}}
 */
export function checkBlessingLimits(blessings = [], curses = []) {
  const blessingModifiers = blessings.reduce((n, b) => n + Math.abs(b.modifier ?? 0), 0);
  const cursePoints = curses.reduce((n, c) => n + Math.abs(c.cost ?? 0), 0);
  const problems = [];
  if (blessingModifiers > BLESSING_LIMIT) {
    problems.push(`${blessingModifiers} Blessing modifiers exceeds the limit of ${BLESSING_LIMIT}`);
  }
  if (cursePoints > CURSE_LIMIT) {
    problems.push(`${cursePoints} points of Curses exceeds the limit of ${CURSE_LIMIT}`);
  }
  return { blessingModifiers, cursePoints, ok: !problems.length, problems };
}
