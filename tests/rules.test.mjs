/**
 * Unit tests for the Fading Suns rules engine.
 *
 * Run with:  node --test tests/
 *
 * These exercise the two Foundry-free modules under module/dice/. Wherever the
 * rulebook provides a worked example, that example is used verbatim as the
 * expected result.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  resolveGoalRoll,
  lookupVictoryBand,
  excessiveGoalBonus,
  vitalityPenalty,
  resolveContest,
  VICTORY_CHART_STANDARD
} from "../module/dice/victory-chart.mjs";

import {
  countEffectSuccesses,
  damagePool,
  applyArmour
} from "../module/dice/effect-dice.mjs";

/* -------------------------------------------- */
/*  Victory Chart (p.64)                        */
/* -------------------------------------------- */

test("standard Victory Chart matches the printed bands", () => {
  const expected = [
    [1, 1, 0], [2, 1, 0],
    [3, 1, 1], [5, 1, 1],
    [6, 2, 2], [8, 2, 2],
    [9, 3, 3], [11, 3, 3],
    [12, 4, 4], [14, 4, 4],
    [15, 5, 5], [17, 5, 5],
    [18, 6, 6], [20, 6, 6]
  ];
  for (const [successes, vp, vd] of expected) {
    const band = lookupVictoryBand(successes);
    assert.equal(band.vp, vp, `VP for ${successes} successes`);
    assert.equal(band.vd, vd, `VD for ${successes} successes`);
  }
});

test("Victory Dice are one per three successes, rounded down (p.64 footnote)", () => {
  for (let n = 1; n <= 20; n++) {
    assert.equal(lookupVictoryBand(n).vd, Math.floor(n / 3));
    assert.equal(lookupVictoryBand(n).vp, Math.max(1, Math.floor(n / 3)));
  }
});

test("the chart covers every possible d20 result without gaps", () => {
  for (let n = 1; n <= 20; n++) {
    const matches = VICTORY_CHART_STANDARD.filter(b => n >= b.min && n <= b.max);
    assert.equal(matches.length, 1, `exactly one band should cover ${n}`);
  }
});

/* -------------------------------------------- */
/*  Worked examples from the rulebook           */
/* -------------------------------------------- */

test("Gorgool the bard: Goal 9, rolls 8 (p.65)", () => {
  const r = resolveGoalRoll({ natural: 8, goal: 9 });
  assert.equal(r.success, true);
  assert.equal(r.criticalSuccess, false);
  assert.equal(r.victoryPoints, 2, "the book states two victory points");
  assert.equal(r.accomplishment, "PrettyGood");
});

test("the jealous paramour: Goal 10, rolls 7, two victory dice (p.66)", () => {
  const r = resolveGoalRoll({ natural: 7, goal: 10 });
  assert.equal(r.success, true);
  assert.equal(r.victoryPoints, 2);
  assert.equal(r.victoryDice, 2);

  // "His fist normally inflicts two dice of damage, but with the victory dice
  //  from his attack, he gets to roll four dice."
  const pool = damagePool({ weaponDice: 2, victoryDice: r.victoryDice });
  assert.equal(pool.total, 4);

  // "results of 2, 6, 3, and 4 — three successful dice, which translates to
  //  three wound points."
  assert.equal(countEffectSuccesses([2, 6, 3, 4]), 3);
});

test("critical success doubles Victory Points: Goal 9, rolls 9 (p.67)", () => {
  const r = resolveGoalRoll({ natural: 9, goal: 9 });
  assert.equal(r.criticalSuccess, true);
  assert.equal(r.victoryPoints, 6, "three victory points, doubled");
});

test("excessive Goal Number 24, rolls 18 — critical success (p.66)", () => {
  const r = resolveGoalRoll({ natural: 18, goal: 24 });
  assert.equal(r.criticalSuccess, true, "18 is the critical result above Goal 20");
  assert.equal(r.excessiveBonus, 2);
  assert.equal(r.victoryPoints, 16, "(six, plus two bonus points) doubled");
});

test("excessive Goal Number 24, rolls 7 — ordinary success (p.66)", () => {
  const r = resolveGoalRoll({ natural: 7, goal: 24 });
  assert.equal(r.criticalSuccess, false);
  assert.equal(r.victoryPoints, 4, "two, plus his two bonus points");
});

/* -------------------------------------------- */
/*  Automatic results (p.66)                    */
/* -------------------------------------------- */

test("a natural 1 always succeeds, however long the odds", () => {
  const r = resolveGoalRoll({ natural: 1, goal: 0 });
  assert.equal(r.automaticSuccess, true);
  assert.equal(r.success, true);
  assert.equal(r.victoryPoints, 1);
});

