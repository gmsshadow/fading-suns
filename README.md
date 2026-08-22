# Fading Suns 2nd Edition Revised — Foundry VTT System

An unofficial game system implementation for **Fading Suns 2nd Edition Revised**, built for **Foundry VTT v13 and v14**.

Version **0.3.2** — ApplicationV2 rewrite plus the Learned Skills compendium.

---

## Installation

Paste the manifest URL into Foundry's *Install System* dialog:

```
https://raw.githubusercontent.com/gmsshadow/fading-suns/refs/heads/main/system.json
```

Or copy the `fading-suns` folder into your Foundry `Data/systems` directory and restart.

- **Windows**: `%localappdata%\FoundryVTT\Data\systems`
- **macOS**: `~/Library/Application Support/FoundryVTT/Data/systems`
- **Linux**: `~/.local/share/FoundryVTT/Data/systems`

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

### Public API

```js
game.fadingsuns.rules      // victory charts, resolveGoalRoll, vitalityPenalty
game.fadingsuns.effects    // countEffectSuccesses, damagePool, applyArmour
game.fadingsuns.dice       // goalRoll, effectRoll, damageRoll, armourRoll
```

---

## Roadmap

- Compendiums: weapons and armour from Chapter Seven
- Character creation: lifepath stages as compendium items, with a guided wizard
- Range band penalties applied automatically from token distance (p.174)
- Contested action helper wired to the chat cards (`resolveContest` already exists)
- Psi and Theurgy path structures with level prerequisites (p.128)
- Urge and Hubris tracking (p.143, p.160)
- Sustained and extended actions (p.67)
- Blessings and Curses as Active Effects

---

## Credits

Fading Suns is © Holistic Design Inc. and RedBrick Limited. This system implementation is unofficial, contains no rules text or artwork from the published books, and is not affiliated with or endorsed by the rights holders. You must own the rulebook to play.
