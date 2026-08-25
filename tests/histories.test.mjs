/**
 * Integration tests over the compiled Character Histories pack.
 *
 * These read the built source documents rather than fixtures, so a transcription
 * error in tools/character-histories.mjs fails here rather than at the table.
 *
 * Run with:  npm test
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  resolveChoices, applyGrants, applyStages, createState,
  findOverages, GRANT_KINDS, STAGE_BUDGET
} from "../module/lifepath/grants.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadPack(name) {
  const dir = path.join(ROOT, "src", "packs", name);
  return readdirSync(dir).map(f => JSON.parse(readFileSync(path.join(dir, f), "utf8")));
}

const allStages = loadPack("character-histories");

/** The three lifepath stages, which have published point budgets (p.88). */
const stages = allStages.filter(s => s.system.stageType !== "extra");

/** The Extra Stages, which are bought with Extra points instead (p.84). */
const extraStages = allStages.filter(s => s.system.stageType === "extra");
const blessings = loadPack("blessings-curses");
const benefices = loadPack("benefices-afflictions");
const combatActions = loadPack("combat-actions");
const byName = name => allStages.find(s => s.name === name);

/** Characters begin with Body and Mind at 3, and the nine natural skills at 3. */
function startingCharacter() {
  return createState({
    characteristics: {
      "body.strength": 3, "body.dexterity": 3, "body.endurance": 3,
      "mind.wits": 3, "mind.perception": 3, "mind.tech": 3,
      "spirit.extrovert": 3, "spirit.introvert": 1,
      "spirit.passion": 3, "spirit.calm": 1,
      "spirit.faith": 3, "spirit.ego": 1
    },
    primary: { "spirit.extrovert": true, "spirit.passion": true, "spirit.faith": true },
    skills: {
      Charm: 3, Dodge: 3, Fight: 3, Impress: 3, Melee: 3,
      Observe: 3, Shoot: 3, Sneak: 3, Vigor: 3
    }
  });
}

/* -------------------------------------------- */
/*  Pack integrity                              */
/* -------------------------------------------- */

test("the pack holds the complete noble faction", () => {
  assert.equal(allStages.length, 36, "26 lifepath stages plus 10 Extra Stages");
  assert.equal(stages.length, 26);
  const counts = stages.reduce((m, s) => {
    m[s.system.stageType] = (m[s.system.stageType] ?? 0) + 1;
    return m;
  }, {});
  assert.deepEqual(counts, { upbringing: 15, apprenticeship: 6, earlyCareer: 5 });
});

test("every royal house has all three Upbringings (p.73)", () => {
  const houses = ["Hawkwood", "Decados", "Hazat", "Li Halan", "al-Malik"];
  const settings = ["High-Court", "Rural Estate", "Landless"];
  const upbringings = stages.filter(s => s.system.stageType === "upbringing");

  for (const house of houses) {
    for (const setting of settings) {
      const found = upbringings.find(s => s.name === `Upbringing: ${setting} (${house})`);
      assert.ok(found, `missing ${setting} for ${house}`);
      assert.equal(found.system.group, house);
    }
  }
});

test("each house grants the same Blessing and Curse across its Upbringings (p.73)", () => {
  const expected = {
    Hawkwood: ["Unyielding", "Prideful"],
    Decados: ["Suspicious", "Vain"],
    Hazat: ["Disciplined", "Vengeful"],
    "Li Halan": ["Pious", "Guilty"],
    "al-Malik": ["Gracious", "Impetuous"]
  };

  for (const stage of stages.filter(s => s.system.stageType === "upbringing")) {
    const traits = stage.system.grants
      .filter(g => g.kind === "blessing" || g.kind === "curse")
      .map(g => g.label);
    assert.deepEqual(traits, expected[stage.system.group],
      `${stage.name} grants the wrong traits`);
  }
});

test("every grant uses a known kind", () => {
  const walk = grants => {
    for (const grant of grants) {
      assert.ok(GRANT_KINDS.includes(grant.kind), `unknown kind "${grant.kind}"`);
      if (grant.kind === "choice") for (const o of grant.options ?? []) walk(o.grants ?? []);
    }
  };
  for (const stage of allStages) walk(stage.system.grants);
});

