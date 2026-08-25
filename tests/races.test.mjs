/**
 * Unit tests for the alien races (p.83, p.88).
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  RACES, getRace, characteristicBase, characteristicMax, racialModifiers,
  canAwakenOccult, tourAllowance, racialCost, occultAdds,
  HUMAN_BASE, HUMAN_MAX
} from "../module/dice/races.mjs";

/* -------------------------------------------- */

test("the four playable races are present", () => {
  assert.deepEqual(Object.keys(RACES).sort(), ["human", "urObun", "urUkar", "vorox"]);
});

test("an unknown race falls back to human rather than throwing", () => {
  assert.equal(getRace("kurgan").key, "human");
  assert.equal(characteristicBase("kurgan", "body.strength"), HUMAN_BASE);
});

/* -------------------------------------------- */
/*  Bases                                       */
/* -------------------------------------------- */

test("humans begin at three in Body and Mind (p.87)", () => {
  for (const path of ["body.strength", "body.dexterity", "mind.wits", "mind.tech"]) {
    assert.equal(characteristicBase("human", path), 3);
  }
});

test("occult traits begin at nothing unless the race says otherwise", () => {
  assert.equal(characteristicBase("human", "occult.psi"), 0);
  assert.equal(characteristicBase("vorox", "occult.theurgy"), 0);

  // "Psi (base 1; 3 pts) and Urge (base 1; +3 pts)" — the Ukari start shadowed.
  assert.equal(characteristicBase("urUkar", "occult.psi"), 1);
  assert.equal(characteristicBase("urUkar", "occult.urge"), 1);
});

test("racial bases replace the human starting value, up or down (p.88)", () => {
  // Ur-Obun and Ur-Ukar are quicker than humans.
  assert.equal(characteristicBase("urObun", "body.dexterity"), 4);
  assert.equal(characteristicBase("urUkar", "body.dexterity"), 4);
  assert.equal(characteristicBase("urUkar", "mind.tech"), 4);

  // A Vorox is stronger and hardier, and slower of thought.
  assert.equal(characteristicBase("vorox", "body.strength"), 4);
  assert.equal(characteristicBase("vorox", "body.endurance"), 4);
  assert.equal(characteristicBase("vorox", "mind.wits"), 2, "below the human base");
  assert.equal(characteristicBase("vorox", "mind.tech"), 1, "well below it");
});

/* -------------------------------------------- */
/*  Maxima                                      */
/* -------------------------------------------- */

test("humans stop at ten (p.72)", () => {
  assert.equal(characteristicMax("human", "body.strength"), HUMAN_MAX);
});

test("the Ur races are frailer and the Vorox stronger (p.88)", () => {
  // "Strength and Endurance (maximum 9)" for both Ur races.
  for (const race of ["urObun", "urUkar"]) {
    assert.equal(characteristicMax(race, "body.strength"), 9);
    assert.equal(characteristicMax(race, "body.endurance"), 9);
    assert.equal(characteristicMax(race, "body.dexterity"), HUMAN_MAX,
      "only Strength and Endurance are capped");
  }

  // "Strength and Endurance (base 4, max 12)"
  assert.equal(characteristicMax("vorox", "body.strength"), 12);
  assert.equal(characteristicMax("vorox", "body.endurance"), 12);
});

test("a base never exceeds its own maximum", () => {
  for (const key of Object.keys(RACES)) {
    for (const { path, base } of racialModifiers(key)) {
      if (base === null) continue;
      assert.ok(base <= characteristicMax(key, path),
        `${key} starts ${path} at ${base}, above its ceiling`);
    }
  }
});

/* -------------------------------------------- */
/*  Restrictions                                */
/* -------------------------------------------- */

test("a Vorox can never awaken the occult (p.83)", () => {
  assert.equal(canAwakenOccult("vorox"), false);
  for (const race of ["human", "urObun", "urUkar"]) {
    assert.equal(canAwakenOccult(race), true);
  }
});

test("a Vorox always has Passion primary (p.83)", () => {
  assert.equal(getRace("vorox").forcedPrimary, "spirit.passion");
  assert.equal(getRace("human").forcedPrimary, undefined);
});

test("each alien race speaks its own tongue for nothing (p.88)", () => {
  assert.equal(getRace("urObun").freeLanguage, "Speak (Obunish)");
  assert.equal(getRace("urUkar").freeLanguage, "Speak (Ukarish)");
  assert.equal(getRace("vorox").freeLanguage, "Speak (Voroxish)");
  assert.equal(getRace("human").freeLanguage, undefined);
});

/* -------------------------------------------- */
/*  Costs and allowances                        */
/* -------------------------------------------- */

test("playing an alien costs Extra points (p.88)", () => {
  assert.equal(racialCost("human"), 0);
  assert.equal(racialCost("urObun"), 2);
  assert.equal(racialCost("urUkar"), 0, "the Ukari cost nothing to play");
  assert.equal(racialCost("vorox"), 10);
  assert.equal(racialCost("vorox", true), 16, "a royal Vorox, with the poison claw");
  assert.equal(racialCost("urObun", true), 2, "only the Vorox have a royal price");
});

test("the Ur-Obun get a shorter Tour of Duty (p.83)", () => {
  assert.equal(tourAllowance("urObun", "Tour of Duty", 14), 12);
  assert.equal(tourAllowance("urObun", "Cohort Tour of Duty", 11), 9);
  assert.equal(tourAllowance("urObun", "Another Tour of Duty", 10), 10,
    "only the first Tour and the Cohort are shortened");
  assert.equal(tourAllowance("human", "Tour of Duty", 14), 14);
  assert.equal(tourAllowance("vorox", "Tour of Duty", 14), 14);
});

test("an occult stage adds to a race that already has a rating (p.83)", () => {
  // A human's Natal Psi sets Psi to 3; an Obun's adds three to what they have.
  assert.equal(occultAdds("human"), false);
  assert.equal(occultAdds("urObun"), true);
  assert.equal(occultAdds("urUkar"), true);
});
