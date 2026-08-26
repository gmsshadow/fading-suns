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

Nine compendiums ship with the system.

**Psychic Powers** — 56 across the seven paths the core rules describe, and **Theurgic Rites** — 56
across five sect liturgies plus a set common to all. These are what the book contains rather than a
selection: *"Only one representative power is given per level in the examples below. Also, the tenth
levels are not revealed here, as they are far beyond the ken of beginning characters."* (p.128)

Paths are bought consecutively — level N needs level N-1 of the same path (p.128) — so each entry
names its prerequisite explicitly rather than inferring it from the level number. That matters
because two paths do not start at one: **Sympathy begins at level 3 and Omen at level 6**. Tests
walk every chain, checking it stays within its own path, never skips a published level and contains
no cycles.

The four occult Extra Stages are no longer greyed. Natal Psi and Neophyte Theurge now offer real
pickers filtered to the level being granted, and their Wyrd bonuses raise the character's maximum.

**Weapons** — 61 from the charts on p.296–299: 23 melee including the energy and artifact blades,
4 thrown, 6 bows and crossbows, 13 slug guns, 12 energy guns and 4 heavy weapons. Each carries its
damage dice, Strength requirement, both range bands, shots, rate, size and cost.

**Armour & Shields** — 28 entries: 22 armours with their per-characteristic penalties, 2 physical
shields with ram damage, and 4 energy shields with absorption bands and hit counts.

Two schema corrections came out of the charts. Weapons now carry **two** range bands rather than
three — the book gives Short and Long, with anything beyond Long counting as Extreme — and armour
penalties are **per characteristic** rather than a single number, since chain mail costs -1
Dexterity but -2 Vigor. Both migrate existing items rather than discarding data.

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

**All five playable races are now complete** — 99 Character History stages. The three alien races
add seventeen:

| | Upbringing | Apprenticeship | Early Career |
|---|---|---|---|
| Ur-Obun | 1 | 3 | 3 |
| Ur-Ukar | 1 | 2 | 2 |
| Vorox | 2 (Chieftain, Warrior) | 1 shared | 2 |

Alien stages restate the racial bases their race already carries — *"Strength (max 9)"*,
*"Dexterity (base 4)"* — so only the deltas are granted, with `module/dice/races.mjs` owning the
bases and ceilings. Obun and Ukari may take a human sect's or guild's Apprenticeship instead of
their own (p.83), so those stages are offered under either faction, while the wizard filters every
race-tagged stage to the character's own race.

**Alien histories do not follow the human budgets**, and are not judged against them. A human
spends 20 characteristic and 30 skill points across three stages; an alien spends Extra points on
their race as well — 2 for an Ur-Obun, 10 for a Vorox — and the printed entries reflect that. The
Vorox Warrior Upbringing lists fifteen skill points where a human gets five; the Vhem-saahen
Champion Apprenticeship lists five where a human gets ten. Each is pinned at its actual spend so a
change is still caught.

Five racial traits were added to the compendiums for these: the Curses **Bitter** and **Predatory**,
and the Benefices **Bite**, **Extra Limbs**, **Poison Claw**, plus the Afflictions **Ostracized** and
**No Occult**. Only the royal Vorox line — the Chieftain — carries the Poison Claw, and a test
holds that.

**All three human factions** — 82 of those stages:

| | Upbringing | Apprenticeship | Early Career |
|---|---|---|---|
| Noble | 15 | 6 | 5 |
| Priest | 6 shared + Brother Battle | 10 + Brother Battle | 5 + Brother Battle |
| Merchant | 6 shared | 15 | 7 |

The priest Apprenticeship is a matrix of three settings by four sects, and the guild one of three
settings by five guilds. Where Temple Avesti print *"See Cathedral, above"* for Parish and
Monastery, those cells are absent rather than invented — ten priest entries, not twelve.

Both matrices are open to nobles, since *"nobles can join the priesthood at this stage"* (p.77) and
a guild likewise, *"although it is considered scandalous"* (p.80). Their Upbringings are not shared,
and Brother Battle runs its own closed track from Upbringing to Early Career.

**Each stage records the path it belongs to, separately from who may take it.** A noble's
Apprenticeship step therefore lists only the four groups the book gives them — Military, Diplomacy,
Leisure and Study — with the priest and guild matrices folded away behind *Leaving your path*, which
carries the consequence the rulebook spells out:

> *"Those nobles who do not pass through this stage, but who become priests or guildsmembers
> instead, do not receive noble rank. While they are still considered royal, they receive none of the
> benefits or responsibilities of noble station."* (p.75)

