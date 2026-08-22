/**
 * Unit tests for the lifepath grant engine.
 *
 * Anchored to the Character Histories in Chapter Three, using the Hawkwood
 * entries verbatim as the fixture, plus the al-Malik duelist example the
 * rulebook itself gives for the starting cap (p.72).
 *
 * Run with:  node --test tests/grants.test.mjs
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  resolveChoices, applyGrants, applyStages, createState,
  findOverages, clampToCap, opposedTrait, skillLabel,
  extraPointCost, checkBlessingLimits,
  STARTING_CAP, STAGE_BUDGET, CUSTOM_BUDGET
} from "../module/lifepath/grants.mjs";

/* -------------------------------------------- */
/*  Fixtures — Hawkwood, transcribed from p.73   */
/* -------------------------------------------- */

/**
 * "Hawkwood: Characteristics—Strength +1, Dexterity +1, Wits +1, Extrovert
 *  (primary) +2; Skills—Melee +1, Etiquette 1, Lore (Heraldry) 1,
 *  Read Urthish (2 pts); Blessing—Unyielding; Curse—Prideful"
 */
const HAWKWOOD_HIGH_COURT = {
  name: "High-Court (Hawkwood)",
  stageType: "upbringing",
  grants: [
    { kind: "characteristic", key: "body.strength", value: 1 },
    { kind: "characteristic", key: "body.dexterity", value: 1 },
    { kind: "characteristic", key: "mind.wits", value: 1 },
    { kind: "characteristic", key: "spirit.extrovert", value: 2, primary: true },
    { kind: "skill", key: "Melee", value: 1 },
    { kind: "skill", key: "Etiquette", value: 1 },
    { kind: "skill", key: "Lore", specialty: "Heraldry", value: 1 },
    { kind: "language", key: "Read", specialty: "Urthish", value: 1, points: 2 },
    { kind: "blessing", key: "Compendium.fading-suns.blessings-curses.Item.unyielding000000" },
    { kind: "curse", key: "Compendium.fading-suns.blessings-curses.Item.prideful00000000" }
  ]
};

/**
 * "Hawkwood: Characteristics—Strength +2, Dexterity +1, Wits +1, Extrovert
 *  (primary) +1; Skills—Etiquette 1, Lore (Fief) 1, Read Urthish (2 pts), Ride 1"
 */
const HAWKWOOD_RURAL_ESTATE = {
  name: "Rural Estate (Hawkwood)",
  stageType: "upbringing",
  grants: [
    { kind: "characteristic", key: "body.strength", value: 2 },
    { kind: "characteristic", key: "body.dexterity", value: 1 },
    { kind: "characteristic", key: "mind.wits", value: 1 },
    { kind: "characteristic", key: "spirit.extrovert", value: 1, primary: true },
    { kind: "skill", key: "Etiquette", value: 1 },
    { kind: "skill", key: "Lore", specialty: "Fief", value: 1 },
    { kind: "language", key: "Read", specialty: "Urthish", value: 1, points: 2 },
    { kind: "skill", key: "Ride", value: 1 }
  ]
};

/**
 * "Soldier: Characteristics—Strength +2, Dexterity +2, Endurance +1;
 *  Skills—Fight +1, Shoot +2, Vigor +1, Remedy 1, Social (Leadership) 3,
 *  Survival 1, Warfare (Military Tactics) 1"
 */
const APPRENTICESHIP_SOLDIER = {
  name: "Soldier",
  stageType: "apprenticeship",
  grants: [
    { kind: "characteristic", key: "body.strength", value: 2 },
    { kind: "characteristic", key: "body.dexterity", value: 2 },
    { kind: "characteristic", key: "body.endurance", value: 1 },
    { kind: "skill", key: "Fight", value: 1 },
    { kind: "skill", key: "Shoot", value: 2 },
    { kind: "skill", key: "Vigor", value: 1 },
    { kind: "skill", key: "Remedy", value: 1 },
    { kind: "skill", key: "Social", specialty: "Leadership", value: 3 },
    { kind: "skill", key: "Survival", value: 1 },
    { kind: "skill", key: "Warfare", specialty: "Military Tactics", value: 1 }
  ]
};