test("every choice has a unique id and enough options to satisfy its pick", () => {
  const seen = new Set();
  for (const stage of allStages) {
    for (const choice of stage.system.grants.filter(g => g.kind === "choice")) {
      assert.ok(!seen.has(choice.id), `duplicate choice id "${choice.id}"`);
      seen.add(choice.id);
      if (choice.pool) continue;
      assert.ok(choice.options?.length >= choice.pick,
        `choice "${choice.id}" picks ${choice.pick} from ${choice.options?.length ?? 0}`);
    }
  }
});

test("every Blessing, Curse and Benefice reference resolves to a real document", () => {
  const ids = new Set([...blessings, ...benefices, ...combatActions].map(d => d._id));
  const walk = grants => {
    for (const grant of grants) {
      if (["blessing", "curse", "benefice", "combatAction"].includes(grant.kind)) {
        const id = grant.key.split(".").pop();
        assert.ok(ids.has(id), `dangling reference: ${grant.label} (${grant.key})`);
      }
      if (grant.kind === "choice") for (const o of grant.options ?? []) walk(o.grants ?? []);
    }
  };
  for (const stage of allStages) walk(stage.system.grants);
});

test("characteristic targets are dot paths, not bare names", () => {
  const walk = grants => {
    for (const grant of grants) {
      if (grant.kind === "characteristic") {
        assert.match(grant.key, /^(body|mind|spirit|occult)\./, `bad key "${grant.key}"`);
      }
      if (grant.kind === "choice") for (const o of grant.options ?? []) walk(o.grants ?? []);
    }
  };
  for (const stage of allStages) walk(stage.system.grants);
});

test("every Early Career confers noble rank (p.75)", () => {
  for (const stage of stages.filter(s => s.system.stageType === "earlyCareer")) {
    const rank = stage.system.grants.find(g => g.kind === "benefice");
    assert.ok(rank, `${stage.name} grants no Benefice`);
    assert.equal(rank.label, "Nobility");
    assert.equal(rank.value, 3, "Rank (Knight) is Nobility at three points");
  }
});

/* -------------------------------------------- */
/*  Budgets (p.88)                              */
/* -------------------------------------------- */

/**
 * Stages whose printed skill list does not add up to the published budget.
 *
 * Only one remains. The Ambassador's skill list has no unmodelled element at all
 * and totals fourteen against a budget of fifteen, which appears to be an error
 * in the published stage. It is pinned rather than padded so that the
 * discrepancy stays visible and any change to it is caught.
 *
 * The two Duelist stages used to sit here too. Transcribing the Combat Actions
 * charts resolved them exactly: Parry (1) + Thrust (2) + Slash (3) is the six
 * points the Apprenticeship was missing, and the Early Career's basic option
 * adds Draw & Strike (4) for ten.
 */
const KNOWN_SHORTFALLS = {
  "Early Career: Ambassador": 1
};

/**
 * What a stage spends, as a range.
 *
 * A choice contributes somewhere between its cheapest and dearest option, so a
 * stage is balanced if some legal selection lands on the budget. That matters
 * for the Duelist Early Career, whose three fencing options are worth ten, ten
 * and fourteen — the last being a bonus for having taken the Apprenticeship.
 *
 * @param {object[]} grants
 * @returns {{characteristics: [number, number], skills: [number, number]}}
 */
