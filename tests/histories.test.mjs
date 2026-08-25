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
  findOverages, GRANT_KINDS, STAGE_BUDGET, CUSTOM_BUDGET
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

/** Stages belonging to a given faction, allowing for shared ones. */
const forFaction = faction => stages.filter(s =>
  (s.system.factions?.length ? s.system.factions.includes(faction) : s.system.faction === faction));

/**
 * Stages belonging to a faction exclusively.
 *
 * Priest and guild Apprenticeships and Early Careers are open to nobles as well
 * — "nobles can join the priesthood at this stage" (p.77) — so membership of
 * the noble list is no longer enough to identify the noble lifepath.
 */
const exclusiveTo = faction => stages.filter(s =>
  !s.system.factions?.length && s.system.faction === faction);

/** The noble lifepath stages, and no one else's. */
const nobleStages = exclusiveTo("noble");
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
  const counts = nobleStages.reduce((m, s) => {
    m[s.system.stageType] = (m[s.system.stageType] ?? 0) + 1;
    return m;
  }, {});
  assert.deepEqual(counts, { upbringing: 15, apprenticeship: 6, earlyCareer: 5 });
});

test("priests and guildsmembers share a composite Upbringing (p.77)", () => {
  const shared = stages.filter(s =>
    s.system.stageType === "upbringing" && s.system.factions?.length);
  const slots = shared.reduce((m, s) => {
    m[s.system.slot] = (m[s.system.slot] ?? 0) + 1;
    return m;
  }, {});
  assert.deepEqual(slots, { environment: 3, class: 3 },
    "City, Town and Country; Wealthy, Average and Poor");

  for (const stage of shared) {
    assert.deepEqual(stage.system.factions.sort(), ["merchant", "priest"]);
  }
});

test("Brother Battle fills the whole Upbringing on its own (p.77)", () => {
  const monk = byName("Upbringing: Brother Battle Warrior Monk");
  assert.equal(monk.system.slot, "", "no slot means it fills the step");
  assert.equal(monk.system.faction, "priest");
  assert.deepEqual(monk.system.factions, [], "not shared with the guilds");
});

