/**
 * Fading Suns 2nd Edition Revised — a game system for Foundry Virtual Tabletop.
 *
 * Targets Foundry v13/v14: ApplicationV2 sheets, TypeDataModel schemas declared in
 * system.json, and the namespaced foundry.* API surface throughout.
 */

import { FADING_SUNS } from "./config.mjs";
import { FadingSunsActor } from "./documents/actor.mjs";
import { FadingSunsItem } from "./documents/item.mjs";
import { FadingSunsCombatant } from "./documents/combatant.mjs";
import { FadingSunsActorSheet } from "./applications/actor-sheet.mjs";
import { FadingSunsItemSheet } from "./applications/item-sheet.mjs";
import { FadingSunsCreationWizard } from "./applications/creation-wizard.mjs";
import { preloadTemplates, registerHandlebarsHelpers } from "./helpers/handlebars.mjs";
import { registerChatListeners } from "./helpers/chat.mjs";
import { FadingSunsCharacter, FadingSunsNPC } from "./data/actor-types.mjs";
import {
  FadingSunsWeapon, FadingSunsArmour, FadingSunsEquipment,
  FadingSunsSkill, FadingSunsPsychicPower, FadingSunsTheurgicRite,
  FadingSunsBlessing, FadingSunsBenefice, FadingSunsStage,
  FadingSunsCombatAction
} from "./data/item-types.mjs";
import * as dice from "./dice/rolls.mjs";
import * as rules from "./dice/victory-chart.mjs";
import * as effects from "./dice/effect-dice.mjs";
import * as combat from "./dice/combat.mjs";
import * as occult from "./dice/occult.mjs";
import * as races from "./dice/races.mjs";
import * as lifepath from "./lifepath/grants.mjs";

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
    FadingSunsCreationWizard,
    dice,
    rules,
    effects,
    combat,
    occult,
    races,
    lifepath
  };

  CONFIG.FADING_SUNS = FADING_SUNS;

  // Document classes
  CONFIG.Actor.documentClass = FadingSunsActor;
  CONFIG.Item.documentClass = FadingSunsItem;
  CONFIG.Combatant.documentClass = FadingSunsCombatant;

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
    theurgicRite: FadingSunsTheurgicRite,
    blessing: FadingSunsBlessing,
    benefice: FadingSunsBenefice,
    stage: FadingSunsStage,
    combatAction: FadingSunsCombatAction
  };

  // Token resource bars. Vitality and Wyrd maxima are derived, so they must be
  // declared explicitly rather than inferred from the schema.
  CONFIG.Actor.trackableAttributes = {
    character: { bar: ["vitality", "wyrd"], value: ["firebirds"] },
    npc: { bar: ["vitality", "wyrd"], value: [] }
  };

  // Initiative is a declared rating rather than a roll: "Each character's rating
  // is equal to the skill he is using" (p.164). FadingSunsCombatant sets it from
  // the player's declaration, so no formula is evaluated. Two decimals leave room
  // for Wits to break ties.
  CONFIG.Combat.initiative = { formula: "0", decimals: 2 };

  registerSettings();
  CONFIG.FADING_SUNS.startingBeneficePoints = game.settings.get(SYSTEM_ID, "beneficePoints");
  CONFIG.FADING_SUNS.startingExtraPoints = game.settings.get(SYSTEM_ID, "extraPoints");
  registerHandlebarsHelpers();
  registerSheets();
  registerChatListeners();
  registerCombatHooks();

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
    } catch {
      console.debug(`${SYSTEM_ID} | Core ${documentClass.documentName} sheet was not registered.`);
    }
  }

  DocumentSheetConfig.registerSheet(Actor, SYSTEM_ID, FadingSunsActorSheet, {
    types: ["character", "npc"],
    makeDefault: true,
    label: "FADINGSUNS.SheetLabels.Actor"
  });

  DocumentSheetConfig.registerSheet(Item, SYSTEM_ID, FadingSunsItemSheet, {
    types: ["weapon", "armour", "equipment", "skill", "psychicPower", "theurgicRite", "blessing", "benefice", "stage", "combatAction"],
    makeDefault: true,
    label: "FADINGSUNS.SheetLabels.Item"
  });
}

/* -------------------------------------------- */
/*  Combat                                      */
/* -------------------------------------------- */

/**
 * Declarations last one round: what a character is doing this turn says nothing
 * about the next, so they are cleared as the round turns over (p.164).
 */
function registerCombatHooks() {
  Hooks.on("combatRound", async (combat, updateData, updateOptions) => {
    if (!game.user.isGM) return;
    if (updateOptions?.direction !== 1) return;
    for (const combatant of combat.combatants) await combatant.clearDeclaration();
  });

  // The tracker offers a declaration control in place of the initiative roll.
  Hooks.on("renderCombatTracker", (app, html) => {
    for (const element of html.querySelectorAll("[data-combatant-id]")) {
      const combatant = game.combat?.combatants.get(element.dataset.combatantId);
      if (!combatant?.isOwner) continue;

      const control = element.querySelector(".combatant-control[data-control=rollInitiative]");
      if (!control) continue;

      control.dataset.tooltip = combatant.declaration
        ? game.i18n.format("FADINGSUNS.Combat.Declared", { skill: combatant.declaration.skillName })
        : game.i18n.localize("FADINGSUNS.Combat.Declare");
      control.classList.toggle("is-declared", !!combatant.declaration);
    }
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

  game.settings.register(SYSTEM_ID, "beneficePoints", {
    name: "FADINGSUNS.Settings.BeneficePoints.Name",
    hint: "FADINGSUNS.Settings.BeneficePoints.Hint",
    scope: "world",
    config: true,
    type: Number,
    default: 10,
    onChange: value => { CONFIG.FADING_SUNS.startingBeneficePoints = value; }
  });

  game.settings.register(SYSTEM_ID, "extraPoints", {
    name: "FADINGSUNS.Settings.ExtraPoints.Name",
    hint: "FADINGSUNS.Settings.ExtraPoints.Hint",
    scope: "world",
    config: true,
    type: Number,
    default: 40,
    onChange: value => { CONFIG.FADING_SUNS.startingExtraPoints = value; }
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