/**
 * "Li Halan: Characteristics—Wits +1, Extrovert or Introvert +1,
 *  Passion or Calm +1, Faith (primary) +2; …"
 */
const LI_HALAN_HIGH_COURT = {
  name: "High-Court (Li Halan)",
  stageType: "upbringing",
  grants: [
    { kind: "characteristic", key: "mind.wits", value: 1 },
    {
      kind: "choice", id: "lihalan-social",
      label: "Extrovert or Introvert +1",
      options: [
        { label: "Extrovert", grants: [{ kind: "characteristic", key: "spirit.extrovert", value: 1 }] },
        { label: "Introvert", grants: [{ kind: "characteristic", key: "spirit.introvert", value: 1 }] }
      ]
    },
    {
      kind: "choice", id: "lihalan-temper",
      label: "Passion or Calm +1",
      options: [
        { label: "Passion", grants: [{ kind: "characteristic", key: "spirit.passion", value: 1 }] },
        { label: "Calm", grants: [{ kind: "characteristic", key: "spirit.calm", value: 1 }] }
      ]
    },
    { kind: "characteristic", key: "spirit.faith", value: 2, primary: true }
  ]
};

/** Characters begin with Body and Mind at 3, and the nine natural skills at 3 (p.87, p.97). */
function startingCharacter() {
  return createState({
    characteristics: {
      "body.strength": 3, "body.dexterity": 3, "body.endurance": 3,
      "mind.wits": 3, "mind.perception": 3, "mind.tech": 3,
      "spirit.extrovert": 3, "spirit.introvert": 1,
      "spirit.passion": 3, "spirit.calm": 1,
      "spirit.faith": 3, "spirit.ego": 1
    },
    primary: {
      "spirit.extrovert": true, "spirit.passion": true, "spirit.faith": true
    },
    skills: {
      Charm: 3, Dodge: 3, Fight: 3, Impress: 3, Melee: 3,
      Observe: 3, Shoot: 3, Sneak: 3, Vigor: 3
    }
  });
}

/* -------------------------------------------- */
/*  Applying a single stage                     */
/* -------------------------------------------- */

test("a stage applies characteristic deltas on top of the starting ratings", () => {
  const state = applyGrants(startingCharacter(), HAWKWOOD_HIGH_COURT.grants);
  assert.equal(state.characteristics["body.strength"], 4);
  assert.equal(state.characteristics["body.dexterity"], 4);
  assert.equal(state.characteristics["mind.wits"], 4);
  assert.equal(state.characteristics["spirit.extrovert"], 5);
  assert.equal(state.characteristics["mind.tech"], 3, "untouched traits are unchanged");
});

test("a stage adds to natural skills and introduces learned ones", () => {
  const state = applyGrants(startingCharacter(), HAWKWOOD_HIGH_COURT.grants);
  assert.equal(state.skills.Melee, 4, "Melee +1 on top of the natural base of 3");
  assert.equal(state.skills.Etiquette, 1, "a learned skill starts from nothing");
  assert.equal(state.skills["Lore (Heraldry)"], 1, "specialties are tracked separately");
});

test("specialty labels match how the rulebook writes them", () => {
  assert.equal(skillLabel({ key: "Lore", specialty: "Heraldry" }), "Lore (Heraldry)");
  assert.equal(skillLabel({ key: "Etiquette" }), "Etiquette");
});

test("a primary Spirit trait demotes its opposite (p.93)", () => {
  const state = createState({ primary: { "spirit.ego": true } });
  applyGrants(state, [{ kind: "characteristic", key: "spirit.faith", value: 2, primary: true }]);
  assert.equal(state.primary["spirit.faith"], true);
  assert.equal(state.primary["spirit.ego"], false, "only one trait in a pair may be primary");
});

