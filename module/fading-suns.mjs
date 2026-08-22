/**
 * Fading Suns 2nd Edition Revised — a game system for Foundry Virtual Tabletop.
 *
 * Targets Foundry v13/v14: ApplicationV2 sheets, TypeDataModel schemas declared in
 * system.json, and the namespaced foundry.* API surface throughout.
 */

import { FADING_SUNS } from "./config.mjs";
import { FadingSunsActor } from "./documents/actor.mjs";
import { FadingSunsItem } from "./documents/item.mjs";
import { FadingSunsActorSheet } from "./applications/actor-sheet.mjs";
import { FadingSunsItemSheet } from "./applications/item-sheet.mjs";
import { preloadTemplates, registerHandlebarsHelpers } from "./helpers/handlebars.mjs";
import { registerChatListeners } from "./helpers/chat.mjs";
import { FadingSunsCharacter, FadingSunsNPC } from "./data/actor-types.mjs";
import {
  FadingSunsWeapon, FadingSunsArmour, FadingSunsEquipment,
  FadingSunsSkill, FadingSunsPsychicPower, FadingSunsTheurgicRite
} from "./data/item-types.mjs";
import * as dice from "./dice/rolls.mjs";
import * as rules from "./dice/victory-chart.mjs";
import * as effects from "./dice/effect-dice.mjs";

const SYSTEM_ID = "fading-suns";

/* -------------------------------------------- */
/*  Initialisation                              */
/* -------------------------------------------- */

Hooks.once("init", () => {
  console.log(`${SYSTEM_ID} | Initialising Fading Suns 2nd Edition Revised`);

  // Public API for macros, world scripts and modules.
  game.fadingsuns = {
    FadingSunsActor,
    FadingSunsItem,
    dice,
    rules,
    effects
  };

  CONFIG.FADING_SUNS = FADING_SUNS;

  // Document classes
  CONFIG.Actor.documentClass = FadingSunsActor;
  CONFIG.Item.documentClass = FadingSunsItem;

  // Data models replace the deprecated template.json (removed in v16).
  CONFIG.Actor.dataModels = {
    character: FadingSunsCharacter,
    npc: FadingSunsNPC
  };
  CONFIG.Item.dataModels = {
    weapon: FadingSunsWeapon,
    armour: FadingSunsArmour,
    equipment: FadingSunsEquipment,
    skill: FadingSunsSkill,
    psychicPower: FadingSunsPsychicPower,
    theurgicRite: FadingSunsTheurgicRite
  };

  // Token resource bars. Vitality and Wyrd maxima are derived, so they must be
  // declared explicitly rather than inferred from the schema.
  CONFIG.Actor.trackableAttributes = {
    character: { bar: ["vitality", "wyrd"], value: ["firebirds"] },
    npc: { bar: ["vitality", "wyrd"], value: [] }
  };

  // Initiative is decided by comparing skill ratings rather than a roll (p.64),
  // so the default formula simply orders by Wits as the published tie-breaker.
  CONFIG.Combat.initiative = { formula: "@wits", decimals: 0 };

  registerSettings();
  registerHandlebarsHelpers();
  registerSheets();
  registerChatListeners();

  return preloadTemplates();
});

/* -------------------------------------------- */
/*  Sheet registration                          */
/* -------------------------------------------- */

/**
 * Register the system's ApplicationV2 sheets and retire the core defaults.
 * The unregistration is guarded because the legacy AppV1 sheet classes are being
 * withdrawn across core versions.
 */
function registerSheets() {
  const { DocumentSheetConfig } = foundry.applications.apps;

  for (const [documentClass, legacy] of [
    [Actor, globalThis.ActorSheet ?? foundry.appv1?.sheets?.ActorSheet],
    [Item, globalThis.ItemSheet ?? foundry.appv1?.sheets?.ItemSheet]
  ]) {
    if (!legacy) continue;
    try {
      DocumentSheetConfig.unregisterSheet(documentClass, "core", legacy);
    } catch (err) {
      console.debug(`${SYSTEM_ID} | Core ${documentClass.documentName} sheet was not registered.`);
    }
  }

  DocumentSheetConfig.registerSheet(Actor, SYSTEM_ID, FadingSunsActorSheet, {
    types: ["character", "npc"],
    makeDefault: true,
    label: "FADINGSUNS.SheetLabels.Actor"
  });

  DocumentSheetConfig.registerSheet(Item, SYSTEM_ID, FadingSunsItemSheet, {
    types: ["weapon", "armour", "equipment", "skill", "psychicPower", "theurgicRite"],
    makeDefault: true,
    label: "FADINGSUNS.SheetLabels.Item"
  });
}

/* -------------------------------------------- */
/*  Settings                                    */
/* -------------------------------------------- */

function registerSettings() {
  game.settings.register(SYSTEM_ID, "applyWoundPenalties", {
    name: "FADINGSUNS.Settings.ApplyWoundPenalties.Name",
    hint: "FADINGSUNS.Settings.ApplyWoundPenalties.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(SYSTEM_ID, "systemMigrationVersion", {
    scope: "world",
    config: false,
    type: String,
    default: ""
  });
}

/* -------------------------------------------- */
/*  Ready                                       */
/* -------------------------------------------- */

Hooks.once("ready", async () => {
  if (!game.user.isGM) return;

  const current = game.system.version;
  const previous = game.settings.get(SYSTEM_ID, "systemMigrationVersion");
  if (previous === current) return;

  // Data model migrateData() handles schema changes transparently on read. Touching
  // each document persists the migrated shape so the legacy keys are cleared.
  if (previous && foundry.utils.isNewerVersion("0.2.0", previous)) {
    ui.notifications.info(game.i18n.localize("FADINGSUNS.Migration.Begin"));
    for (const actor of game.actors) await actor.update({});
    for (const item of game.items) await item.update({});
    ui.notifications.info(game.i18n.localize("FADINGSUNS.Migration.Complete"));
  }

  await game.settings.set(SYSTEM_ID, "systemMigrationVersion", current);
});