**The Apprenticeship sets the path, and the Early Career follows it.** Both switching notes use the
same word — a character joining the priesthood chooses that stage *"instead of choosing a noble
Apprenticeship"* — so the choice is an either/or made once, and from then on the Early Career step
offers that faction's postings. A noble trained in a cathedral is shown the Ministry careers, not
the knight's; changing the Apprenticeship afterwards clears the career chosen under the old one.

Each path confers only its own rank — Nobility, Ordained or Commissioned — which is what makes the
p.75 warning bite, and a test holds it.

So the cross-faction options remain available, because the rules allow them, but they no longer read
as ordinary noble choices. The freeman Upbringing counts as own to both priests and guildsmembers,
since they genuinely share it, and alien stages belong to the race rather than a faction.

**Priests and guildsmembers share a composite Upbringing** (p.77). Where a noble takes one stage,
they take an *Environment* — City, Town or Country — and a *Class* — Wealthy, Average or Poor. The
two come to exactly the five characteristic and five skill points a noble spends on one stage:
Environment is worth 4 and 3, Class 1 and 2. A test asserts every one of the nine combinations lands
on budget.

The wizard handles this with slots rather than a special case. A stage may declare which slot it
fills, and the Upbringing step then asks for one of each slot the faction's stages define. Nobles
declare no slot, so their step is unchanged. Brother Battle declares none either, which is exactly
right: *"monks are chosen at an early age"* and their single stage fills the whole Upbringing.

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

Five stages do not add up and are pinned rather than padded, each checked line by line against the
printed entry: **Ambassador** (1 short), **Cathedral (Temple Avesti)** (2 short), **Brother Battle
Warrior Monk** — Upbringing (5 over) and Early Career (1 over) — and **Scientist** (1 over). The
Brother Battle overages are plausible as intent, since the order's training is meant to be
exceptional; the rest look like errata.

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

**Skills are typed, not just picked.** Lore takes any topic — *"name it in the specialty"* (p.99) —
and the histories between them name over twenty specialties the compendium does not stock: Lore
(Theology), Lore (Heraldry), Lore (Poisons), Warfare (Starfleet Tactics) and the rest. The skill
pickers are therefore comboboxes: the list suggests everything stocked, everything the character
already has, and everything their chosen stages will grant, but any name may be typed. A skill that
does not exist in the compendium is created from the name rather than refused.

Purchases in Step Six take a quantity, so four levels of a skill is one action rather than four
clicks, and removing a purchase clears the whole line.

**Extra Stages (p.84)** come between the lifepath and Step Five. A character takes two, at 20 Extra
points each — which is the whole 40-point allowance, since the rulebook is explicit that *"Extra
points are spent during the extra stages"* (p.85). Taking fewer leaves points for Step Six, which
nets off whatever the stages consumed.

All ten are listed. The four Tours of Duty and the two Cybernetics options work; the four occult
options are greyed with a note, pending the Psi and Theurgy compendiums. The step enforces the
rulebook's constraints: *Another Tour of Duty* requires a first, *Loaded-for-Bear* costs the full
40 and allows nothing else, and dropping a stage also drops anything that required it.

Tours hand out an allowance rather than fixed traits, and the two halves of it are handled
differently because the rulebook treats them differently.

The **skill points** — 14 for a first tour, 10 for a second, 11 for a Cohort — buy skill levels at
one point per level, which is exactly what an Extra point buys. Same rate, same targets, so they
share one control in Step Six: the allowance is spent first and the remainder falls to Extra points.
Two counters show which is paying. Nothing is hidden by pooling them, because there is nothing to
hide.

The **two characteristic levels** are not a budget at all. *"Characteristic (choose one) +1,
Characteristic (choose another) +1"* is two levels, free, in two **different** traits — where an
Extra point costs three per level and carries no such restriction. Pooling those would quietly
overcharge the player, so they are modelled as what they are: two choices, appearing on the Choices
step alongside every other decision, with the second picker excluding whatever the first took.

**Benefices and Afflictions are offered separately**, in two pickers rather than one mixed list.
They pull in opposite directions — a Benefice spends the ten points, an Affliction costs nothing and
adds to the Extra pool instead (p.117) — so reading them off one dropdown meant checking each entry
to work out which it was. Each picker keeps its own chosen list, and the Affliction side totals the
Extra points it has granted.

**Step Five (Benefices)** offers Benefices and Afflictions in **separate pickers**, since the two
pull in opposite directions: a Benefice spends the ten points, while an Affliction costs nothing and
adds to the Extra pool instead (p.117). Mixed into one list they were hard to tell apart. Each has
its own chosen list, and the Afflictions show the Extra points they have granted.