test("opposed trait pairs are wired both ways", () => {
  assert.equal(opposedTrait("spirit.passion"), "spirit.calm");
  assert.equal(opposedTrait("spirit.calm"), "spirit.passion");
  assert.equal(opposedTrait("body.strength"), null);
});

test("blessings and curses are collected without duplication", () => {
  const state = applyGrants(startingCharacter(), HAWKWOOD_HIGH_COURT.grants);
  assert.equal(state.blessings.length, 1);
  assert.equal(state.curses.length, 1);
  applyGrants(state, HAWKWOOD_HIGH_COURT.grants);
  assert.equal(state.blessings.length, 1, "the same Blessing is not granted twice");
});

/* -------------------------------------------- */
/*  Cumulative stages (p.72)                    */
/* -------------------------------------------- */

test("skill and characteristic bonuses are cumulative across stages (p.72)", () => {
  // "if a character learns Remedy 1 during his Apprenticeship, and his Early
  //  Career also provides him Remedy 1, he then has the Remedy skill at two levels."
  const state = createState();
  applyStages(state, [
    { grants: [{ kind: "skill", key: "Remedy", value: 1 }] },
    { grants: [{ kind: "skill", key: "Remedy", value: 1 }] }
  ]);
  assert.equal(state.skills.Remedy, 2);
});

test("a duplicate language refunds its points instead of stacking (p.72)", () => {
  const state = startingCharacter();
  applyStages(state, [HAWKWOOD_HIGH_COURT, HAWKWOOD_RURAL_ESTATE]);
  assert.equal(state.skills["Read (Urthish)"], 1, "the language is known, not doubled");
  assert.equal(state.sparePoints, 2, "the second grant's two points are freed for use elsewhere");
});

test("a first language grant is learned rather than refunded", () => {
  const state = startingCharacter();
  applyGrants(state, [{ kind: "language", key: "Speak", specialty: "Latin", value: 1, points: 2 }]);
  assert.equal(state.skills["Speak (Latin)"], 1);
  assert.equal(state.sparePoints, 0);
});

/* -------------------------------------------- */
/*  Choices                                     */
/* -------------------------------------------- */

test("an undecided choice is reported as pending rather than guessed at", () => {
  const { grants, pending } = resolveChoices(LI_HALAN_HIGH_COURT.grants, {});
  assert.equal(pending.length, 2, "both 'or' choices await a decision");
  assert.equal(grants.length, 2, "the unconditional grants still resolve");
  assert.ok(!grants.some(g => g.kind === "choice"));
});

test("a resolved choice contributes its selected option", () => {
  const { grants, pending } = resolveChoices(LI_HALAN_HIGH_COURT.grants, {
    "lihalan-social": 1,  // Introvert
    "lihalan-temper": 0   // Passion
  });
  assert.equal(pending.length, 0);
  const state = applyGrants(startingCharacter(), grants);
  assert.equal(state.characteristics["spirit.introvert"], 2, "Introvert +1 from a base of 1");
  assert.equal(state.characteristics["spirit.extrovert"], 3, "Extrovert was not chosen");
  assert.equal(state.characteristics["spirit.passion"], 4);
  assert.equal(state.characteristics["spirit.faith"], 5);
  assert.equal(state.primary["spirit.faith"], true);
});

test("applying an unresolved choice is a programming error, not a silent skip", () => {
  assert.throws(
    () => applyGrants(createState(), LI_HALAN_HIGH_COURT.grants),
    /unresolved choice/
  );
});

test("an unknown grant kind throws rather than being ignored", () => {
  assert.throws(() => applyGrants(createState(), [{ kind: "nonsense" }]), /Unknown grant kind/);
});

/* -------------------------------------------- */
/*  The starting cap (p.72)                     */
/* -------------------------------------------- */