test("an Environment and a Class together come to a noble Upbringing's budget", () => {
  // Environment is worth 4 characteristic and 3 skill points, Class 1 and 2 —
  // five and five between them, which is what a noble spends on one stage (p.88).
  const environment = stages.filter(s => s.system.slot === "environment");
  const klass = stages.filter(s => s.system.slot === "class");

  for (const env of environment) {
    for (const cls of klass) {
      const combined = [...env.system.grants, ...cls.system.grants];
      const range = spendRange(combined);
      assert.ok(range.characteristics[0] <= 5 && 5 <= range.characteristics[1],
        `${env.name} + ${cls.name}: ${range.characteristics}`);
      assert.ok(range.skills[0] <= 5 && 5 <= range.skills[1],
        `${env.name} + ${cls.name}: ${range.skills}`);
    }
  }
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

  for (const stage of nobleStages.filter(s => s.system.stageType === "upbringing")) {
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

test("every noble Early Career confers noble rank (p.75)", () => {
  for (const stage of nobleStages.filter(s => s.system.stageType === "earlyCareer")) {
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
  "Early Career: Ambassador": 1,
  // The Avestite Cathedral apprenticeship lists eight skill points against a
  // budget of ten. Nothing is unmodelled in it; the printed stage is short.
  "Apprenticeship: Cathedral (Temple Avesti)": 2,
  // The Brother Battle Early Career comes to sixteen skill points against a
  // budget of fifteen. Eleven are listed outright and the Combat Action it
  // teaches is level five whichever branch is taken, so the extra point is in
  // the printed stage rather than the transcription.
  "Early Career: Brother Battle Warrior Monk": -1,
  // The Scientist lists sixteen skill points against a budget of fifteen.
  // Checked against the printed entry line by line; the book is over by one.
  "Early Career: Scientist": -1,
  // Starship Duty totals fourteen skill points across its common training and
  // whichever posting is taken, against a budget of fifteen.
  "Early Career: Starship Duty": 1,
  // The Market comes to fifteen with a Merchant's trade and fourteen with a
  // Money-Lender's, so the range straddles the budget rather than missing it;
  // the shortfall recorded here is against the cheaper branch.
  "Early Career: The Market": 0,
  // Brother Battle's Upbringing spends ten skill points against a budget of
  // five. It is printed that way, and the order's training is meant to be
  // exceptional, so it is pinned rather than trimmed.
  "Upbringing: Brother Battle Warrior Monk": -5
};

/** Composite halves are judged as a pair, not individually. */
const COMPOSITE = new Set(["environment", "class"]);

/**
 * Alien stages are not judged against the human budgets.
 *
 * A human spends 20 characteristic and 30 skill points across three stages. An
 * alien spends Extra points on their race as well — 2 for an Ur-Obun, 10 for a
 * Vorox — and their histories are written to different totals as a result: the
 * Vorox Warrior Upbringing alone lists fifteen skill points where a human gets
 * five, while the Vhem-saahen Champion Apprenticeship lists only five where a
 * human gets ten.
 *
 * They are checked against their own recorded spends below instead, so a change
 * is still caught.
 */
const ALIEN_SPEND = {
  
  "Upbringing: Ur-Ukar": { characteristics: 5, skills: 6 },
  "Upbringing: Chieftain (Vorox)": { characteristics: 5, skills: 9 },
  "Upbringing: Warrior (Vorox)": { characteristics: 5, skills: 15 },
  "Apprenticeship: Vhem-saahen Champion (Ur-Obun)": { characteristics: 5, skills: 5 }
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

  // An option may itself contain a choice — the Seedy career's trades each
  // offer a Spirit pick — so this recurses rather than counting one level.
  const flat = list => {
    let c = 0, s = 0;
    for (const g of list ?? []) {
      if (g.kind === "characteristic") c += g.value;
      else if (g.kind === "skill") s += g.value;
      else if (g.kind === "language") s += g.points;
      else if (g.kind === "combatAction") s += g.value;
      else if (g.kind === "choice" && g.pool) {
        const value = g.value * (g.pick ?? 1);
        if (["spirit", "characteristic"].includes(g.pool)) c += value;
        else s += value;
      }
      else if (g.kind === "choice") {
        const inner = (g.options ?? []).map(o => flat(o.grants));
        c += Math.max(...inner.map(i => i.c), 0) * (g.pick ?? 1);
        s += Math.max(...inner.map(i => i.s), 0) * (g.pick ?? 1);
      }
    }
    return { c, s };
  };

  for (const grant of grants) {
    // Racial traits are bought with Extra points, not the stage's budget (p.88).
    if (grant.racial) continue;
    if (grant.kind !== "choice") {
      const { c, s } = flat([grant]);
      cMin += c; cMax += c; sMin += s; sMax += s;
      continue;
    }

    const pick = grant.pick ?? 1;

    if (grant.pool) {
      // An open choice declares its worth. Both the "spirit" and the wider
      // "characteristic" pools draw on the characteristic budget; everything
      // else — skills, languages, powers — comes out of the skill budget.
      const value = grant.value * pick;
      if (["spirit", "characteristic"].includes(grant.pool)) { cMin += value; cMax += value; }
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
    if (COMPOSITE.has(stage.system.slot)) continue;
    if (stage.system.race) continue;
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
  for (const stage of nobleStages.filter(s => s.system.stageType === "upbringing")) {
    const labels = stage.system.suggestedBenefices.map(e => e.label);
    assert.ok(labels.includes("Nobility"), `${stage.name} is missing Nobility`);
    assert.ok(labels.includes("Riches"), `${stage.name} is missing Riches`);
  }
});

test("only the houses the book names carry extra suggestions (p.73)", () => {
  const extras = {};
  for (const stage of nobleStages.filter(s => s.system.stageType === "upbringing")) {
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

/* -------------------------------------------- */
/*  Priests and guilds (p.77–82)                */
/* -------------------------------------------- */

test("the priest Apprenticeship matrix is three settings by four sects (p.77)", () => {
  // Obun and Ukari may take a human sect's Apprenticeship, so their own stages
  // list "priest" too; the matrix is the human one.
  const priest = stages.filter(s =>
    s.system.stageType === "apprenticeship" && !s.system.race
    && s.system.factions?.includes("priest"));

  const settings = {};
  for (const stage of priest) (settings[stage.system.group] ??= []).push(stage.name);

  // Temple Avesti print "See Cathedral, above" for Parish and Monastery, so
  // those two cells are absent rather than invented: ten entries, not twelve.
  assert.deepEqual(Object.keys(settings).sort(), ["Cathedral", "Monastery", "Parish"]);
  assert.equal(settings.Cathedral.length, 4, "all four sects train in cathedrals");
  assert.equal(settings.Parish.length, 3, "Avestites reuse the Cathedral entry");
  assert.equal(settings.Monastery.length, 3, "and again for the monastery");
});

test("the guild Apprenticeship matrix omits the cells the book omits (p.80)", () => {
  const guild = stages.filter(s =>
    s.system.stageType === "apprenticeship" && !s.system.race
    && s.system.factions?.includes("merchant"));

  const settings = {};
  for (const stage of guild) (settings[stage.system.group] ??= []).push(stage.name);

  assert.equal(settings.Academy.length, 5, "all five guilds run an academy");
  assert.equal(settings.Guildhall.length, 5);
  assert.equal(settings["The Streets"].length, 5);
});

test("nobles may join the priesthood or a guild at Apprenticeship (p.77, p.80)", () => {
  const joinable = stages.filter(s =>
    s.system.stageType === "apprenticeship" && !s.system.race
    && s.system.factions?.includes("noble"));
  assert.ok(joinable.length >= 20, "both matrices are open to nobles");

  // But their Upbringings are not shared.
  const upbringings = stages.filter(s =>
    s.system.stageType === "upbringing" && s.system.factions?.includes("noble"));
  assert.equal(upbringings.length, 0);
});

test("each faction's Early Careers confer the rank that faction uses", () => {
  const rankFor = {
    priest: "Ordained",
    merchant: "Commissioned"
  };

  for (const [faction, expected] of Object.entries(rankFor)) {
    const careers = stages.filter(s =>
      s.system.stageType === "earlyCareer" && !s.system.race
      && s.system.factions?.includes(faction));
    assert.ok(careers.length, `${faction} should have Early Careers`);

    for (const career of careers) {
      const rank = career.system.grants.find(g => g.kind === "benefice");
      assert.ok(rank, `${career.name} grants no rank`);
      assert.equal(rank.label, expected, `${career.name} should confer ${expected}`);
    }
  }
});

test("Brother Battle runs its own track, closed to nobles and guilds", () => {
  const brotherBattle = stages.filter(s => s.system.group === "Brother Battle");
  assert.equal(brotherBattle.length, 3, "an Upbringing, an Apprenticeship and an Early Career");
  for (const stage of brotherBattle) {
    assert.equal(stage.system.faction, "priest");
    assert.deepEqual(stage.system.factions, []);
  }
});

test("the Brother Battle track teaches Combat Actions matched to its style (p.78)", () => {
  const appr = byName("Apprenticeship: Brother Battle Warrior Monk").system;
  const style = appr.grants.find(g => g.kind === "choice" && g.id === "pr-bb-style");

  const [mantok, sword] = style.options;
  assert.deepEqual(mantok.grants.map(g => g.label), ["Martial Fist", "Martial Kick", "Martial Hold"]);
  assert.deepEqual(sword.grants.map(g => g.label), ["Parry", "Thrust", "Slash"]);
});


/* -------------------------------------------- */
/*  The alien races (p.83)                      */
/* -------------------------------------------- */

const alienStages = stages.filter(s => s.system.race);

test("all three alien races have a full lifepath", () => {
  const counts = {};
  for (const stage of alienStages) {
    const race = (counts[stage.system.race] ??= {});
    race[stage.system.stageType] = (race[stage.system.stageType] ?? 0) + 1;
  }

  assert.deepEqual(counts, {
    urObun: { upbringing: 1, apprenticeship: 3, earlyCareer: 3 },
    urUkar: { upbringing: 1, apprenticeship: 2, earlyCareer: 2 },
    // "Chieftain" and "Warrior" are separate Vorox Upbringings; the two share
    // one "Civilised" Apprenticeship.
    vorox: { upbringing: 2, apprenticeship: 1, earlyCareer: 2 }
  });
});

test("alien stages spend what their entries actually list", () => {
  for (const [name, expected] of Object.entries(ALIEN_SPEND)) {
    const stage = byName(name);
    assert.ok(stage, `${name} is missing from the pack`);
    const range = spendRange(stage.system.grants);
    assert.equal(range.characteristics[1], expected.characteristics, `${name} characteristics`);
    assert.equal(range.skills[1], expected.skills, `${name} skills`);
  }
});

test("every other alien stage lands on the human budget", () => {
  for (const stage of alienStages) {
    if (stage.name in ALIEN_SPEND) continue;
    const budget = STAGE_BUDGET[stage.system.stageType];
    const range = spendRange(stage.system.grants);
    assert.ok(budget.characteristics >= range.characteristics[0]
           && budget.characteristics <= range.characteristics[1],
      `${stage.name}: ${range.characteristics} vs ${budget.characteristics}`);
    assert.ok(budget.skills >= range.skills[0] && budget.skills <= range.skills[1],
      `${stage.name}: ${range.skills} vs ${budget.skills}`);
  }
});

test("Obun and Ukari may take a human sect's or guild's Apprenticeship (p.83)", () => {
  const open = alienStages.filter(s =>
    s.system.stageType === "apprenticeship" && s.system.factions?.length);
  assert.ok(open.length >= 5);
  for (const stage of open) {
    assert.ok(stage.system.factions.includes("alien"));
  }
});

test("only a Vorox carries the racial Benefices (p.83)", () => {
  const racial = ["Bite", "Extra Limbs", "Poison Claw", "No Occult"];
  for (const stage of stages) {
    const granted = stage.system.grants
      .filter(g => g.kind === "benefice" && racial.includes(g.label))
      .map(g => g.label);
    if (!granted.length) continue;
    assert.equal(stage.system.race, "vorox", `${stage.name} grants ${granted}`);
  }
});

test("only a royal Vorox has the Poison Claw (p.83)", () => {
  const withClaw = alienStages.filter(s =>
    s.system.grants.some(g => g.kind === "benefice" && g.label === "Poison Claw"));
  assert.deepEqual(withClaw.map(s => s.name), ["Upbringing: Chieftain (Vorox)"],
    "the Chieftain is the royal line; the Warrior is not");
});

test("both Vorox Early Careers teach Graa (p.83)", () => {
  for (const name of ["Early Career: Chieftain (Vorox)", "Early Career: Warrior (Vorox)"]) {
    const actions = byName(name).system.grants
      .filter(g => g.kind === "combatAction").map(g => g.label);
    assert.deepEqual(actions, ["Banga (Charge)", "Drox"]);
  }
});

/* -------------------------------------------- */
/*  Budgets across a whole lifepath (p.87)      */
/* -------------------------------------------- */

test("every stage spends exactly its published characteristic budget", () => {
  // Skills vary — eleven stages are printed off their budget — but the
  // characteristic side is exact across all 89 stages, in every faction and
  // race. Any drift here is a transcription error rather than an erratum.
  const composite = { environment: 4, class: 1 };

  for (const stage of stages) {
    const budget = composite[stage.system.slot] ?? STAGE_BUDGET[stage.system.stageType].characteristics;
    const [min, max] = spendRange(stage.system.grants).characteristics;
    assert.ok(min <= budget && budget <= max,
      `${stage.name} spends ${min}-${max} characteristic points, expected ${budget}`);
  }
});

test("a complete human lifepath comes to the Custom Creation totals (p.87)", () => {
  // Twenty characteristic and thirty skill points, however they are spent.
  const path = [
    byName("Upbringing: High-Court (Hawkwood)"),
    byName("Apprenticeship: Soldier"),
    byName("Early Career: Soldier")
  ];

  const grants = path.flatMap(s => s.system.grants);
  const range = spendRange(grants);
  assert.deepEqual(range.characteristics, [CUSTOM_BUDGET.characteristics, CUSTOM_BUDGET.characteristics]);
  assert.deepEqual(range.skills, [CUSTOM_BUDGET.skills, CUSTOM_BUDGET.skills]);
});

test("a composite priest lifepath comes to the same totals", () => {
  const path = [
    byName("Upbringing: City"),
    byName("Upbringing: Wealthy"),
    byName("Apprenticeship: Cathedral (Orthodoxy)"),
    byName("Early Career: Preacher/Pastor")
  ];

  const range = spendRange(path.flatMap(s => s.system.grants));
  assert.deepEqual(range.characteristics, [20, 20]);
  assert.deepEqual(range.skills, [30, 30]);
});

test("the Ur-Obun racial trait is not charged to the Upbringing (p.88)", () => {
  // "Psi (base 1; 3 pts) or Theurgy (base 1; 3 pts)" is part of the racial
  // package, bought with Extra points, so the Upbringing's own five stand.
  const obun = byName("Upbringing: Ur-Obun").system;
  const racial = obun.grants.filter(g => g.racial);
  assert.equal(racial.length, 1, "the occult choice is the only racial grant");
  assert.equal(racial[0].pool, undefined);
  assert.equal(spendRange(obun.grants).characteristics[1], 5,
    "without it the Upbringing spends exactly five");
});

/* -------------------------------------------- */
/*  Where the ten Benefice points go (p.85)     */
/* -------------------------------------------- */

test("every Early Career confers a rank worth three points (p.85)", () => {
  // "The base 10 pts of Benefices were spent on rank at the end of the Early
  //  Career stage and the rest were spent on Worldly Benefits during the Extra
  //  Stages." Every career that confers rank does so at three.
  const ranks = ["Nobility", "Ordained", "Commissioned"];

  for (const stage of stages.filter(s => s.system.stageType === "earlyCareer")) {
    const rank = stage.system.grants.find(g =>
      g.kind === "benefice" && ranks.includes(g.label));
    if (!rank) continue;
    assert.equal(rank.value, 3, `${stage.name} confers ${rank.label} at ${rank.value}`);
  }
});

test("a career's rank plus a Tour's Benefit fit inside the ten points (p.85)", () => {
  const career = byName("Early Career: Soldier");
  const rank = career.system.grants.find(g => g.kind === "benefice");
  assert.equal(rank.value, 3);

  // A Tour of Duty's Worldly Benefits are the "rest" the passage describes, so
  // the dearest of them must still leave the total inside ten.
  const tour = extraStages.find(s => s.name === "Extra Stage: Tour of Duty");
  const benefit = tour.system.grants.find(g => g.kind === "choice" && g.id === "extra-tour-benefit");

  const dearest = Math.max(...benefit.options.map(o =>
    (o.grants ?? []).filter(g => g.kind === "benefice").reduce((n, g) => n + g.value, 0)));

  assert.ok(rank.value + dearest <= 10,
    `rank ${rank.value} plus the dearest Benefit ${dearest} exceeds the ten points`);
});

test("the histories name specialties the compendium does not stock", () => {
  // Which is why the skill pickers accept typed values: the compendium holds
  // five Lore specialties, and the histories between them name a couple of
  // dozen more. Refusing those would make half the stages unraisable.
  const stocked = new Set(loadPack("learned-skills").map(d => d.name));

  const named = new Set();
  const walk = grants => {
    for (const g of grants ?? []) {
      if ((g.kind === "skill" || g.kind === "language") && g.specialty) {
        named.add(`${g.key} (${g.specialty})`);
      }
      if (g.kind === "choice") for (const o of g.options ?? []) walk(o.grants);
    }
  };
  for (const stage of allStages) walk(stage.system.grants);

  const beyond = [...named].filter(n => !stocked.has(n));
  assert.ok(beyond.length > 20,
    "the stages name well beyond the stocked list, so free text is required");
  assert.ok(beyond.includes("Lore (Theology)"));
});
