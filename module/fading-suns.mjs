/**
 * Fading Suns 2nd Edition Revised System
 * Main system initialization file
 */

// Import modules
import { FadingSunsActor } from "./actor/actor.mjs";
import { FadingSunsActorSheet } from "./actor/actor-sheet.mjs";
import { FadingSunsItem } from "./item/item.mjs";
import { FadingSunsItemSheet } from "./item/item-sheet.mjs";

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once('init', async function() {
  console.log('Fading Suns | Initializing Fading Suns System');

  // Define custom Document classes
  CONFIG.Actor.documentClass = FadingSunsActor;
  CONFIG.Item.documentClass = FadingSunsItem;

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("fading-suns", FadingSunsActorSheet, {
    types: ["character", "npc"],
    makeDefault: true,
    label: "FADINGSUNS.SheetLabels.Actor"
  });

  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("fading-suns", FadingSunsItemSheet, {
    types: ["weapon", "armor", "equipment", "skill", "psychic-power", "theurgic-rite"],
    makeDefault: true,
    label: "FADINGSUNS.SheetLabels.Item"
  });

  // Preload Handlebars templates
  preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

Hooks.once('ready', async function() {
  // Register custom Handlebars helpers
  Handlebars.registerHelper('times', function(n, block) {
    let accum = '';
    for(let i = 0; i < n; ++i)
      accum += block.fn(i);
    return accum;
  });
});

/* -------------------------------------------- */
/*  Template Preloading                         */
/* -------------------------------------------- */

async function preloadHandlebarsTemplates() {
  return loadTemplates([
    // Actor partials
    "systems/fading-suns/templates/actor/parts/actor-characteristics.hbs",
    "systems/fading-suns/templates/actor/parts/actor-skills.hbs",
    "systems/fading-suns/templates/actor/parts/actor-items.hbs"
  ]);
}