function spendRange(grants) {
  let cMin = 0, cMax = 0, sMin = 0, sMax = 0;

  const flat = list => {
    let c = 0, s = 0;
    for (const g of list ?? []) {
      if (g.kind === "characteristic") c += g.value;
      else if (g.kind === "skill") s += g.value;
      else if (g.kind === "language") s += g.points;
      else if (g.kind === "combatAction") s += g.value;
    }
    return { c, s };
  };

  for (const grant of grants) {
    if (grant.kind !== "choice") {
      const { c, s } = flat([grant]);
      cMin += c; cMax += c; sMin += s; sMax += s;
      continue;
    }

    const pick = grant.pick ?? 1;

    if (grant.pool) {
      // An open choice declares its worth; "spirit" draws on characteristics.
      const value = grant.value * pick;
      if (grant.pool === "spirit") { cMin += value; cMax += value; }
      else { sMin += value; sMax += value; }
      continue;
    }

    const totals = (grant.options ?? []).map(o => flat(o.grants));
    cMin += Math.min(...totals.map(t => t.c)) * pick;
    cMax += Math.max(...totals.map(t => t.c)) * pick;
    sMin += Math.min(...totals.map(t => t.s)) * pick;
    sMax += Math.max(...totals.map(t => t.s)) * pick;
  }

  return { characteristics: [cMin, cMax], skills: [sMin, sMax] };
}

test("each stage can be spent to its published budget (p.88)", () => {
  for (const stage of stages) {
    if (stage.name in KNOWN_SHORTFALLS) continue;
    const budget = STAGE_BUDGET[stage.system.stageType];
    const range = spendRange(stage.system.grants);

    const [cMin, cMax] = range.characteristics;
    const [sMin, sMax] = range.skills;

    assert.ok(budget.characteristics >= cMin && budget.characteristics <= cMax,
      `${stage.name} spends ${cMin}-${cMax} characteristic points, expected ${budget.characteristics}`);
    assert.ok(budget.skills >= sMin && budget.skills <= sMax,
      `${stage.name} spends ${sMin}-${sMax} skill points, expected ${budget.skills}`);
  }
});

test("the Combat Action charts resolve the Duelist stages exactly (p.294)", () => {
  // Parry 1, Thrust 2, Slash 3, Draw & Strike 4 — from the Fencing Actions Chart.
  const appr = spendRange(byName("Apprenticeship: Duelist").system.grants);
  assert.deepEqual(appr.skills, [10, 10], "Parry + Thrust + Slash makes up the six that were missing");

  const career = spendRange(byName("Early Career: Duelist").system.grants);
  assert.equal(career.skills[0], 15, "the basic option lands exactly on the budget");
  assert.equal(career.skills[1], 19,
    "Draw & Strike with Disarm and Feint runs four over — a bonus for having taken the Apprenticeship");
});

test("known shortfalls are exactly the size recorded, and no larger", () => {
  for (const [name, shortfall] of Object.entries(KNOWN_SHORTFALLS)) {
    const stage = byName(name).system;
    const budget = STAGE_BUDGET[stage.stageType];
    const [, sMax] = spendRange(stage.grants).skills;
    assert.equal(budget.skills - sMax, shortfall,
      `${name} shortfall changed; recheck the transcription against the book`);
  }
});

test("both Duelist stages teach real Combat Actions, not placeholders", () => {
  for (const name of ["Apprenticeship: Duelist", "Early Career: Duelist"]) {
    const stage = byName(name).system;
    const teaches = stage.grants.some(g =>
      g.kind === "combatAction" ||
      (g.kind === "choice" && (g.options ?? []).some(o => (o.grants ?? []).some(x => x.kind === "combatAction"))));
    assert.ok(teaches, `${name} should grant Combat Action items`);
  }
});

test("every Combat Action a stage teaches costs what the compendium says", () => {
  const actions = new Map(loadPack("combat-actions").map(d => [d._id, d.system.level]));
  const walk = grants => {
    for (const grant of grants) {
      if (grant.kind === "combatAction") {
        const id = grant.key.split(".").pop();
        assert.ok(actions.has(id), `dangling combat action: ${grant.label}`);
        assert.equal(grant.value, actions.get(id),
          `${grant.label} is costed at ${grant.value} but is level ${actions.get(id)}`);
      }
      if (grant.kind === "choice") for (const o of grant.options ?? []) walk(o.grants ?? []);
    }
  };
  for (const stage of allStages) walk(stage.system.grants);
});

/* -------------------------------------------- */
/*  Playing a character through                 */
/* -------------------------------------------- */