Both pickers offer the catalogue grouped by category — 39 Benefices, 18 Afflictions — with a rank
field, running
against a budget of ten points. It also shows the
**Suggested Benefices** the rulebook prints against each faction and house (p.72–76), merged across
whichever stages were chosen, each addable at the suggested rank with one click. They are advice
rather than requirement, so nothing is pre-selected and taken ones are ticked rather than hidden.
Every noble carries *Nobility* and *Riches* from the faction write-up; Li Halan add a Church Ally
and al-Malik a Passage Contract, and the book prints none at all for Hawkwood, Decados or the Hazat. **Step Six (Extra points)** spends the 40-point pool on
characteristics (3 each), skills (1), Wyrd (2) and Blessings (their listed cost), with every purchase
listed and removable. Both steps run in Custom Creation too.

Two rules corrected here, both of which the rulebook states more than once and not identically:

- **Benefice points are ten, not five.** Step Five of the creation procedure says ten (p.88), the
  Benefices chapter says five (p.117), and the designers' note on p.85 settles it: *"The base 10 pts
  of Benefices were spent on rank at the end of the Early Career stage and the rest were spent on
  Worldly Benefits during the Extra Stages."* Ten is the default, and the world setting *Benefice
  Points at Creation* overrides it.
- **A rank is a total, and you buy the difference.** Ordained 3 is a Novice and Ordained 5 a Deacon,
  so a priest whose career conferred Novice pays **two** to become a Deacon, not another three
  (p.123). The picker offers the ladder with each rung priced from where the character already
  stands, and rungs already held are greyed:

  ```
  Novice    already held
  Deacon    2 pts
  Fellow    4 pts
  Crafter   6 pts
  ```

  The ladders are not evenly spaced — Nobility runs 3, 5, 7, 9, 11, 13 while Cash runs
  1, 2, 3, 5, 7, 9, 11 — so the cost is computed from the table rather than assumed.
- **Ranked Benefices pool into one entry**, keeping the highest rank reached rather than adding the
  figures together. A career's Ordained 3 and a Deacon bought at Step Five make one entry reading 5,
  whether the points come through the wizard or from dragging an entry onto the sheet.

  28 of the 57 entries are marked as singular: all Status ranks, all forms of Riches, the racial
  traits and the background facts that describe a character rather than name a thing. The other 29
  stay separate, because two Allies are two different people and *Ally 8* would be nonsense.
- **The rank a career confers comes out of those ten**, not on top of them, and so does whatever a
  Tour of Duty's Worldly Benefit hands over. The Benefices step lists them under *Already granted by
  your history* and counts them against the budget, so a knight arrives with Nobility 3 and seven
  points left rather than ten.
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

### Combat

**Initiative is declared, not rolled.** *"Each character's rating is equal to the skill he is using,
and the character with the highest rating acts first"* (p.164) — so the tracker's initiative control
opens a declaration instead: which skill you are acting on, how many actions you are attempting, and
any weapon or combat action modifier. Wits is folded in as a hundredth so ties break the way the
book says while the whole number still reads as the skill rating. Declarations clear at the turn of
each round, since what you did last round says nothing about this one.

**Attack rolls assemble their own modifiers**, itemised in the dialog so the number can be checked
before committing to it:

| Source | Example |
|---|---|
| The weapon's own goal modifier | Laser pistol +1, Rocketeer -2 |
| Range band | Long -2, Extreme -4 (p.296) |
| Strength requirement | -2 if the weapon is too heavy for you (p.296) |
| Multiple actions | -4 for two, -6 for three (p.64) |
| Combat action | Whatever the chart gives |

Range is measured token to token against the current target, and simply left out when either token
is missing — the right answer for a table playing in theatre of the mind rather than a guess.

**Armour and energy shields are rolled by the target** when damage is applied, not worked out by the
attacker. Energy shields work as the chart describes rather than as flat protection: the first
number is the damage needed to *activate* the shield, so a light blow passes straight through
untouched and costs no charge, while a heavy one is capped at the shield's maximum with the
remainder getting past. Activations decrement the fusion cell.

**Combat actions are rollable.** They are "not rolled, but resolved using Fight, Melee or Shoot
skills" (p.102), so using one makes an ordinary Goal Roll with the action's pairing and modifier.

### The alien races

Races are not a bundle of bonuses. They move the **base** a character starts from and the **ceiling**
they may reach (p.88):

