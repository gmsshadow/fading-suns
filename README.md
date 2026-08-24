# Fading Suns 2nd Edition Revised — Foundry VTT System

An unofficial game system implementation for **Fading Suns 2nd Edition Revised**, built for **Foundry VTT v13 and v14**.

Version **0.8.0** — ApplicationV2 rewrite, four compendiums, and the character creation wizard.

---

## Installation

Paste the manifest URL into Foundry's *Install System* dialog:

```
https://raw.githubusercontent.com/gmsshadow/fading-suns/main/system.json
```

To install by hand, download the repository archive and extract it into your Foundry
`Data/systems` directory:

- **Windows**: `%localappdata%\FoundryVTT\Data\systems`
- **macOS**: `~/Library/Application Support/FoundryVTT/Data/systems`
- **Linux**: `~/.local/share/FoundryVTT/Data/systems`

**When upgrading, delete the whole `fading-suns` folder first rather than extracting over it.**
LevelDB pack directories must be replaced wholesale — a stale `MANIFEST` or `CURRENT` left behind
from an older build will shadow the new table files and the compendium will load empty even
though the data is there.

---

## What changed in 0.2.x

### Foundry v14 compatibility

Version 0.1.0 was built on the Application V1 framework, which is deprecated in v13 and **removed in v16**. Everything has been moved onto the modern API:

| v0.1.0 | v0.2.0 |
|---|---|
| `extends ActorSheet` / `ItemSheet` | `HandlebarsApplicationMixin(ActorSheetV2 / ItemSheetV2)` |
| `Actors.registerSheet(...)` | `foundry.applications.apps.DocumentSheetConfig.registerSheet` |
| `getData()` | `_prepareContext()` / `_preparePartContext()` |
| `activateListeners(html)` with jQuery | `static actions` map + plain DOM listeners |
| `new Dialog({...})` | `DialogV2.prompt` / `DialogV2.confirm` |
| `loadTemplates` / `renderTemplate` globals | `foundry.applications.handlebars.*` |
| `TextEditor.enrichHTML` | `foundry.applications.ux.TextEditor.implementation.enrichHTML` |
| `{{editor}}` helper (TinyMCE) | `<prose-mirror>` element — TinyMCE is gone in v14 |
| `CONST.CHAT_MESSAGE_TYPES` | omitted; `rolls: [roll]` is sufficient |
| `template.json` | `documentTypes` in `system.json` + `TypeDataModel` schemas |
| single monolithic sheet template | `static PARTS` + `static TABS` |

Two v14-specific traps are handled explicitly:

- `Actor#prepareBaseData()` resets Active Effect phase tracking in v14. Overriding it without calling `super` makes every update after the first throw. The override in `documents/actor.mjs` always calls `super`.
- The core AppV1 sheet classes are being withdrawn across versions, so the unregistration in `registerSheets()` is guarded rather than assuming `globalThis.ActorSheet` exists.

### Rules corrections

Reading the resolution code against the Core Rules turned up several errors, all now fixed and covered by tests:

- **Victory Chart bands were wrong.** The chart (p.64) is 1–2 → 1, 3–5 → 1, 6–8 → 2, 9–11 → 3, 12–14 → 4, 15–17 → 5, 18–20 → 6.
- **A natural 19 always fails** (p.66). This was not handled at all; only a natural 20 was.
- **Accomplishment labels are keyed off successes, not victory points** (p.64), so "Mediocre" was previously unreachable.
- **Excessive Goal Numbers** (p.66) are now implemented: Goal Numbers above 20 grant bonus victory points from the Extended Victory Chart, and a result of 18 becomes the critical success in place of the Goal Number.
- **Effect dice** (p.65) were entirely missing.

### Compendiums

Five compendiums ship with the system.