test("a full Hawkwood lifepath produces a coherent character", () => {
  const path = [
    byName("Upbringing: High-Court (Hawkwood)"),
    byName("Apprenticeship: Soldier"),
    byName("Early Career: Soldier")
  ].map(s => s.system);

  const state = startingCharacter();
  const { pending } = applyStages(state, path, {
    "career-soldier-temper": 1   // Calm
  });

  assert.equal(pending.length, 0, "every choice on this path was answered");

  // Strength: 3 base, +1 Upbringing, +2 Apprenticeship, +2 Early Career.
  assert.equal(state.characteristics["body.strength"], 8);
  // Social (Leadership): 3 in Apprenticeship, 4 more in Early Career.
  assert.equal(state.skills["Social (Leadership)"], 7);
  // Remedy 1 twice over, per the cumulative rule on p.72.
  assert.equal(state.skills.Remedy, 2);
  // Read Urthish is granted once, so nothing is refunded.
  assert.equal(state.skills["Read (Urthish)"], 1);
  assert.equal(state.sparePoints, 0);

  assert.equal(state.blessings.length, 1, "Unyielding");
  assert.equal(state.curses.length, 1, "Prideful");
  assert.equal(state.benefices.length, 1, "Rank (Knight)");
  assert.equal(state.primary["spirit.extrovert"], true);

  assert.equal(findOverages(state).excess, 0, "nothing exceeds the cap of 8");
});

test("the Landless-Duelist-Duelist path overshoots the cap, as the rules warn (p.72)", () => {
  const path = [
    byName("Upbringing: Landless (Hawkwood)"),
    byName("Apprenticeship: Duelist"),
    byName("Early Career: Duelist")
  ].map(s => s.system);

  const state = startingCharacter();
  applyStages(state, path, {
    "appr-duelist-temper": 1,        // Calm
    "appr-duelist-defence": 0,       // Dodge
    "career-duelist-social": 0,      // Extrovert
    "career-duelist-temper": 1,      // Calm
    "career-duelist-actions": 1      // Advanced fencing
  });

  // 3 base + 2 + 2 + 2 = 9, exactly the case the rulebook describes.
  assert.equal(state.characteristics["body.dexterity"], 9);

  // Melee runs over too, by the same arithmetic — 3 natural, then +2 at every
  // stage. The rulebook's example mentions only Dexterity, but the cap applies
  // to skills on the same terms, so two points come back to the player.
  assert.equal(state.skills.Melee, 9);

  const { overages, excess } = findOverages(state);
  assert.equal(excess, 2);
  assert.deepEqual(overages.map(o => o.key).sort(), ["Melee", "body.dexterity"]);
});

test("a stage's choices are reported when left undecided", () => {
  const questing = byName("Early Career: Questing").system;
  const { pending } = resolveChoices(questing.grants, {});
  assert.equal(pending.length, questing.grants.filter(g => g.kind === "choice").length);
  assert.ok(pending.length >= 10, "Questing is almost entirely player-directed");
});

test("open choices in Questing accept a supplied grant", () => {
  const questing = byName("Early Career: Questing").system;
  const spirit = questing.grants.find(g => g.id === "career-questing-spirit-major");
  assert.equal(spirit.pool, "spirit");

  const { grants } = resolveChoices([spirit], {
    "career-questing-spirit-major": [{ kind: "characteristic", key: "spirit.passion", value: 2 }]
  });
  const state = applyGrants(createState({ characteristics: { "spirit.passion": 3 } }), grants);
  assert.equal(state.characteristics["spirit.passion"], 5);
});

test("a Duelist Apprenticeship grants its three Fencing Actions (p.294)", () => {
  const duelist = byName("Apprenticeship: Duelist").system;
  const { grants } = resolveChoices(duelist.grants, {
    "appr-duelist-temper": 0,
    "appr-duelist-defence": 0
  });
  const state = applyGrants(createState(), grants);

  assert.equal(state.combatActions.length, 3, "Parry, Thrust and Slash");
  assert.equal(state.combatActions.reduce((n, a) => n + a.level, 0), 6,
    "levels 1, 2 and 3 — the six points the stage was previously short");
  assert.equal(state.notes.length, 0, "nothing is left as an unmodelled note");
});