| | Str | Dex | End | Wits | Tech | Psi | Urge | Cost | Occult |
|---|---|---|---|---|---|---|---|---|---|
| Human | 3/10 | 3 | 3/10 | 3 | 3 | 0 | 0 | — | yes |
| Ur-Obun | 3/**9** | **4** | 3/**9** | 3 | 3 | 0 | 0 | 2 | yes |
| Ur-Ukar | 3/**9** | **4** | 3/**9** | 3 | **4** | **1** | **1** | — | yes |
| Vorox | **4/12** | 3 | **4/12** | **2** | **1** | 0 | 0 | 10 | **no** |

Maxima are derived rather than stored, so changing a character's race corrects the limits rather
than leaving stale ones behind, and any characteristic already above the new ceiling is flagged on
the sheet.

Four racial rules beyond the numbers: a Vorox always has **Passion primary** and **cannot awaken Psi
or Theurgy**, so the occult Extra Stages are blocked for them with a reason; each alien race speaks
its own tongue for free; **Ur-Obun get a shorter Tour of Duty** — 12 skill points rather than 14, or
9 as a Cohort; and playing an alien costs Extra points before anything else is bought, which the
Extra points step now nets off.

### Urge and Hubris

Psi is shadowed by Urge and Theurgy by Hubris (p.144, p.162). Both charts are implemented — 12 and
13 taboos, 7 and 11 great deeds — each with the roll the rulebook gives.

The direction matters and is easy to get backwards. A **taboo is resisted**: *"the character must
fail this roll or else gain Urge"*. A **deed must succeed** to shed a level. Tests pin both.

Entries reading *"Faith (or Ego, if primary)"* use whichever of that pair the character has marked
primary. Where the chart gives a band — 1–2, 2–3 — the dialog offers it rather than deciding, since
the rulebook leaves that to the gamemaster.

**Fumbling an occult power triggers its taboo automatically.** A critical failure on a psychic power
or theurgic rite makes the resistance roll without being asked, because that is exactly what the
charts say happens.

The occult tab pairs each trait with its shadow and warns when the shadow has caught up: *"Psi and
Theurgy will come into conflict when a character tries to raise one trait past the level of his Urge
or Hubris"* (p.135). The sheet says so rather than leaving the player to notice.

### Do the histories add up?

Character Histories are meant to spend the same totals as Custom Creation — 20 characteristic and 30
skill points across the three stages (p.87, p.88). Auditing all 89 stages and every valid lifepath:

**Characteristics: exact, everywhere.** All 89 stages spend precisely their published characteristic
budget, in every faction and race. A test asserts it, so drift there is a transcription error rather
than an erratum.

**Skills: 78 of 89 stages are exact; eleven are printed off budget.**

| Stage | Skills |
|---|---|
| Upbringing: Warrior (Vorox) | +10 |
| Upbringing: Brother Battle Warrior Monk | +5 |
| Upbringing: Chieftain (Vorox) | +4 |
| Early Career: Duelist | +4 |
| Upbringing: Ur-Ukar | +1 |
| Early Career: Brother Battle Warrior Monk | +1 |
| Early Career: Scientist | +1 |
| Early Career: Ambassador | -1 |
| Early Career: Starship Duty | -1 |
| Apprenticeship: Cathedral (Temple Avesti) | -2 |
| Apprenticeship: Vhem-saahen Champion | -5 |

The alien overages are not errata at all. The designers' note on p.85 says so directly: *"Vorox
spend many of their Extra points during their Upbringing (those beefed up traits are expensive!),
allowing them to take only one other Extra Stage instead of two."* The overspend is paid for out of
Extra points, which is exactly why the Vorox get one Extra Stage rather than two — a restriction the
wizard already enforces. The Brother Battle and Duelist overages read as intent,
both being exceptional training the book gates behind prerequisites. The five small deficits look
like errata.

Every deviation is pinned at its exact size, so a change to any of them fails the suite.

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

`npm run lint` and `npm run validate` both run on every push and pull request.

**ESLint** catches what syntax checking cannot. `node --check` accepts a reference to a variable that
an edit removed — it is valid JavaScript — and the error only appears when that code path runs. In a
wizard step that means the step fails to render and looks like it was skipped. `no-undef`,
`no-dupe-keys` and `no-dupe-class-members` catch all three shapes at build time.

**The validator** catches the rest:

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
game.fadingsuns.combat     // range bands, initiative, energy shields
game.fadingsuns.occult     // Urge and Hubris taboos, deeds and contests
game.fadingsuns.races      // racial bases, maxima, costs and restrictions
game.fadingsuns.effects    // countEffectSuccesses, damagePool, applyArmour
game.fadingsuns.dice       // goalRoll, effectRoll, damageRoll, armourRoll
```

---

## Roadmap

- Range band penalties applied automatically from token distance (p.174)
- Contested action helper wired to the chat cards (`resolveContest` already exists)
- Psi and Theurgy path structures with level prerequisites (p.128)
- Urge and Hubris tracking (p.143, p.160)
- Sustained and extended actions (p.67)
- Blessings and Curses as Active Effects

---

## Credits

Fading Suns is © Holistic Design Inc. and RedBrick Limited. This system implementation is unofficial, contains no rules text or artwork from the published books, and is not affiliated with or endorsed by the rights holders. You must own the rulebook to play.
