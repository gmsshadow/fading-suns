/**
 * Unit tests for the combat mathematics.
 * Run with: npm test
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  rangeBand, rangePenalty, strengthPenalty, multipleActionPenalty,
  initiativeValue, energyShieldAbsorb, attackModifiers,
  MAX_ACTIONS, UNDER_STRENGTH_PENALTY
} from "../module/dice/combat.mjs";

/* -------------------------------------------- */
/*  Range (p.296)                               */
/* -------------------------------------------- */

test("range bands follow the weapon's two figures (p.296)", () => {
  // A Heavy Revolver is 30/40: short to 30, long to 40, extreme beyond.
  assert.equal(rangeBand(10, 30, 40), "short");
  assert.equal(rangeBand(30, 30, 40), "short", "exactly short range is still short");
  assert.equal(rangeBand(31, 30, 40), "long");
  assert.equal(rangeBand(40, 30, 40), "long", "exactly long range is still long");
  assert.equal(rangeBand(41, 30, 40), "extreme");
});

test("long range is Hard and extreme is Demanding (p.296)", () => {
  assert.equal(rangePenalty(10, 30, 40), 0);
  assert.equal(rangePenalty(35, 30, 40), -2);
  assert.equal(rangePenalty(100, 30, 40), -4);
});

/* -------------------------------------------- */
/*  Strength requirement (p.296)                */
/* -------------------------------------------- */

test("a weapon too heavy for its wielder costs two goal points (p.296)", () => {
  // A Long Bow needs Strength 6.
  assert.equal(strengthPenalty(6, 6), 0);
  assert.equal(strengthPenalty(6, 7), 0);
  assert.equal(strengthPenalty(6, 5), UNDER_STRENGTH_PENALTY);
  assert.equal(strengthPenalty(0, 1), 0, "a weapon with no requirement never penalises");
});

/* -------------------------------------------- */
/*  Multiple actions (p.64)                     */
/* -------------------------------------------- */

test("multiple actions cost what the Penalty Chart says (p.64)", () => {
  assert.equal(multipleActionPenalty(1), 0);
  assert.equal(multipleActionPenalty(2), -4, "Demanding");
  assert.equal(multipleActionPenalty(3), -6, "Tough");
  assert.equal(MAX_ACTIONS, 3, "three is the most the rules allow");
});

/* -------------------------------------------- */
/*  Initiative (p.164)                          */
/* -------------------------------------------- */

test("initiative equals the skill being used (p.164)", () => {
  // "Tobo is swinging an axe; his Melee skill is 6, so his initiative is also 6."
  assert.equal(Math.floor(initiativeValue({ skill: 6 })), 6);
});

test("a combat action modifies the rating (p.164)", () => {
  // "Tobo performs a Martial Hold, which subtracts one from his initiative.
  //  His Fight skill is 5, so his initiative is 4 for that turn."
  assert.equal(Math.floor(initiativeValue({ skill: 5, modifier: -1 })), 4);
});

test("Wits breaks ties without disturbing the skill rating (p.164)", () => {
  const quick = initiativeValue({ skill: 6, wits: 5 });
  const slow = initiativeValue({ skill: 6, wits: 3 });
  assert.ok(quick > slow, "equal skill is decided on Wits");
  assert.equal(Math.floor(quick), 6, "the whole part still reads as the skill");
  assert.equal(Math.floor(slow), 6);
});

test("equal skill and equal Wits are simultaneous (p.164)", () => {
  assert.equal(initiativeValue({ skill: 6, wits: 4 }), initiativeValue({ skill: 6, wits: 4 }));
});

test("a higher skill always beats a lower one, whatever the Wits", () => {
  const duller = initiativeValue({ skill: 7, wits: 1 });
  const sharper = initiativeValue({ skill: 6, wits: 10 });
  assert.ok(duller > sharper, "Wits must never overturn a skill difference");
});

test("wound and multiple action penalties apply to initiative too (p.164)", () => {
  assert.equal(Math.floor(initiativeValue({ skill: 8, woundPenalty: -2 })), 6);
  assert.equal(Math.floor(initiativeValue({ skill: 8, actions: 2 })), 4);
  assert.equal(Math.floor(initiativeValue({ skill: 8, actions: 3, woundPenalty: -2 })), 0);
});

/* -------------------------------------------- */
/*  Energy shields (p.296)                      */
/* -------------------------------------------- */

test("a blow too light to activate the shield passes straight through (p.296)", () => {
  // Standard shield, 5/10: below five does not trigger it.
  const result = energyShieldAbsorb(3, { min: 5, max: 10, hits: 10 });
  assert.deepEqual(result, { blocked: 0, through: 3, activated: false, hitsUsed: 0 });
});

test("an activating blow is blocked up to the shield's maximum (p.296)", () => {
  assert.deepEqual(
    energyShieldAbsorb(8, { min: 5, max: 10, hits: 10 }),
    { blocked: 8, through: 0, activated: true, hitsUsed: 1 }
  );
  assert.deepEqual(
    energyShieldAbsorb(14, { min: 5, max: 10, hits: 10 }),
    { blocked: 10, through: 4, activated: true, hitsUsed: 1 },
    "four points get past a shield that can only stop ten"
  );
});

test("a spent cell stops nothing (p.296)", () => {
  const result = energyShieldAbsorb(12, { min: 5, max: 10, hits: 0 });
  assert.deepEqual(result, { blocked: 0, through: 12, activated: false, hitsUsed: 0 });
});

test("only an activation costs a hit", () => {
  assert.equal(energyShieldAbsorb(2, { min: 5, max: 10, hits: 10 }).hitsUsed, 0);
  assert.equal(energyShieldAbsorb(9, { min: 5, max: 10, hits: 10 }).hitsUsed, 1);
});

/* -------------------------------------------- */
/*  Assembling an attack                        */
/* -------------------------------------------- */

test("attack modifiers are itemised so the total can be checked", () => {
  // A laser pistol (+1, 10/20) at 15 metres, wielded properly, one action.
  const { total, parts } = attackModifiers({
    weaponModifier: 1, distance: 15, short: 10, long: 20
  });
  assert.equal(total, -1);
  assert.deepEqual(parts, [
    { label: "Weapon", value: 1 },
    { label: "LongRange", value: -2 }
  ]);
});

test("every penalty stacks, and each is named", () => {
  // A long bow (Strength 6) in the hands of a Strength 4 character, fired at
  // extreme range as the second of two actions, with a Feint's -1.
  const { total, parts } = attackModifiers({
    actionModifier: -1, distance: 100, short: 40, long: 60,
    required: 6, strength: 4, actions: 2, situational: -2
  });
  assert.equal(total, -13);
  assert.deepEqual(parts.map(p => p.label), [
    "Action", "ExtremeRange", "UnderStrength", "MultipleActions", "Situational"
  ]);
});

test("a melee weapon with no range is never penalised for distance", () => {
  const { total } = attackModifiers({ distance: 500, short: 0, long: 0 });
  assert.equal(total, 0, "range only applies to weapons that have one");
});

test("an unknown distance leaves range out entirely", () => {
  const { parts } = attackModifiers({ distance: null, short: 10, long: 20 });
  assert.equal(parts.length, 0, "theatre of the mind should not be guessed at");
});