/* -------------------------------------------- */
/*  Open choices are resolvable                 */
/* -------------------------------------------- */

/**
 * Every open choice must be answerable from content that actually exists,
 * otherwise the wizard blocks: an unresolvable choice can never leave the
 * pending list, and Next never enables.
 */
test("every open choice can be satisfied from the compendiums", () => {
  const skills = loadPack("learned-skills").map(d => d.name);
  const natural = ["Charm", "Dodge", "Fight", "Impress", "Melee", "Observe", "Shoot", "Sneak", "Vigor"];
  const pool = [...new Set([...natural, ...skills])];

  for (const stage of stages) {
    for (const choice of stage.system.grants.filter(g => g.kind === "choice" && g.pool)) {
      let options;
      if (choice.pool === "spirit") {
        options = ["extrovert", "introvert", "passion", "calm", "faith", "ego"];
      } else {
        options = pool.filter(label =>
          !choice.filter?.length || choice.filter.some(prefix => label.startsWith(prefix)));
        if (choice.pool === "language") options = options.filter(l => /^(Speak|Read)\b/.test(l));
      }

      assert.ok(options.length > 0,
        `"${choice.label}" in ${stage.name} offers nothing — the wizard would block here`);
      assert.ok(Number.isFinite(choice.value),
        `"${choice.label}" in ${stage.name} declares no point value`);
    }
  }
});

test("an open choice, once picked, resolves and no longer blocks", () => {
  const questing = byName("Early Career: Questing").system;
  const open = questing.grants.filter(g => g.kind === "choice" && g.pool);

  const choices = {};
  for (const choice of questing.grants.filter(g => g.kind === "choice")) {
    if (choice.pool === "spirit") {
      choices[choice.id] = [{ kind: "characteristic", key: "spirit.passion", value: choice.value }];
    } else if (choice.pool === "language") {
      choices[choice.id] = [{ kind: "language", key: "Speak", specialty: "Latin", value: 1, points: choice.value }];
    } else if (choice.pool) {
      choices[choice.id] = [{ kind: "skill", key: "Drive", specialty: "Landcraft", value: choice.value }];
    } else {
      choices[choice.id] = Array.from({ length: choice.pick ?? 1 }, (_, i) => i);
    }
  }

  assert.ok(open.length > 0, "Questing has open choices to exercise");
  const { pending } = resolveChoices(questing.grants, choices);
  assert.equal(pending.length, 0, "nothing is left pending once every choice is answered");
});

/* -------------------------------------------- */
/*  Suggested Benefices (p.72–76)               */
/* -------------------------------------------- */

test("every suggested Benefice resolves to a real document", () => {
  const ids = new Set(benefices.map(d => d._id));
  for (const stage of allStages) {
    for (const entry of stage.system.suggestedBenefices ?? []) {
      assert.ok(entry.label, `${stage.name} has a suggestion with no label`);
      const id = entry.uuid.split(".").pop();
      assert.ok(ids.has(id), `${stage.name} suggests a missing document: ${entry.label}`);
    }
  }
});

test("every noble Upbringing carries the faction's own suggestions (p.72)", () => {
  // "Suggested Benefices: Nobility, Riches" is printed against the Nobles
  // write-up rather than any one house, so it applies to all of them.
  for (const stage of stages.filter(s => s.system.stageType === "upbringing")) {
    const labels = stage.system.suggestedBenefices.map(e => e.label);
    assert.ok(labels.includes("Nobility"), `${stage.name} is missing Nobility`);
    assert.ok(labels.includes("Riches"), `${stage.name} is missing Riches`);
  }
});

test("only the houses the book names carry extra suggestions (p.73)", () => {
  const extras = {};
  for (const stage of stages.filter(s => s.system.stageType === "upbringing")) {
    const own = stage.system.suggestedBenefices
      .filter(e => !["Nobility", "Riches"].includes(e.label))
      .map(e => e.label);
    if (own.length) extras[stage.system.group] = own;
  }
  assert.deepEqual(extras, {
    "Li Halan": ["Church Ally (1-11 pts)"],
    "al-Malik": ["Passage Contract (8 pts)"]
  }, "Hawkwood, Decados and the Hazat have none printed");
});

