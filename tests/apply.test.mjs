/**
 * Unit tests for writing a finished lifepath onto an actor.
 *
 * Only the pure half is covered here — resolving compendium documents needs a
 * running Foundry. Run with: npm test
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  buildActorUpdate, parseSkillLabel, diffSkills, poolBenefices
} from "../module/lifepath/apply.mjs";
import { createState, applyGrants } from "../module/lifepath/grants.mjs";

test("characteristics are written as absolute values, not deltas", () => {
  const state = createState({ characteristics: { "body.strength": 3 } });
  applyGrants(state, [{ kind: "characteristic", key: "body.strength", value: 2 }]);
  const update = buildActorUpdate(state);
  assert.equal(update["system.body.strength.value"], 5);
});

test("primary flags are written for Spirit traits only (p.93)", () => {
  const state = createState({ characteristics: { "spirit.faith": 3, "spirit.ego": 1 } });
  applyGrants(state, [{ kind: "characteristic", key: "spirit.faith", value: 2, primary: true }]);
  const update = buildActorUpdate(state);
  assert.equal(update["system.spirit.faith.primary"], true);
  assert.equal(update["system.spirit.ego.primary"], false);
  assert.ok(!("system.body.strength.primary" in update), "Body traits have no primary flag");
});

test("skill labels round-trip through parsing", () => {
  assert.deepEqual(parseSkillLabel("Lore (Heraldry)"), { name: "Lore", specialty: "Heraldry" });
  assert.deepEqual(parseSkillLabel("Etiquette"), { name: "Etiquette", specialty: "" });
  assert.deepEqual(parseSkillLabel("Social (Debate)"), { name: "Social", specialty: "Debate" });
  assert.deepEqual(parseSkillLabel("Tech Redemption (High-Tech)"),
    { name: "Tech Redemption", specialty: "High-Tech" });
});

test("existing skills are raised and absent ones flagged for creation", () => {
  const existing = [
    { label: "Melee", id: "aaa", value: 3 },
    { label: "Etiquette", id: "bbb", value: 1 }
  ];
  const { updates, missing } = diffSkills(
    { Melee: 5, Etiquette: 1, "Lore (Heraldry)": 1 },
    existing
  );
  assert.deepEqual(updates, [{ _id: "aaa", "system.value": 5 }], "only Melee changed");
  assert.deepEqual(missing, ["Lore (Heraldry)"]);
});

test("a skill already at the right rating produces no update", () => {
  const { updates } = diffSkills({ Dodge: 3 }, [{ label: "Dodge", id: "ccc", value: 3 }]);
  assert.equal(updates.length, 0);
});

test("an empty lifepath writes nothing", () => {
  assert.deepEqual(buildActorUpdate(createState()), {});
  assert.deepEqual(diffSkills({}, []), { updates: [], missing: [] });
});

test("Wyrd bought with Extra points raises the stored bonus (p.88)", () => {
  const state = createState();
  state.wyrdBonus = 3;
  assert.equal(buildActorUpdate(state)["system.wyrd.bonus"], 3);
});

test("no Wyrd bonus is written when none was bought", () => {
  assert.ok(!("system.wyrd.bonus" in buildActorUpdate(createState())));
});

/* -------------------------------------------- */
/*  Typed specialties (p.99)                    */
/* -------------------------------------------- */

test("a typed specialty round-trips into name and specialty", () => {
  // The compendium stocks five Lore specialties, but Lore takes any topic —
  // "name it in the specialty" — and the histories grant twenty more besides.
  for (const [label, expected] of [
    ["Lore (Theology)", { name: "Lore", specialty: "Theology" }],
    ["Lore (People and Places Seen)", { name: "Lore", specialty: "People and Places Seen" }],
    ["Speak (Scraver Cant)", { name: "Speak", specialty: "Scraver Cant" }],
    ["Warfare (Starfleet Tactics)", { name: "Warfare", specialty: "Starfleet Tactics" }]
  ]) {
    assert.deepEqual(parseSkillLabel(label), expected);
  }
});

test("a specialty the compendium does not stock still creates cleanly", () => {
  const { updates, missing } = diffSkills(
    { "Lore (Theology)": 2, Melee: 4 },
    [{ label: "Melee", id: "aaa", value: 3 }]
  );
  assert.deepEqual(missing, ["Lore (Theology)"], "it is created rather than refused");
  assert.deepEqual(updates, [{ _id: "aaa", "system.value": 4 }]);
});

/* -------------------------------------------- */
/*  Pooling ranked Benefices (p.123)            */
/* -------------------------------------------- */

const ORDAINED = "Compendium.fading-suns.benefices-afflictions.Item.ordained";
const ALLY = "Compendium.fading-suns.benefices-afflictions.Item.ally";

test("a career's rank and points bought later pool into one entry (p.123)", () => {
  // The rank tables give a cumulative cost, not an increment: Ordained 5 is a
  // Deacon and costs five points, so 3 from the career plus 2 bought is 5.
  const pooled = poolBenefices([
    { uuid: ORDAINED, value: 3, unique: true },
    { uuid: ORDAINED, value: 2, unique: true }
  ]);

  assert.equal(pooled.length, 1, "one Ordained, not two");
  assert.equal(pooled[0].value, 5, "Deacon");
  assert.deepEqual(pooled[0].pooledFrom, [3, 2], "and it records where the points came from");
});

test("entries that name a thing stay separate", () => {
  // Two Allies are two different people; "Ally 8" would be nonsense.
  const pooled = poolBenefices([
    { uuid: ALLY, value: 3, unique: false },
    { uuid: ALLY, value: 5, unique: false }
  ]);
  assert.equal(pooled.length, 2);
  assert.deepEqual(pooled.map(p => p.value).sort(), [3, 5]);
});

test("a single instance is not marked as pooled", () => {
  const [only] = poolBenefices([{ uuid: ORDAINED, value: 3, unique: true }]);
  assert.equal(only.value, 3);
  assert.ok(!("pooledFrom" in only), "nothing was pooled, so nothing is recorded");
});

test("pooling handles three or more sources", () => {
  const [pooled] = poolBenefices([
    { uuid: ORDAINED, value: 3, unique: true },
    { uuid: ORDAINED, value: 2, unique: true },
    { uuid: ORDAINED, value: 2, unique: true }
  ]);
  assert.equal(pooled.value, 7, "Fellow");
  assert.deepEqual(pooled.pooledFrom, [3, 2, 2]);
});

test("unique and repeatable entries coexist without interfering", () => {
  const pooled = poolBenefices([
    { uuid: ORDAINED, value: 3, unique: true },
    { uuid: ALLY, value: 3, unique: false },
    { uuid: ORDAINED, value: 4, unique: true },
    { uuid: ALLY, value: 5, unique: false }
  ]);
  assert.equal(pooled.length, 3, "one Ordained and two Allies");
  assert.equal(pooled.find(p => p.uuid === ORDAINED).value, 7);
});

test("an empty list pools to nothing", () => {
  assert.deepEqual(poolBenefices([]), []);
  assert.deepEqual(poolBenefices(), []);
});