test("a natural 19 always fails, however easy the task", () => {
  const r = resolveGoalRoll({ natural: 19, goal: 20 });
  assert.equal(r.automaticFailure, true);
  assert.equal(r.success, false);
  assert.equal(r.victoryPoints, 0);
});

test("a natural 20 is a critical failure", () => {
  const r = resolveGoalRoll({ natural: 20, goal: 20 });
  assert.equal(r.criticalFailure, true);
  assert.equal(r.success, false);
  assert.equal(r.criticalSuccess, false, "20 must never read as a critical success");
});

test("19 and 20 are never critical successes even when they equal the Goal", () => {
  assert.equal(resolveGoalRoll({ natural: 19, goal: 19 }).criticalSuccess, false);
  assert.equal(resolveGoalRoll({ natural: 20, goal: 20 }).criticalSuccess, false);
});

/* -------------------------------------------- */
/*  Extended Victory Chart (p.66)               */
/* -------------------------------------------- */

test("Extended Victory Chart bonus matches the printed table", () => {
  const table = { 20: 0, 21: 1, 22: 1, 23: 1, 24: 2, 26: 2, 27: 3, 29: 3, 30: 4, 32: 4, 33: 5, 35: 5 };
  for (const [goal, bonus] of Object.entries(table)) {
    assert.equal(excessiveGoalBonus(Number(goal)), bonus, `Goal ${goal}`);
  }
});

/* -------------------------------------------- */
/*  Accents (p.69)                              */
/* -------------------------------------------- */

test("Lars the axeman: Goal 11, accented +3, rolls 8 — critical success (p.67)", () => {
  const r = resolveGoalRoll({ natural: 8, goal: 11, accent: 3 });
  assert.equal(r.successes, 11);
  assert.equal(r.criticalSuccess, true, "the accented number determines critical success");
});

test("Roland: Goal 12, accented +5, rolls 5 — hit with 10 successes (p.69)", () => {
  const r = resolveGoalRoll({ natural: 5, goal: 12, accent: 5 });
  assert.equal(r.successes, 10);
  assert.equal(r.success, true);
  // Positively accented rolls use one victory point per two successes.
  assert.equal(r.victoryPoints, 4);
});

test("Roland overshoots: Goal 12, accented +5, rolls 8 — miss (p.69)", () => {
  const r = resolveGoalRoll({ natural: 8, goal: 12, accent: 5 });
  assert.equal(r.successes, 13);
  assert.equal(r.success, false);
});

test("an accent that pushes past 20 becomes a critical failure (p.69)", () => {
  const r = resolveGoalRoll({ natural: 15, goal: 24, accent: 7 });
  assert.equal(r.criticalFailure, true);
  assert.equal(r.success, false);
});

test("natural 1, 19 and 20 ignore accents entirely (p.69)", () => {
  assert.equal(resolveGoalRoll({ natural: 1, goal: 5, accent: 8 }).automaticSuccess, true);
  assert.equal(resolveGoalRoll({ natural: 19, goal: 20, accent: -8 }).automaticFailure, true);
  assert.equal(resolveGoalRoll({ natural: 20, goal: 20, accent: -8 }).criticalFailure, true);
});

test("positively accented Victory Chart matches the printed bands (p.69)", () => {
  // 1-2 => 1/+0, 3-4 => 1/+1, 5-6 => 2/+2, 7-8 => 3/+3, 9-10 => 4/+4,
  // 11-12 => 5/+5, 13-14 => 6/+6, 15-16 => 7/+7, 17-18 => 8/+8
  const expected = {
    1: [1, 0], 2: [1, 0], 3: [1, 1], 4: [1, 1], 5: [2, 2], 6: [2, 2],
    7: [3, 3], 8: [3, 3], 9: [4, 4], 10: [4, 4], 11: [5, 5], 12: [5, 5],
    13: [6, 6], 14: [6, 6], 15: [7, 7], 16: [7, 7], 17: [8, 8], 18: [8, 8]
  };
  for (const [successes, [vp, vd]] of Object.entries(expected)) {
    const band = lookupVictoryBand(Number(successes), +1);
    assert.equal(band.vp, vp, `positive accent VP for ${successes}`);
    assert.equal(band.vd, vd, `positive accent VD for ${successes}`);
  }
});

test("negatively accented Victory Chart matches the printed bands (p.69)", () => {
  // 1-4 => 1/+0, 5-8 => 1/+1, 9-12 => 2/+2, 13-16 => 3/+3, 17-20 => 4/+4
  const expected = {
    1: [1, 0], 4: [1, 0], 5: [1, 1], 8: [1, 1], 9: [2, 2], 12: [2, 2],
    13: [3, 3], 16: [3, 3], 17: [4, 4], 20: [4, 4]
  };
  for (const [successes, [vp, vd]] of Object.entries(expected)) {
    const band = lookupVictoryBand(Number(successes), -1);
    assert.equal(band.vp, vp, `negative accent VP for ${successes}`);
    assert.equal(band.vd, vd, `negative accent VD for ${successes}`);
  }
});