**Combat Actions** — all 65 from the charts on p.292–295: 24 Martial Arts, 20 Fencing, 15 Firearms,
3 Shield and the 3 Graa actions of the Vorox. Each carries its level, which is both the skill rating
needed to learn it and its cost in Extra points, one per level (p.88, p.102). The six unrated
firearms actions — Aim, Hipshot, the bursts — are level 0: anyone may attempt them.

Initiative, goal and damage are stored as the charts print them, because several are not plain
numbers (`0/-1`, `-1/m`, `3+`). A numeric modifier is derived alongside wherever the printed value
is a plain integer, so a roll can use it without parsing display text.

**Blessings & Curses** — all 91 entries from p.115–116, across the six printed categories:
Appearance (6), Behaviour (38), Injury (11), Knack (24), Reputation (8) and Size (4).

They are stored as **data, not Active Effects**, and that is a deliberate rules decision. Blessings
and Curses are situational: *"If the situation does not come into play, then the character does not
receive that modifier"* (p.115). An always-on effect would be wrong for all but the Size and
Appearance entries, and would need the gamemaster to remember to suppress it.

Instead, the roll dialog lists whichever of the character's traits could bear on the roll being
made — matched by characteristic, by skill, or flagged as applying to everything — each with its
restriction text, and the player ticks what is true at the table. Traits marked *always applies*
are pre-ticked. Whatever is ticked is folded into the Goal Number.

Six entries carry no die modifier at all and change derived statistics instead: Giant and Tall add
base Vitality, Dwarf, Short and Incurable Disease subtract it, and Limp, Missing Leg and Dwarf set
base run. The Vitality contribution is applied automatically.

**Character Histories** — the noble faction, complete: 26 stages covering fifteen Upbringings
(High-Court, Rural Estate and Landless for each of Hawkwood, Decados, Hazat, Li Halan and al-Malik),
the six noble Apprenticeships and the five noble Early Careers (p.72–75). Apprenticeships and Early
Careers are shared across all five houses, so only the Upbringings vary.

The stage picker groups by house for Upbringings and by pastime for Apprenticeships, so the choice
reads *Hawkwood → High-Court* rather than as a flat list of fifteen.

Blessings, Curses and Benefices are referenced by name in the source and resolved to compendium
uuids at build time, so a typo fails the build rather than producing a dangling link. The test
suite plays whole lifepaths through the engine and checks each stage against its published budget.

The Combat Actions charts resolved the two Duelist stages exactly. The Apprenticeship teaches Parry
(1), Thrust (2) and Slash (3) — precisely the six points it was short. The Early Career's basic
option adds Draw & Strike (4) for ten, and its Parry/Riposte option comes to ten as well. The third
option, Draw & Strike with Disarm and Feint, comes to fourteen; the budget check now accepts a stage
if *some* legal selection lands on budget, which treats that as the bonus for having taken the
Apprenticeship rather than an error.

One stage still does not add up, and is pinned rather than padded: **Early Career: Ambassador** is
one skill point short, with no unmodelled element to account for it. That looks like an erratum.

**Benefices & Afflictions** — 52 entries from p.117–124, across Background, Community,
Possessions, Artifacts & Relics, Riches and Status.

These carry no die modifiers, because they are not that kind of trait: *"Benefices and Afflictions
are based on the individual's place in society"* (p.117). What they carry is a point cost, and
most of them are **ranked** — the cost varies with how much of the benefice you want, and each
rank means something particular:

| | |
|---|---|
| Refuge | 2 = small farm … 10 = military base |
| Cash | 1 = 100 firebirds … 11 = 4,000 firebirds |
| Nobility | 3 = knight … 13 = duke |

Those rank tables are stored as data rather than prose, so a sheet can show *Refuge 6 — Monastery*
and total the spend correctly. The character sheet keeps a running count against the five starting
points, adding whatever Afflictions return, and turns red when overspent. Cash and Assets ranks
also carry their firebird figures, so starting money and yearly income are totalled automatically —
Assets at 7 gives 10,000 a year and 1,000 in hand, being the tenth the rules allow at the start.

