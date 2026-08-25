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
 *   benefice         a reference to a Benefice item, at a given rank
 *   combatAction     a reference to a Combat Action item; its level is its cost
 *   note             something not yet modelled, such as Fencing Actions
 *
 * Choices come in two forms. An enumerated choice lists its options —
 * "Extrovert or Introvert +1" — and the selection is an option index. An open
 * choice names a pool instead — "Any skill +2", "Body characteristic (choose
 * one) +2" — and the wizard supplies the grant itself. Either kind may pick more
 * than one, as in "Body characteristic (choose two) +1 each".
 */

/** Every grant kind a stage may contain. */
export const GRANT_KINDS = [
  "characteristic", "skill", "language", "blessing", "curse", "benefice",
  "combatAction", "wyrd", "power", "note", "choice"
];

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

    const pick = grant.pick ?? 1;
    const selection = normaliseSelection(choices[grant.id]);

    if (selection.length !== pick) {
      pending.push(grant);
      continue;
    }

    for (const chosen of selection) {
      // An open choice — "Any skill +2", "Body characteristic (choose one) +2" —
      // has no enumerated options, so the wizard supplies the grant directly.
      if (grant.pool && typeof chosen === "object") {
        resolved.push(chosen);
        continue;
      }
      const option = grant.options?.[chosen];
      if (!option) {
        pending.push(grant);
        break;
      }
      for (const inner of option.grants ?? []) resolved.push(inner);
    }
  }

  return { grants: resolved, pending };
}

/**
 * Selections arrive either as a single value or as a list, depending on whether
 * the choice picks one option or several. Normalise to a list.
 * @param {*} selection
 * @returns {Array}
 */
function normaliseSelection(selection) {
  if (selection === undefined || selection === null) return [];
  return Array.isArray(selection) ? selection : [selection];
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
    benefices: [],
    combatActions: [],
    powers: [],
    notes: [],
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

      case "benefice":
        // "Benefice—Rank (Knight)" grants the entry at a specific rank.
        state.benefices.push({ key: grant.key, value: grant.value ?? 1 });
        break;

      case "combatAction":
        // Combat actions cost one point per level and come out of the stage's
        // skill budget, which is where the rulebook lists them (p.88, p.102).
        if (!state.combatActions.some(a => a.key === grant.key)) {
          state.combatActions.push({ key: grant.key, level: grant.value ?? 0 });
        }
        break;

      case "wyrd":
        // Occult training raises the Wyrd maximum above its derived base (p.84).
        state.wyrdBonus = (state.wyrdBonus ?? 0) + (grant.value ?? 0);
        break;

      case "power":
        // A psychic power or theurgic rite, referenced by uuid.
        if (!state.powers.includes(grant.key)) state.powers.push(grant.key);
        break;

      case "note":
        // Something the stage confers that the system does not yet model, such
        // as the Fencing Actions a Duelist learns. Recorded for the player.
        state.notes.push(grant.text ?? "");
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

/* -------------------------------------------- */
/*  Step Five: Benefices (p.88, p.117)          */
/* -------------------------------------------- */

/**
 * Points available for Benefices at creation.
 *
 * The rulebook gives two different figures. Step Five of the creation procedure
 * says ten (p.88); the Benefices chapter says five (p.117). Ten is used here
 * because Step Five is the procedure actually being followed, but the figure is
 * exposed as a world setting so a table can rule either way.
 */
export const BENEFICE_POINTS = 10;

/**
 * Points of Benefices bought. Afflictions are excluded: they do not reduce this
 * budget, they add to the Extra point pool instead (p.117).
 * @param {Array<{value: number, polarity: string}>} entries
 * @returns {number}
 */
export function beneficeSpend(entries = []) {
  return entries
    .filter(e => e.polarity !== "affliction")
    .reduce((total, e) => total + (e.value ?? 0), 0);
}

/* -------------------------------------------- */
/*  Step Six: Extra points (p.88)               */
/* -------------------------------------------- */

/** Extra points every character receives at creation (p.88). */
export const EXTRA_POINTS = 40;

/**
 * The Extra point pool.
 *
 * "Curses and Afflictions provide additional Extra points." (p.88) An Affliction
 * gives "additional Extras to spend on more Benefices or any other trait"
 * (p.117) — so it feeds this pool rather than the Benefice budget, even though a
 * point spent straight back on a Benefice comes to the same arithmetic.
 *
 * @param {object} options
 * @param {Array<{cost: number}>} [options.curses]
 * @param {Array<{value: number}>} [options.afflictions]
 * @param {number} [options.base]
 * @returns {number}
 */
export function extraPointBudget({ curses = [], afflictions = [], base = EXTRA_POINTS } = {}) {
  const fromCurses = curses.reduce((n, c) => n + Math.abs(c.cost ?? 0), 0);
  const fromAfflictions = afflictions.reduce((n, a) => n + Math.abs(a.value ?? 0), 0);
  return base + fromCurses + fromAfflictions;
}

/**
 * What a set of Extra point purchases costs.
 *
 * @param {object} purchases
 * @param {Record<string, number>} [purchases.characteristics]  Path to levels bought.
 * @param {Record<string, number>} [purchases.skills]           Label to levels bought.
 * @param {number} [purchases.wyrd]                             Levels of Wyrd bought.
 * @param {Array<{cost: number}>} [purchases.blessings]
 * @param {Array<{value: number}>} [purchases.benefices]        Bought beyond the Step Five budget.
 * @param {Array<{level: number}>} [purchases.combatActions]    Costed at one point per level.
 * @returns {number}
 */
export function extraPointSpend(purchases = {}) {
  const levels = record => Object.values(record ?? {}).reduce((n, v) => n + (v ?? 0), 0);

  return (
    levels(purchases.characteristics) * EXTRA_COSTS.characteristic +
    levels(purchases.skills) * EXTRA_COSTS.skill +
    (purchases.wyrd ?? 0) * EXTRA_COSTS.wyrd +
    (purchases.blessings ?? []).reduce((n, b) => n + Math.abs(b.cost ?? 0), 0) * EXTRA_COSTS.blessing +
    (purchases.benefices ?? []).reduce((n, b) => n + (b.value ?? 0), 0) * EXTRA_COSTS.benefice +
    (purchases.combatActions ?? []).reduce((n, a) => n + (a.level ?? 0), 0) * EXTRA_COSTS.combatAction
  );
}

/**
 * Apply Extra point purchases to a lifepath state.
 * @param {LifepathState} state   Mutated in place and returned.
 * @param {object} purchases
 * @returns {LifepathState}
 */
export function applyExtraPurchases(state, purchases = {}) {
  for (const [path, levels] of Object.entries(purchases.characteristics ?? {})) {
    if (levels) state.characteristics[path] = (state.characteristics[path] ?? 0) + levels;
  }
  for (const [label, levels] of Object.entries(purchases.skills ?? {})) {
    if (levels) state.skills[label] = (state.skills[label] ?? 0) + levels;
  }
  state.wyrdBonus = (state.wyrdBonus ?? 0) + (purchases.wyrd ?? 0);
  for (const blessing of purchases.blessings ?? []) {
    if (!state.blessings.includes(blessing.uuid)) state.blessings.push(blessing.uuid);
  }
  for (const benefice of purchases.benefices ?? []) {
    state.benefices.push({ key: benefice.uuid, value: benefice.value });
  }
  for (const action of purchases.combatActions ?? []) {
    if (!state.combatActions.some(a => a.key === action.uuid)) {
      state.combatActions.push({ key: action.uuid, level: action.level });
    }
  }
  return state;
}