test("suggestions merge across stages without duplicating", () => {
  // Every noble Upbringing suggests Nobility, and so may a career; a wizard
  // merging them should show one entry, not several.
  const upbringing = byName("Upbringing: High-Court (al-Malik)").system;
  const career = byName("Early Career: Questing").system;

  const merged = new Map();
  for (const stage of [upbringing, career]) {
    for (const entry of stage.suggestedBenefices) {
      const existing = merged.get(entry.uuid);
      if (existing) existing.value = Math.max(existing.value, entry.value);
      else merged.set(entry.uuid, { ...entry });
    }
  }

  const labels = [...merged.values()].map(e => e.label).sort();
  assert.deepEqual(labels, [
    "Imperial Knight Charter (5 pts)",
    "Nobility",
    "Passage Contract (8 pts)",
    "Riches",
    "Well-Travelled (5 pts)"
  ]);
});


/* -------------------------------------------- */
/*  Extra Stages (p.84)                         */
/* -------------------------------------------- */

test("all ten Extra Stages are present", () => {
  assert.equal(extraStages.length, 10);
  const groups = extraStages.reduce((m, s) => {
    m[s.system.group] = (m[s.system.group] ?? 0) + 1;
    return m;
  }, {});
  assert.deepEqual(groups, {
    "Tours of Duty": 2,
    "Imperial Tours": 2,
    Cybernetics: 2,
    "Psychic Awakening": 2,
    "Theurgic Calling": 2
  });
});

test("two Extra Stages spend the whole Extra point allowance (p.85)", () => {
  // "Extra points are spent during the extra stages: Tour of Duty (two stages,
  //  20 pts per tour)" — two twenty-point stages come to the full forty.
  const tour = extraStages.find(s => s.name === "Extra Stage: Tour of Duty");
  const another = extraStages.find(s => s.name === "Extra Stage: Another Tour of Duty");
  assert.equal(tour.system.extraCost + another.system.extraCost, 40);
});

test("Loaded-for-Bear costs the whole allowance and excludes everything else (p.84)", () => {
  const loaded = extraStages.find(s => s.name === "Extra Stage: Loaded-for-Bear");
  assert.equal(loaded.system.extraCost, 40);
  assert.equal(loaded.system.exclusive, true);
  assert.equal(loaded.system.allowance.free, 40);
});

test("prerequisites point at stages that exist", () => {
  const names = new Set(extraStages.map(s => s.name));
  for (const stage of extraStages) {
    if (!stage.system.requires) continue;
    assert.ok(names.has(stage.system.requires),
      `${stage.name} requires "${stage.system.requires}", which is not in the pack`);
  }
});

test("no Extra Stage is marked pending", () => {
  // The four occult stages waited on the Psi and Theurgy compendiums; those
  // now exist, so nothing should be greyed out.
  const pending = extraStages.filter(s => s.system.pending).map(s => s.name);
  assert.deepEqual(pending, []);
});

test("Tours of Duty hand out a skill allowance rather than fixed skills (p.84)", () => {
  const expected = {
    "Tour of Duty": 14,
    "Another Tour of Duty": 10,
    "Questing Knight Tour of Duty": 10,
    "Cohort Tour of Duty": 11
  };
  for (const [name, skills] of Object.entries(expected)) {
    const stage = extraStages.find(s => s.name === `Extra Stage: ${name}`);
    assert.equal(stage.system.allowance.skills, skills, name);
  }
});

test("a Tour's two characteristic levels are a choice, not a budget (p.84)", () => {
  // "Characteristic (choose one) +1, Characteristic (choose another) +1" — two
  // levels in two different traits, free. Extra points cost three per level and
  // carry no such restriction, so the two must not be pooled together.
  for (const name of ["Tour of Duty", "Another Tour of Duty",
                      "Questing Knight Tour of Duty", "Cohort Tour of Duty"]) {
    const stage = extraStages.find(s => s.name === `Extra Stage: ${name}`);
    const picks = stage.system.grants.filter(g => g.kind === "choice" && g.pool === "characteristic");

    assert.equal(picks.length, 2, `${name} should offer two characteristic picks`);
    assert.ok(picks.every(p => p.value === 1), `${name} picks are worth one level each`);
    assert.equal(stage.system.allowance.characteristics, 0,
      `${name} should carry no characteristic budget, only the picks`);

    const second = picks.find(p => p.distinctFrom);
    assert.ok(second, `${name} should require the second pick to differ from the first`);
    assert.equal(second.distinctFrom, picks.find(p => !p.distinctFrom).id);
  }
});