**Learned Skills** ships as a compendium of 87 skill items covering the full list on p.99, including every sub-skill: five Lore specialties, five Read and seven Speak languages, thirteen Sciences, four Tech Redemptions, four Warfare specialties and four Social specialties.

Drag any of them onto a character sheet to add it at rating 0. Each carries the characteristic pairing the rulebook gives in that skill's *Roll:* line as a sheet default, which can be changed per character since the gamemaster may call for any pairing. Guild-restricted skills (Science, Spacesuit, Think Machine, Tech Redemption, Drive (Spacecraft)) are flagged as such, and faction-restricted ones — Speak (Graceful Tongue), Speak (Scraver Cant) — carry a `factionSkill` flag.

Sub-skills are named with the specialty in place, so the sidebar reads `Speak (Latin)` rather than seven identical entries called `Speak`.

### New in this release

- **Effect dice** — d6 pools where 1–4 succeed. Weapon damage adds victory dice 1-for-1; armour rolls without them. Attackers may pull the punch (Ctrl-click the damage button on the attack card).
- **Wound penalties** (p.125) — once vital levels are lost, the Penalty Chart modifier is derived and applied to every Goal Roll automatically. Toggleable in system settings.
- **Wyrd derivation** (p.125) — base Wyrd follows the character's occult path: Faith for theurges, primary of Extrovert/Introvert for psychics, primary of Passion/Calm otherwise. A `bonus` field covers Extras and Blessings.
- **Accents** (p.69, optional rule) — spend a Wyrd point to add to the die result, using the accented Victory Charts. Natural 1, 19 and 20 correctly ignore accents.
- **Occult powers spend Wyrd only on success or critical failure** (p.128).
- New characters are created with the nine natural skills at their base rating of 3 (p.97).
- Spirit traits are displayed as opposed pairs with a primary marker (p.93).
- Chat cards for goal rolls, effect dice and item descriptions, with damage and apply-damage buttons.

### Data migration

`template.json` is gone. Each data model's `migrateData()` converts the v0.1.0 shape on read:

- `vitality.max` → `vitality.bonus` (the maximum is now derived from Endurance)
- skill `type` → `skillType` (the old key collided with the Item subtype)
- power/rite `cost` → `wyrdCost`
- bare characteristic names (`"dexterity"`) → dot paths (`"body.dexterity"`)

On first load as GM the system touches every actor and item once to persist the migrated shape. **Back up your world first.**

### Item type identifiers

Three item type ids changed in 0.2.1, before any world had been built on the system:

| 0.1.0 | 0.2.1 |
|---|---|
| `armor` | `armour` |
| `psychic-power` | `psychicPower` |
| `theurgic-rite` | `theurgicRite` |

Type ids are not something `migrateData()` can rewrite, so **items of the old types will not load**. This is deliberate: renaming was free while no worlds existed, and it removes the last spelling inconsistency in the codebase, which otherwise mixed `armor` as a type id with `armour` everywhere else.

---

## Playing

**Goal Rolls.** Click any d20 icon beside a characteristic or skill. Hold **Shift** to skip the configuration dialog. The dialog offers the standard difficulty chart (p.64), a free-text situational modifier, and an accent field.

**Combat.** Click the d20 on a weapon to attack. A successful attack card offers a damage roll carrying the victory dice through automatically. Ctrl-click that button to pull the punch. Damage cards offer *Apply to Selected Tokens*, which subtracts wound points from the selected actors' Vitality.

**Armour.** Click the shield icon on an armour item to roll protection dice. Armour points cancel wound points one for one (p.65).

**Initiative** is decided by comparing skill ratings, with Wits as the tie-breaker (p.64), so the combat tracker orders by Wits rather than rolling.

---

## Development

