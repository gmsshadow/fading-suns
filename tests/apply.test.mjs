/**
 * Unit tests for writing a finished lifepath onto an actor.
 *
 * Only the pure half is covered here — resolving compendium documents needs a
 * running Foundry. Run with: npm test
 */

import test from "node:test";
import assert from "node:assert/strict";

import { buildActorUpdate, parseSkillLabel, diffSkills } from "../module/lifepath/apply.mjs";
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