test("the second characteristic pick excludes whatever the first took", () => {
  const stage = extraStages.find(s => s.name === "Extra Stage: Tour of Duty").system;
  const [first, second] = stage.grants.filter(g => g.kind === "choice" && g.pool === "characteristic");

  // Mirrors the wizard's option filtering.
  const chosen = { [first.id]: [{ kind: "characteristic", key: "body.strength", value: 1 }] };
  const excluded = (chosen[second.distinctFrom] ?? []).map(g => g.key);
  assert.deepEqual(excluded, ["body.strength"]);
});

test("the Imperial tours grant the Benefice that goes with them (p.85)", () => {
  const questing = extraStages.find(s => s.name === "Extra Stage: Questing Knight Tour of Duty");
  const cohort = extraStages.find(s => s.name === "Extra Stage: Cohort Tour of Duty");
  assert.equal(questing.system.grants.find(g => g.kind === "benefice").label, "Imperial Charter");
  assert.equal(cohort.system.grants.find(g => g.kind === "benefice").label, "Cohort Badge");
});

test("each Tour offers its Worldly Benefits under a distinct choice id", () => {
  const ids = extraStages
    .flatMap(s => s.system.grants.filter(g => g.kind === "choice").map(g => g.id));
  assert.equal(new Set(ids).size, ids.length, "choice ids must be unique across the pack");
  assert.ok(ids.length >= 4, "each of the four tours offers a benefit choice");
});

test("the occult Extra Stages are takeable now the compendiums exist", () => {
  const pending = extraStages.filter(s => s.system.pending);
  assert.deepEqual(pending, [], "no Extra Stage should still be waiting on content");
});

test("occult stages grant powers by level, not by note (p.84)", () => {
  const expected = {
    "Extra Stage: Natal Psi": { pool: "psiPower", levels: [1, 2, 3], occult: "occult.psi", wyrd: 2 },
    "Extra Stage: Savant Psi": { pool: "psiPower", levels: [4, 5, 1, 2], occult: "occult.psi", wyrd: 1 },
    "Extra Stage: Neophyte Theurge": { pool: "rite", levels: [1, 2, 3], occult: "occult.theurgy", wyrd: 2 },
    "Extra Stage: Adept Theurge": { pool: "rite", levels: [4, 5, 1, 2], occult: "occult.theurgy", wyrd: 1 }
  };

  for (const [name, want] of Object.entries(expected)) {
    const stage = extraStages.find(s => s.name === name).system;

    const picks = stage.grants.filter(g => g.kind === "choice" && g.pool === want.pool);
    assert.deepEqual(picks.map(p => p.filter[0]), want.levels, `${name} power levels`);

    const trait = stage.grants.find(g => g.kind === "characteristic");
    assert.equal(trait.key, want.occult, `${name} raises the right occult trait`);

    const wyrd = stage.grants.find(g => g.kind === "wyrd");
    assert.equal(wyrd.value, want.wyrd, `${name} Wyrd bonus`);
  }
});

test("every occult power choice can be satisfied from the compendiums", () => {
  const powers = loadPack("psychic-powers");
  const rites = loadPack("theurgic-rites");

  for (const stage of extraStages) {
    for (const choice of stage.system.grants.filter(g => ["psiPower", "rite"].includes(g.pool))) {
      const source = choice.pool === "psiPower" ? powers : rites;
      const level = choice.filter[0];
      const available = source.filter(d => d.system.level === level);
      assert.ok(available.length > 0,
        `"${choice.label}" in ${stage.name} offers nothing at level ${level}`);
    }
  }
});