```
module/
  config.mjs                  characteristics, spirit pairs, natural skills, chart data
  fading-suns.mjs             init hook, sheet registration, settings, migration
  dice/victory-chart.mjs      pure rules engine — charts, criticals, accents, wound penalty
  dice/effect-dice.mjs        pure — d6 pools, pulled punches, armour subtraction
  dice/rolls.mjs              Foundry-facing roll and chat card orchestration
  data/                       TypeDataModel schemas with migrateData()
  documents/                  Actor and Item document classes
  applications/               ApplicationV2 sheets and the roll dialog
  helpers/                    Handlebars preloading, helpers, chat listeners
templates/                    actor parts, item parts, chat cards, dialogs
tests/rules.test.mjs          29 tests against the rulebook's worked examples
```

The two `dice/` modules import nothing from Foundry, so the rules engine is testable in plain Node:

```bash
node --test tests/rules.test.mjs
```

Tests are anchored to the book's own worked examples — Gorgool's Goal 9 rolling 8 for two victory points (p.65), the paramour's Goal 10 rolling 7 for four damage dice (p.66), the Goal 24 rolling 18 for sixteen victory points (p.66), and Lars the axeman's accented critical (p.67).

Throughout the source, rulebook page numbers are used as traceability anchors in comments.

### Character creation

The wand icon beside a character's name opens the creation wizard (p.70–p.89). It offers both
methods the rulebook gives:

**Character Histories** walks Upbringing, Apprenticeship and Early Career, offering only the stages
matching the chosen faction. Every choice a stage carries — *Extrovert or Introvert +1*, *Inquiry
or Knavery 2*, the Questing knight's *Body characteristic (choose two) +1 each* — is gathered on a
single step, and the wizard will not advance until all are settled. The review step shows the
finished character before anything is written.

Open choices — *"Any skill +2"*, *"Spirit characteristic (choose one) +2"* — offer a picker drawn
from the compendiums, narrowed to the family the stage names: *Drive (choose craft)* lists the five
Drive specialties, *Speak (choose dialect)* the seven languages, *Any skill* all ninety-six. A test
asserts every open choice can be satisfied from content that exists, because an unanswerable choice
blocks the wizard outright.

Choices are presented as radio buttons or, where a stage picks more than one, checkboxes with a
running count. A choice turns green when settled and *Next* stays disabled until every one is,
with a tooltip saying how many are outstanding. Ticking a third option in a "choose two" releases
whichever was ticked earliest rather than refusing the click. Revisiting the step shows what was
already chosen.

**The wizard locks once a character has been made.** Running it again would set characteristics to
the new lifepath's values and add a second set of stages, Blessings and Benefices on top of the
existing ones, which is almost never wanted on a character already in play. Players see a padlock;
a gamemaster sees an open padlock and gets a warning dialog before proceeding. Completion is
recorded in `flags.fading-suns.creation`.

Purchases in Step Six take a quantity, so four levels of a skill is one action rather than four
clicks, and removing a purchase clears the whole line.

**Step Five (Benefices)** offers the whole catalogue grouped by category, with a rank field, running
against a budget of ten points. It also shows the
**Suggested Benefices** the rulebook prints against each faction and house (p.72–76), merged across
whichever stages were chosen, each addable at the suggested rank with one click. They are advice
rather than requirement, so nothing is pre-selected and taken ones are ticked rather than hidden.
Every noble carries *Nobility* and *Riches* from the faction write-up; Li Halan add a Church Ally
and al-Malik a Passage Contract, and the book prints none at all for Hawkwood, Decados or the Hazat. **Step Six (Extra points)** spends the 40-point pool on
characteristics (3 each), skills (1), Wyrd (2) and Blessings (their listed cost), with every purchase
listed and removable. Both steps run in Custom Creation too.

Two rules corrected here, both of which the rulebook states more than once and not identically:

- **Benefice points are ten, not five.** Step Five of the creation procedure says ten (p.88); the
  Benefices chapter says five (p.117). Ten is the default since Step Five is the procedure being
  followed, and the world setting *Benefice Points at Creation* overrides it.