test("the al-Malik duelist example overshoots Dexterity and must redistribute (p.72)", () => {
  // "an al-Malik noble with a Landless Upbringing, a Duelist Apprenticeship and
  //  an Early Career as a Duelist will have a Dexterity of 9. The player must
  //  take this extra point (lowering the Dexterity score to 8)."
  const state = createState({ characteristics: { "body.dexterity": 3 } });
  applyStages(state, [
    { grants: [{ kind: "characteristic", key: "body.dexterity", value: 2 }] },
    { grants: [{ kind: "characteristic", key: "body.dexterity", value: 2 }] },
    { grants: [{ kind: "characteristic", key: "body.dexterity", value: 2 }] }
  ]);
  assert.equal(state.characteristics["body.dexterity"], 9);

  const { overages, excess } = findOverages(state);
  assert.equal(excess, 1);
  assert.deepEqual(overages, [{ type: "characteristic", key: "body.dexterity", value: 9, excess: 1 }]);

  const freed = clampToCap(state);
  assert.equal(freed, 1, "one point is returned to the player to place elsewhere");
  assert.equal(state.characteristics["body.dexterity"], STARTING_CAP);
});

test("skills are capped on the same terms as characteristics", () => {
  const state = createState({ skills: { Shoot: 7 } });
  applyGrants(state, [{ kind: "skill", key: "Shoot", value: 4 }]);
  assert.equal(clampToCap(state), 3);
  assert.equal(state.skills.Shoot, 8);
});

test("a character within the cap frees no points", () => {
  const state = startingCharacter();
  applyStages(state, [HAWKWOOD_HIGH_COURT, APPRENTICESHIP_SOLDIER]);
  assert.equal(findOverages(state).excess, 0);
  assert.equal(state.characteristics["body.strength"], 6);
  assert.equal(state.skills.Shoot, 5);
});

/* -------------------------------------------- */
/*  Budgets (p.87, p.88)                        */
/* -------------------------------------------- */

test("the three main stages together spend the Custom Creation budget (p.87, p.88)", () => {
  const total = Object.values(STAGE_BUDGET).reduce(
    (sum, stage) => ({
      characteristics: sum.characteristics + stage.characteristics,
      skills: sum.skills + stage.skills
    }),
    { characteristics: 0, skills: 0 }
  );
  assert.equal(total.characteristics, CUSTOM_BUDGET.characteristics,
    "20 characteristic points, however they are spent");
  assert.equal(total.skills, CUSTOM_BUDGET.skills,
    "30 skill points, however they are spent");
});

test("Extra point costs follow the published chart (p.87)", () => {
  assert.equal(extraPointCost({ characteristic: 2 }), 6);
  assert.equal(extraPointCost({ wyrd: 3 }), 6);
  assert.equal(extraPointCost({ skill: 4, blessing: 2 }), 6);
  assert.equal(extraPointCost({ occultPower: 3, benefice: 1 }), 4);
  assert.throws(() => extraPointCost({ nonsense: 1 }), /Unknown Extra point category/);
});

/* -------------------------------------------- */
/*  Blessing and Curse limits (p.115)           */
/* -------------------------------------------- */

test("no more than seven Blessing modifiers or seven points of Curses (p.115)", () => {
  const ok = checkBlessingLimits(
    [{ modifier: 2 }, { modifier: 2 }, { modifier: 3 }],
    [{ cost: 2 }, { cost: 2 }]
  );
  assert.equal(ok.blessingModifiers, 7);
  assert.equal(ok.cursePoints, 4);
  assert.equal(ok.ok, true);

  const tooMany = checkBlessingLimits(
    [{ modifier: 3 }, { modifier: 3 }, { modifier: 3 }],
    [{ cost: 4 }, { cost: 4 }]
  );
  assert.equal(tooMany.ok, false);
  assert.equal(tooMany.problems.length, 2);
});

test("curse costs are counted as magnitudes, however they are signed", () => {
  // The rulebook writes Curse costs as "+2 pts" because they grant points.
  assert.equal(checkBlessingLimits([], [{ cost: -2 }, { cost: 2 }]).cursePoints, 4);
});
