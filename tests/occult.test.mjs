/**
 * Integration tests over the compiled Psychic Powers and Theurgic Rites packs.
 *
 * The core rules give one representative power per level per path and do not
 * reveal the tenth levels (p.128), so the counts below are what the book
 * contains rather than a subset chosen here.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const loadPack = name => readdirSync(path.join(ROOT, "src", "packs", name))
  .map(f => JSON.parse(readFileSync(path.join(ROOT, "src", "packs", name, f), "utf8")));

const powers = loadPack("psychic-powers");
const rites = loadPack("theurgic-rites");
const byId = new Map([...powers, ...rites].map(d => [d._id, d]));

/* -------------------------------------------- */

test("the packs hold the powers and rites the book prints", () => {
  assert.equal(powers.length, 56);
  assert.equal(rites.length, 56);
});

test("the seven psychic paths are present, at the levels the book gives (p.131)", () => {
  const paths = {};
  for (const power of powers) (paths[power.system.path] ??= []).push(power.system.level);
  for (const levels of Object.values(paths)) levels.sort((a, b) => a - b);

  assert.deepEqual(paths, {
    FarHand: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    "Sixth Sense": [1, 2, 3, 4, 5, 6, 7, 8, 9],
    Psyche: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    Soma: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    "Vis Craft": [1, 2, 3, 4, 5, 6, 7, 8, 9],
    Sympathy: [3, 4, 5, 6, 7, 8, 9],
    Omen: [6, 7, 8, 9]
  });
});

test("only the paths that begin above level one lack a first level", () => {
  // "This path begins at level 6" — Omen (p.133). Sympathy begins at three.
  const entryLevels = {};
  for (const power of powers) {
    const { path: name, level } = power.system;
    entryLevels[name] = Math.min(entryLevels[name] ?? 99, level);
  }
  assert.equal(entryLevels.Omen, 6);
  assert.equal(entryLevels.Sympathy, 3);
  for (const name of ["FarHand", "Sixth Sense", "Psyche", "Soma", "Vis Craft"]) {
    assert.equal(entryLevels[name], 1, `${name} should start at level one`);
  }
});

/* -------------------------------------------- */
/*  Prerequisite chains (p.128)                 */
/* -------------------------------------------- */

test("each level requires the one below it in the same path (p.128)", () => {
  // "A psychic with Sixth Sense cannot buy Darksense (level 2) unless she has
  //  first bought Sensitivity (level 1)."
  for (const power of powers) {
    const { requires, level, path: name } = power.system;
    if (!requires) continue;

    const prerequisite = byId.get(requires.split(".").pop());
    assert.ok(prerequisite, `${power.name} requires a document that does not exist`);
    assert.equal(prerequisite.system.path, name, `${power.name} must chain within its own path`);
    assert.ok(prerequisite.system.level < level,
      `${power.name} must require a lower level, not ${prerequisite.system.level}`);
  }
});

test("exactly one entry point per path, and it is the lowest level", () => {
  const entries = powers.filter(p => !p.system.requires);
  assert.equal(entries.length, 7, "one unchained power per path");

  for (const entry of entries) {
    const siblings = powers.filter(p => p.system.path === entry.system.path);
    const lowest = Math.min(...siblings.map(p => p.system.level));
    assert.equal(entry.system.level, lowest,
      `${entry.name} is unchained but is not the lowest level of ${entry.system.path}`);
  }
});

test("no chain skips a published level", () => {
  const paths = {};
  for (const power of powers) (paths[power.system.path] ??= []).push(power);

  for (const [name, list] of Object.entries(paths)) {
    const ordered = [...list].sort((a, b) => a.system.level - b.system.level);
    for (let i = 1; i < ordered.length; i++) {
      const required = byId.get(ordered[i].system.requires.split(".").pop());
      assert.equal(required._id, ordered[i - 1]._id,
        `${name}: ${ordered[i].name} should chain to ${ordered[i - 1].name}`);
    }
  }
});

test("the chains contain no cycles", () => {
  for (const power of powers) {
    const seen = new Set([power._id]);
    let current = power;
    while (current?.system.requires) {
      const next = byId.get(current.system.requires.split(".").pop());
      if (!next) break;
      assert.ok(!seen.has(next._id), `${power.name} sits on a cycle`);
      seen.add(next._id);
      current = next;
    }
  }
});

/* -------------------------------------------- */
/*  Rolls and costs                             */
/* -------------------------------------------- */

test("every power and rite has either a parsed roll or the book's own note", () => {
  // Two rites print "Special (see text)" rather than a pairing, so the printed
  // line is kept instead of being forced into a characteristic and skill.
  for (const doc of [...powers, ...rites]) {
    if (doc.system.rollNote) {
      assert.equal(doc.system.characteristic, "", `${doc.name} should have no pairing`);
      assert.equal(doc.system.skill, "");
      continue;
    }
    assert.match(doc.system.characteristic, /^(body|mind|spirit|occult)\./,
      `${doc.name} has an unparsed characteristic: "${doc.system.characteristic}"`);
    assert.ok(doc.system.skill, `${doc.name} has no skill`);
  }
});

test("only the entries the book leaves special carry a roll note", () => {
  const special = [...powers, ...rites].filter(d => d.system.rollNote).map(d => d.name).sort();
  assert.deepEqual(special, ["Fault of the Soulless", "Fruitful Multiplication"]);
});

test("spot-checks against the printed entries (p.131)", () => {
  const lifting = powers.find(p => p.name === "Lifting Hand").system;
  assert.equal(lifting.level, 1);
  assert.equal(lifting.path, "FarHand");
  assert.equal(lifting.characteristic, "spirit.extrovert");
  assert.equal(lifting.skill, "Focus");
  assert.equal(lifting.wyrdCost, 1);
  assert.equal(lifting.range, "Sight");
  assert.equal(lifting.requires, "", "the first level of a path needs nothing");

  const throwing = powers.find(p => p.name === "Throwing Hand").system;
  assert.equal(throwing.characteristic, "spirit.passion");
  assert.ok(throwing.requires, "level two chains to level one");
});

/* -------------------------------------------- */
/*  Theurgic rites                              */
/* -------------------------------------------- */

test("rites are grouped by sect, with a set common to all (p.147)", () => {
  const sects = {};
  for (const rite of rites) (sects[rite.system.sect] ??= []).push(rite);
  assert.deepEqual(Object.keys(sects).sort(), [
    "Brother Battle Rituals", "Common to All Sects", "Eskatonic Order Rituals",
    "Orthodox Rituals", "Sanctuary Aeon Rituals", "Temple Avesti Rituals"
  ]);
  assert.ok(sects["Common to All Sects"].length >= 9,
    "the shared liturgy should cover most levels");
});

test("every rite records its components (p.147)", () => {
  for (const rite of rites) {
    assert.match(rite.system.components, /^[GLP](, [GLP])*$/,
      `${rite.name} has odd components: "${rite.system.components}"`);
  }
});

test("rites sharing a name across sects are distinguished", () => {
  const names = rites.map(r => r.name);
  assert.equal(new Set(names).size, names.length, "compendium names must be unique");
  assert.ok(names.includes("Armor of the Pancreator (Orthodox)"));
  assert.ok(names.includes("Armor of the Pancreator (Brother Battle)"));
});
