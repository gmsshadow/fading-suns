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

const stages = loadPack("character-histories");
const blessings = loadPack("blessings-curses");
const benefices = loadPack("benefices-afflictions");
const byName = name => stages.find(s => s.name === name);

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
  for (const stage of stages) walk(stage.system.grants);
});

test("every choice has a unique id and enough options to satisfy its pick", () => {
  const seen = new Set();
  for (const stage of stages) {
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
  const ids = new Set([...blessings, ...benefices].map(d => d._id));
  const walk = grants => {
    for (const grant of grants) {
      if (["blessing", "curse", "benefice"].includes(grant.kind)) {
        const id = grant.key.split(".").pop();
        assert.ok(ids.has(id), `dangling reference: ${grant.label} (${grant.key})`);
      }
      if (grant.kind === "choice") for (const o of grant.options ?? []) walk(o.grants ?? []);
    }
  };
  for (const stage of stages) walk(stage.system.grants);
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
  for (const stage of stages) walk(stage.system.grants);
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
 * Stages whose printed skill list does not add up to the published budget, with
 * the size of the shortfall. These are pinned rather than padded, so that the
 * discrepancy stays visible and any change to it is caught.
 *
 * The two Duelist stages teach Combat Actions. The Extra Point chart prices a
 * Combat Action at "1 per level" (p.87), but the levels of the individual
 * fencing actions live in Chapter Six (p.164), which is not yet transcribed.
 * Without them the shortfall cannot be attributed, and neither figure divides
 * cleanly by the number of actions taught — so no cost is invented here.
 *
 * The Ambassador shortfall is different: its skill list has no unmodelled
 * element at all, and simply totals fourteen against a budget of fifteen. That
 * appears to be an error in the published stage.
 */
const KNOWN_SHORTFALLS = {
  "Apprenticeship: Duelist": 6,
  "Early Career: Duelist": 10,
  "Early Career: Ambassador": 1
};

test("each stage spends its published characteristic and skill budget (p.88)", () => {
  for (const stage of stages) {
    if (stage.name in KNOWN_SHORTFALLS) continue;
    const budget = STAGE_BUDGET[stage.system.stageType];

    // Count the best case: every choice contributes its largest option.
    let characteristics = 0;
    let skills = 0;
    const count = grants => {
      for (const grant of grants) {
        if (grant.kind === "characteristic") characteristics += grant.value;
        else if (grant.kind === "skill") skills += grant.value;
        else if (grant.kind === "language") skills += grant.points;
        else if (grant.kind === "choice" && grant.pool) {
          // An open choice declares the points it is worth, since there are no
          // options to inspect. "spirit" draws on the characteristic budget.
          if (grant.pool === "spirit") characteristics += grant.value * (grant.pick ?? 1);
          else skills += grant.value * (grant.pick ?? 1);
        }
        else if (grant.kind === "choice") {
          const totals = (grant.options ?? []).map(o => {
            let c = 0, s = 0;
            for (const g of o.grants ?? []) {
              if (g.kind === "characteristic") c += g.value;
              else if (g.kind === "skill") s += g.value;
              else if (g.kind === "language") s += g.points;
            }
            return { c, s };
          });
          const best = totals.reduce((m, t) => ({ c: Math.max(m.c, t.c), s: Math.max(m.s, t.s) }), { c: 0, s: 0 });
          characteristics += best.c * (grant.pick ?? 1);
          skills += best.s * (grant.pick ?? 1);
        }
      }
    };
    count(stage.system.grants);

    assert.equal(characteristics, budget.characteristics,
      `${stage.name} spends ${characteristics} characteristic points, expected ${budget.characteristics}`);
    assert.equal(skills, budget.skills,
      `${stage.name} spends ${skills} skill points, expected ${budget.skills}`);
  }
});

test("known shortfalls are exactly the size recorded, and no larger", () => {
  for (const name of Object.keys(KNOWN_SHORTFALLS)) {
    const stage = byName(name).system;
    const budget = STAGE_BUDGET[stage.stageType];

    let skills = 0;
    const count = grants => {
      for (const grant of grants) {
        if (grant.kind === "skill") skills += grant.value;
        else if (grant.kind === "language") skills += grant.points;
        else if (grant.kind === "choice" && grant.pool) skills += grant.value * (grant.pick ?? 1);
        else if (grant.kind === "choice") {
          const best = (grant.options ?? []).reduce((m, o) => {
            const t = (o.grants ?? []).reduce((n, g) => n + (g.kind === "skill" ? g.value : 0), 0);
            return Math.max(m, t);
          }, 0);
          skills += best * (grant.pick ?? 1);
        }
      }
    };
    count(stage.grants);

    assert.equal(budget.skills - skills, KNOWN_SHORTFALLS[name],
      `${name} shortfall changed; recheck the transcription against the book`);
  }
});

test("both Duelist stages record the Combat Actions they teach", () => {
  for (const name of ["Apprenticeship: Duelist", "Early Career: Duelist"]) {
    const stage = byName(name).system;
    const teaches = stage.grants.some(g =>
      g.kind === "note" ||
      (g.kind === "choice" && (g.options ?? []).some(o => (o.grants ?? []).some(x => x.kind === "note"))));
    assert.ok(teaches, `${name} should record the Combat Actions it teaches`);
  }
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

test("a Duelist Apprenticeship records the Fencing Actions it teaches", () => {
  const duelist = byName("Apprenticeship: Duelist").system;
  const { grants } = resolveChoices(duelist.grants, {
    "appr-duelist-temper": 0,
    "appr-duelist-defence": 0
  });
  const state = applyGrants(createState(), grants);
  assert.equal(state.notes.length, 1);
  assert.match(state.notes[0], /Parry, Thrust, Slash/);
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