test("accented charts award fewer points than the standard chart at the low end", () => {
  // A negative accent is strictly worse; a positive accent is strictly better,
  // which is what makes spending the Wyrd point a real decision (p.69).
  assert.ok(lookupVictoryBand(12, -1).vp < lookupVictoryBand(12, 0).vp);
  assert.ok(lookupVictoryBand(12, +1).vp > lookupVictoryBand(12, 0).vp);
});

/* -------------------------------------------- */
/*  Contested actions (p.67)                    */
/* -------------------------------------------- */

test("contested actions subtract the lower successes from the higher (p.67)", () => {
  // "Julia's 6 successes are ... 2 successes — enough to hit Julia."
  const julia = resolveGoalRoll({ natural: 6, goal: 9 });
  const merchant = resolveGoalRoll({ natural: 8, goal: 9 });
  const result = resolveContest(merchant, julia);
  assert.equal(result.winner, "a");
  assert.equal(result.margin, 2);
});

test("a failed roll contributes no successes to a contest", () => {
  const winner = resolveGoalRoll({ natural: 4, goal: 10 });
  const loser = resolveGoalRoll({ natural: 20, goal: 10 });
  assert.equal(resolveContest(winner, loser).winner, "a");
});

/* -------------------------------------------- */
/*  Effect Dice (p.65)                          */
/* -------------------------------------------- */

test("effect dice succeed on 1 to 4 and fail on 5 or 6 (p.65)", () => {
  assert.equal(countEffectSuccesses([1, 2, 3, 4, 5, 6]), 4);
  assert.equal(countEffectSuccesses([5, 6, 5, 6]), 0);
  assert.equal(countEffectSuccesses([]), 0);
});

test("victory dice convert one for one and may be pulled back to a single die (p.65)", () => {
  assert.deepEqual(damagePool({ weaponDice: 2, victoryDice: 4 }), { weaponDice: 2, victoryDice: 4, total: 6 });
  assert.deepEqual(damagePool({ weaponDice: 2, victoryDice: 4, pulledPunch: 1 }), { weaponDice: 2, victoryDice: 1, total: 3 });
  assert.deepEqual(damagePool({ weaponDice: 2, victoryDice: 4, pulledPunch: 0 }), { weaponDice: 2, victoryDice: 1, total: 3 });
  assert.deepEqual(damagePool({ weaponDice: 2, victoryDice: 4, pulledPunch: 9 }), { weaponDice: 2, victoryDice: 4, total: 6 });
});

test("weapon dice must always be used in full (p.65)", () => {
  assert.equal(damagePool({ weaponDice: 3, victoryDice: 0, pulledPunch: 0 }).weaponDice, 3);
});

test("armour points cancel wound points before Vitality is reduced (p.65)", () => {
  assert.equal(applyArmour(5, 2), 3);
  assert.equal(applyArmour(2, 5), 0, "armour never heals");
});

/* -------------------------------------------- */
/*  Vitality (p.125)                            */
/* -------------------------------------------- */

test("wound penalties follow the Penalty Chart as vital levels are lost (p.125)", () => {
  assert.equal(vitalityPenalty(10), 0, "no penalty while non-vital levels remain");
  assert.equal(vitalityPenalty(5), 0, "all five vital levels intact");
  assert.equal(vitalityPenalty(4), -2, "first vital level lost: Hard");
  assert.equal(vitalityPenalty(3), -4, "Demanding");
  assert.equal(vitalityPenalty(2), -6, "Tough");
  assert.equal(vitalityPenalty(1), -8, "Severe, and struggling to stay conscious");
  assert.equal(vitalityPenalty(0), -10, "Herculean");
  assert.equal(vitalityPenalty(-3), -10, "clamped at the bottom of the chart");
});

/* -------------------------------------------- */
/*  Invariants                                  */
/* -------------------------------------------- */

test("every d20 result against every plausible Goal produces a coherent outcome", () => {
  for (let goal = 0; goal <= 35; goal++) {
    for (let die = 1; die <= 20; die++) {
      const r = resolveGoalRoll({ natural: die, goal });
      assert.ok(r.victoryPoints >= 0, "victory points are never negative");
      if (!r.success) assert.equal(r.victoryPoints, 0, "a failure yields no victory points");
      if (r.success) assert.ok(r.victoryPoints >= 1, "a success always yields at least one point");
      assert.ok(!(r.success && r.criticalFailure), "success and critical failure are exclusive");
      assert.ok(!(r.automaticSuccess && r.automaticFailure), "automatic results are exclusive");
    }
  }
});