- **Afflictions do not enlarge the Benefice budget.** They "give the character additional Extras to
  spend on more Benefices or any other trait" (p.117), so they feed the Extra pool, as Curses do.
  A point spent straight back on a Benefice comes to the same arithmetic, but it need not be —
  and the earlier implementation quietly assumed it would.

**Custom Creation** is the sheet itself, so the wizard says so plainly, shows the 20 and 30 point
budgets and the cap of 8, and gets out of the way.

Nothing touches the actor until *Apply* on the final step, so the wizard can be abandoned at any
point without leaving a half-built character. Applying then:

- sets characteristics to their finished values, with the correct Spirit trait marked primary
- raises skills the character already has, and creates the rest — pulling them from the Learned
  Skills compendium so the characteristic pairing and description come with them
- adds the Blessings, Curses and Benefices the stages grant, at the ranks they grant them
- adds the stage items themselves, so the character's history stays readable on the sheet
- records anything not yet modelled, such as a Duelist's Fencing Actions, on the biography

Two rules the review step surfaces rather than silently swallowing. Traits pushed above the
starting cap of 8 are reduced and the freed points **reported back** for the player to place, per
p.72. A language granted twice — Read Urthish appears in most noble Upbringings — refunds its two
points instead of stacking, and the refund is shown.

### Lifepath grant engine

`module/lifepath/grants.mjs` resolves Character History stages (p.70–p.89). It has no Foundry
imports, so it is tested in plain Node against the rulebook's own worked examples.

A stage grants a bundle of modifications. The schema has to round-trip all four shapes that
appear in a single printed line — this is the Hawkwood High-Court entry from p.73:

> Characteristics—Strength +1, Dexterity +1, Wits +1, Extrovert (primary) +2;
> Skills—Melee +1, Etiquette 1, Lore (Heraldry) 1, Read Urthish (2 pts);
> Blessing—Unyielding; Curse—Prideful

| Grant kind | Handles |
|---|---|
| `characteristic` | a delta, optionally flagging the trait primary and demoting its opposite |
| `skill` | a delta, optionally against a named specialty |
| `language` | a fixed point cost, refunded if the character already has it (p.72) |
| `blessing` / `curse` | a reference to a Blessing or Curse item |
| `choice` | "Extrovert or Introvert +1" — resolved by player selection, never guessed |

Three rules the engine enforces that are easy to miss:

- **Bonuses are cumulative.** Remedy 1 in Apprenticeship plus Remedy 1 in Early Career is
  Remedy 2, not Remedy 1 (p.72).
- **Duplicate languages refund.** A second grant of Read (Urthish) does not stack; its two points
  are freed to spend elsewhere (p.72).
- **The cap of 8 frees points rather than discarding them.** The rulebook's al-Malik duelist ends
  with Dexterity 9; `clampToCap` returns the one point for the player to place (p.72).

Unresolved choices are reported as `pending` rather than silently defaulted, and applying one
throws. An unknown grant kind throws too — a typo in stage data should fail loudly, not produce a
quietly wrong character.

The three stage budgets sum to exactly the Custom Creation totals of 20 characteristic and 30
skill points, which the test suite asserts as a consistency check on the transcription.

### Compendium packs

Pack source lives in `src/packs/` as one readable JSON file per document, which keeps it diffable in version control. The LevelDB directories Foundry loads are build artefacts, compiled by:

```bash
npm install
npm run build:packs
```

Compilation goes through Foundry's own `@foundryvtt/foundryvtt-cli` rather than driving LevelDB by hand, so the output is guaranteed to match what Foundry expects. Document ids are derived deterministically by hashing each document's natural key, so rebuilding never churns ids or breaks links from other documents.

**Three ways a pack fails silently**, all of which the build now guards against:

1. **Missing `_key`.** The CLI keys each document off a `_key` field of the form `!items!<id>`. Without it the pack compiles to an empty database *and reports success*. The build adds it and asserts it does not leak into the stored document.
2. **Non-LevelDB content under `packs/`.** Source JSON therefore lives in `src/packs/`, and `packs/` holds nothing but compiled databases.
3. **A merged pack directory.** LevelDB directories must be replaced wholesale, never extracted over the top of an older copy — a stale `MANIFEST` or `CURRENT` from the previous build will shadow the new table files and the compendium loads empty.

After compiling, the build copies the pack to a scratch directory and reads all 87 documents back the way Foundry does, with `createIfMissing: false`, asserting the count and key format. It fails loudly rather than shipping an empty pack.

### Packs are committed, deliberately

The compiled LevelDB databases in `packs/` are checked into the repository even though they are
build output. They have to be: Foundry installs from the source archive, so a repository without
`packs/` produces an install whose compendiums are all empty — with no error to explain why.

The build is byte-deterministic, so rebuilding produces no diff unless the data in `src/packs/`
has actually changed. **Edit `src/packs/` or `tools/learned-skills.mjs`, run `npm run build:packs`,
and commit both.** CI rebuilds and fails if `packs/` is stale, so a forgotten rebuild is caught
rather than shipped.

### Releasing (optional)

`.github/workflows/release.yml` is available but not required — installing from the branch works
as-is. If you would rather distribute versioned releases, tag and push:

```bash
git tag v0.3.5 && git push --follow-tags
```

The workflow checks the tag matches `system.json`, builds, validates, tests, rewrites the download
URL, asserts the archive really contains compiled packs, and publishes `fading-suns.zip`. Switch
the `manifest` URL in `system.json` to `releases/latest/download/system.json` at the same time,
or Foundry will keep checking the branch.

### Validation

`npm run validate` runs on every push and pull request. It catches the classes of mistake that
fail silently at runtime rather than throwing:

- every Handlebars template compiles
- every helper a template calls actually exists — Handlebars compiles an unknown helper happily and
  only throws when that sheet is rendered, so a typo otherwise surfaces as a runtime crash
- every `FADINGSUNS.*` and `TYPES.*` key referenced in code or templates exists in `lang/en.json`,
  and every declared item type has a label
- every template path referenced from code resolves, and no template is orphaned
- the four item-type registries — `CONFIG.Item.dataModels`, `DETAIL_PARTIALS`, `DEFAULT_IMAGES`
  and the sheet registration — all agree with `system.json`
- declared packs exist and contain LevelDB data, and nothing but compiled packs lives under `packs/`
- no application assigns to a property ApplicationV2 exposes as a getter
- no class declares the same member twice — legal for public members, where the later silently
  wins, and a syntax error for private ones; either way a sign of a half-applied edit

That last one is worth naming. ApplicationV2 exposes `state`, `id`, `title`, `element`, `window`
and others as getters; assigning to one in a subclass constructor throws at construction with a
message that names neither the class nor the file. The check flags any such assignment under
`module/applications/`.

### Public API

```js
game.fadingsuns.rules      // victory charts, resolveGoalRoll, vitalityPenalty
game.fadingsuns.effects    // countEffectSuccesses, damagePool, applyArmour
game.fadingsuns.dice       // goalRoll, effectRoll, damageRoll, armourRoll
```

---

## Roadmap

- Compendiums: weapons and armour from Chapter Seven
- Extra Stages (p.84): Tours of Duty, Psychic Awakening, Theurgic Calling and Cybernetics
- Character histories for the remaining houses, sects and guilds
- Range band penalties applied automatically from token distance (p.174)
- Contested action helper wired to the chat cards (`resolveContest` already exists)
- Psi and Theurgy path structures with level prerequisites (p.128)
- Urge and Hubris tracking (p.143, p.160)
- Sustained and extended actions (p.67)
- Blessings and Curses as Active Effects

---

## Credits

Fading Suns is © Holistic Design Inc. and RedBrick Limited. This system implementation is unofficial, contains no rules text or artwork from the published books, and is not affiliated with or endorsed by the rights holders. You must own the rulebook to play.
