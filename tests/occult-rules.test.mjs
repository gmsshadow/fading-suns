/**
 * Unit tests for Urge and Hubris (p.144, p.162, p.135).
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  URGE_TABOOS, URGE_DEEDS, HUBRIS_TABOOS, HUBRIS_DEEDS,
  triggersFor, findTrigger, triggerCharacteristic, resolveTrigger,
  requiresContest, contestRoll, devilsBargain, SHADOWS
} from "../module/dice/occult.mjs";

/* -------------------------------------------- */
/*  The charts                                  */
/* -------------------------------------------- */

test("the taboo and deed charts hold what the book prints", () => {
  assert.equal(URGE_TABOOS.length, 12);
  assert.equal(URGE_DEEDS.length, 7);
  assert.equal(HUBRIS_TABOOS.length, 13);
  assert.equal(HUBRIS_DEEDS.length, 11);
});

test("every trigger names a characteristic, a skill and a level band", () => {
  for (const shadow of ["urge", "hubris"]) {
    for (const kind of ["taboo", "deed"]) {
      for (const trigger of triggersFor(shadow, kind)) {
        assert.match(trigger.characteristic, /^(body|mind|spirit|occult)\./,
          `${trigger.key}: "${trigger.characteristic}"`);
        assert.ok(trigger.skills.length, `${trigger.key} has no skill`);
        const [min, max] = trigger.levels;
        assert.ok(min >= 1 && max >= min, `${trigger.key} has an odd band`);
      }
    }
  }
});

test("spot-checks against the printed charts", () => {
  // "Fumbling a psychic power roll — Psi+Stoic Mind or Focus — 1" (p.144)
  const fumble = findTrigger("urge", "taboo", "fumbledPower");
  assert.equal(fumble.characteristic, "occult.psi");
  assert.deepEqual(fumble.skills, ["Stoic Mind", "Focus"]);
  assert.deepEqual(fumble.levels, [1, 1]);

  // "Suffering excommunication — Faith+Stoic Mind — 2-3"
  assert.deepEqual(findTrigger("urge", "taboo", "excommunication").levels, [2, 3]);

  // Hubris has its own fumble entry, rolled on Theurgy (p.162)
  const rite = findTrigger("hubris", "taboo", "fumbledRite");
  assert.equal(rite.characteristic, "occult.theurgy");
  assert.deepEqual(rite.skills, ["Focus"]);
});

test("the two charts differ where the book differs", () => {
  // Confession is a year for psychics and a month for theurges.
  assert.match(findTrigger("urge", "taboo", "missingConfession").label, /year/);
  assert.match(findTrigger("hubris", "taboo", "missingConfession").label, /month/);

  // Only theurges can invent proscribed tech or start their own sect.
  assert.ok(findTrigger("hubris", "taboo", "proscribedTech"));
  assert.equal(findTrigger("urge", "taboo", "proscribedTech"), null);
});

test("Forsaking Theurgy costs a level of the trait itself (p.162)", () => {
  const forsaking = findTrigger("hubris", "deed", "forsaking");
  assert.equal(forsaking.cost, "theurgy");
  assert.deepEqual(forsaking.levels, [3, 3]);
});

/* -------------------------------------------- */
/*  "Faith (or Ego, if primary)"                */
/* -------------------------------------------- */

test("a trigger with an alternate uses whichever trait is primary (p.144)", () => {
  const trigger = findTrigger("urge", "taboo", "evilArtifact");
  assert.equal(triggerCharacteristic(trigger, { "spirit.faith": true }), "spirit.faith");
  assert.equal(triggerCharacteristic(trigger, { "spirit.ego": true }), "spirit.ego");
  assert.equal(triggerCharacteristic(trigger, {}), "spirit.faith", "Faith is the default");
});

test("a trigger without an alternate ignores which trait is primary", () => {
  const murder = findTrigger("urge", "taboo", "murder");
  assert.equal(triggerCharacteristic(murder, { "spirit.ego": true }), "spirit.passion");
});

/* -------------------------------------------- */
/*  Resolution                                  */
/* -------------------------------------------- */

test("a taboo is resisted: failing the roll is what gains Urge (p.144)", () => {
  const trigger = findTrigger("urge", "taboo", "murder");
  assert.deepEqual(resolveTrigger({ kind: "taboo", success: true, trigger }),
    { change: 0, applied: false }, "resisting it costs nothing");
  assert.deepEqual(resolveTrigger({ kind: "taboo", success: false, trigger }),
    { change: 1, applied: true });
});

test("a deed is the other way about: the roll must succeed to shed a level", () => {
  const trigger = findTrigger("urge", "deed", "pilgrimage");
  assert.deepEqual(resolveTrigger({ kind: "deed", success: true, trigger }),
    { change: -1, applied: true });
  assert.deepEqual(resolveTrigger({ kind: "deed", success: false, trigger }),
    { change: 0, applied: false });
});

test("the gamemaster's choice is held inside the printed band", () => {
  const trigger = findTrigger("urge", "taboo", "excommunication"); // 2-3
  assert.equal(resolveTrigger({ kind: "taboo", success: false, trigger, levels: 3 }).change, 3);
  assert.equal(resolveTrigger({ kind: "taboo", success: false, trigger, levels: 9 }).change, 3);
  assert.equal(resolveTrigger({ kind: "taboo", success: false, trigger, levels: 1 }).change, 2);
  assert.equal(resolveTrigger({ kind: "taboo", success: false, trigger }).change, 2, "defaults to the floor");
});

/* -------------------------------------------- */
/*  Contests of will (p.135)                    */
/* -------------------------------------------- */

test("raising a trait past its shadow needs a contest (p.135)", () => {
  // "Eusebius has Psi 5 and an Urge 5 and wants to raise his Psi to 6; he must
  //  first tame a level of Urge."
  assert.equal(requiresContest(5, 5), true);
  assert.equal(requiresContest(4, 5), false, "still below the shadow");
  assert.equal(requiresContest(6, 5), true, "and again next time");
  assert.equal(requiresContest(5, 0), false, "no shadow, no contest");
});

test("the contest is rolled differently for each shadow (p.135)", () => {
  assert.equal(contestRoll("urge").characteristic, "mind.wits");
  assert.ok(contestRoll("urge").skills.includes("Knavery"));
  assert.equal(contestRoll("hubris").characteristic, "spirit.faith");
  assert.ok(contestRoll("hubris").skills.includes("Empathy"));
});

/* -------------------------------------------- */
/*  A deal with the devil (p.135)               */
/* -------------------------------------------- */

test("the bargain only bites when it works (p.135)", () => {
  assert.deepEqual(devilsBargain("urge", true), { consequence: true, label: "DarkTwinAwakens" });
  assert.deepEqual(devilsBargain("hubris", true), { consequence: true, label: "IllEffectsSpread" });
  assert.deepEqual(devilsBargain("urge", false), { consequence: false, label: "None" },
    "a failed roll carries no dire effect");
});

test("each shadow knows the trait it resists", () => {
  assert.equal(SHADOWS.urge.trait, "occult.psi");
  assert.equal(SHADOWS.hubris.trait, "occult.theurgy");
});
