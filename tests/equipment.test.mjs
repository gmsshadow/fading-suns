/**
 * Integration tests over the compiled Weapons and Armour packs.
 *
 * Spot-checks are taken straight from the charts on p.296–p.300, so a slip in
 * transcription fails here rather than at the table.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const loadPack = name => readdirSync(path.join(ROOT, "src", "packs", name))
  .map(f => JSON.parse(readFileSync(path.join(ROOT, "src", "packs", name, f), "utf8")));

const weapons = loadPack("weapons");
const armour = loadPack("armour");
const weapon = name => weapons.find(w => w.name === name);
const armourOf = name => armour.find(a => a.name === name);

/* -------------------------------------------- */

test("the packs hold the charted equipment", () => {
  assert.equal(weapons.length, 61);
  assert.equal(armour.length, 28);
});

test("melee weapons match the chart (p.297)", () => {
  // Broadsword: DMG 6, STR 4, size L, 15 firebirds.
  const sword = weapon("Broadsword").system;
  assert.equal(sword.damage.dice, 6);
  assert.equal(sword.strength, 4);
  assert.equal(sword.size, "L");
  assert.equal(sword.cost, 15);
  assert.equal(sword.weaponType, "melee");
  assert.equal(sword.skill, "Melee");

  // Two-handed sword carries +1 initiative.
  assert.equal(weapon("Two-handed Sword").system.initiativeModifier, 1);
  // The whip trades a goal point for reach.
  assert.equal(weapon("Whip").system.goalModifier, -1);
});

test("firearms carry both range bands, shots and rate (p.298)", () => {
  // Heavy Revolver (.47): DMG 6, RNG 30/40, 6 shots, rate 3, size M, 250.
  const revolver = weapon("Heavy Revolver (.47)").system;
  assert.deepEqual(revolver.range, { short: 30, long: 40 });
  assert.equal(revolver.damage.dice, 6);
  assert.equal(revolver.shots.max, 6);
  assert.equal(revolver.rateOfFire, 3);
  assert.equal(revolver.cost, 250);
});

test("autofire is flagged only where the chart marks it (p.298)", () => {
  const auto = weapons.filter(w => w.system.autofire).map(w => w.name).sort();
  assert.deepEqual(auto, [
    "Assault Rifle (10mm)", "Light Machinegun (10mm)", "SMG (.40)"
  ]);
});

test("lasers give a goal bonus and blasters do not (p.298)", () => {
  assert.equal(weapon("Laser Pistol").system.goalModifier, 1);
  assert.equal(weapon("Laser Rifle").system.goalModifier, 1);
  assert.equal(weapon("Blaster Pistol").system.goalModifier, 0);
  assert.equal(weapon("Blaster Rifle").system.damage.dice, 9);
});

test("the Stunner inflicts stun damage rather than wounds (p.298)", () => {
  assert.equal(weapon("Stunner").system.damage.type, "stun");
  assert.match(weapon("Stunner").system.notes, /Endurance \+ Vigor/);
});

test("bows use Archery and crossbows use Shoot (p.298)", () => {
  assert.equal(weapon("Long Bow").system.skill, "Archery");
  assert.equal(weapon("Heavy Crossbow").system.skill, "Shoot");
  assert.equal(weapon("Long Bow").system.strength, 6);
});

test("thrown weapons use the Throwing skill (p.297)", () => {
  for (const name of ["Throwing Knife", "Throwing Star", "Dart"]) {
    assert.equal(weapon(name).system.weaponType, "thrown");
    assert.equal(weapon(name).system.skill, "Throwing");
  }
});

test("melee weapons carry no range, ranged weapons do", () => {
  for (const w of weapons) {
    const { range, weaponType } = w.system;
    if (weaponType === "melee") assert.equal(range.long, 0, `${w.name} should have no range`);
    else assert.ok(range.long > 0, `${w.name} should have a long range`);
  }
});

test("every weapon has a damage rating, or says why not", () => {
  for (const w of weapons) {
    if (w.system.damage.dice > 0) continue;
    assert.ok(w.system.notes, `${w.name} has no damage and no note explaining it`);
  }
});

/* -------------------------------------------- */

test("armour matches the chart, penalties and all (p.299)", () => {
  // Chain mail: Defense 8, Dex -1, Vigor -2, 20 firebirds.
  const chain = armourOf("Chain Mail").system;
  assert.equal(chain.protection.dice, 8);
  assert.deepEqual(chain.penalties, { strength: 0, dexterity: -1, vigor: -2 });
  assert.equal(chain.cost, 20);

  // Ceramsteel is the heaviest, and Adept Robes uniquely give a bonus.
  assert.equal(armourOf("Ceramsteel").system.protection.dice, 14);
  assert.equal(armourOf("Adept Robes").system.penalties.strength, 2);
});

test("only the armours the chart marks take an energy shield (p.299)", () => {
  const compatible = armour
    .filter(a => a.system.energyShieldCompatible)
    .map(a => a.name).sort();
  assert.deepEqual(compatible, ["Heavy Cloth", "Padded Clothing", "Polymer Knit", "Synthsilk"]);
});

test("physical shields carry ram damage (p.300)", () => {
  assert.equal(armourOf("Buckler").system.shieldDamage, 3);
  assert.equal(armourOf("Large Shield").system.shieldDamage, 6);
  assert.equal(armourOf("Buckler").system.armourType, "shield");
});

test("energy shields carry their absorption band and hits (p.300)", () => {
  const battle = armourOf("Battle Energy Shield").system;
  assert.equal(battle.armourType, "energyShield");
  assert.equal(battle.energyShield.min, 5);
  assert.equal(battle.energyShield.max, 20);
  assert.equal(battle.energyShield.hits.max, 30);
  assert.equal(battle.energyShield.hits.value, battle.energyShield.hits.max, "shields start full");
});

test("armour kinds are partitioned, not overlapping", () => {
  const counts = armour.reduce((m, a) => {
    m[a.system.armourType] = (m[a.system.armourType] ?? 0) + 1;
    return m;
  }, {});
  assert.deepEqual(counts, { armour: 22, shield: 2, energyShield: 4 });
});
