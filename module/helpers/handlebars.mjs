const { loadTemplates } = foundry.applications.handlebars;

const ROOT = "systems/fading-suns/templates";

/**
 * Preload every sheet template and register the named partials used by the
 * item sheet's dynamic "details" tab.
 * @returns {Promise<Function[]>}
 */
export function preloadTemplates() {
  return loadTemplates({
    // Actor sheet parts
    "fadingSuns.actorHeader": `${ROOT}/actor/parts/header.hbs`,
    "fadingSuns.actorTabs": `${ROOT}/actor/parts/tabs.hbs`,
    "fadingSuns.actorCharacteristics": `${ROOT}/actor/parts/characteristics.hbs`,
    "fadingSuns.actorSkills": `${ROOT}/actor/parts/skills.hbs`,
    "fadingSuns.actorCombat": `${ROOT}/actor/parts/combat.hbs`,
    "fadingSuns.actorOccult": `${ROOT}/actor/parts/occult.hbs`,
    "fadingSuns.actorBiography": `${ROOT}/actor/parts/biography.hbs`,

    // Item sheet parts
    "fadingSuns.itemHeader": `${ROOT}/item/parts/header.hbs`,
    "fadingSuns.itemTabs": `${ROOT}/item/parts/tabs.hbs`,
    "fadingSuns.itemDetails": `${ROOT}/item/parts/details.hbs`,
    "fadingSuns.itemDescription": `${ROOT}/item/parts/description.hbs`,

    // Per-subtype detail bodies, selected dynamically by FadingSunsItemSheet
    "fadingSuns.detailsWeapon": `${ROOT}/item/parts/details-weapon.hbs`,
    "fadingSuns.detailsArmour": `${ROOT}/item/parts/details-armour.hbs`,
    "fadingSuns.detailsEquipment": `${ROOT}/item/parts/details-equipment.hbs`,
    "fadingSuns.detailsSkill": `${ROOT}/item/parts/details-skill.hbs`,
    "fadingSuns.detailsPsychicPower": `${ROOT}/item/parts/details-psychic-power.hbs`,
    "fadingSuns.detailsTheurgicRite": `${ROOT}/item/parts/details-theurgic-rite.hbs`,
    "fadingSuns.detailsBlessing": `${ROOT}/item/parts/details-blessing.hbs`,
    "fadingSuns.detailsBenefice": `${ROOT}/item/parts/details-benefice.hbs`,
    "fadingSuns.detailsStage": `${ROOT}/item/parts/details-stage.hbs`,

    // Character creation wizard
    "fadingSuns.creationWizard": `${ROOT}/creation/wizard.hbs`
  });
}

/**
 * Register the system's Handlebars helpers. Core already provides comparison
 * helpers, `selectOptions`, `checked` and `localize`, so only genuinely
 * system-specific helpers are added here.
 */
export function registerHandlebarsHelpers() {

  /** Render a number with an explicit sign, e.g. "+3" or "-2". */
  Handlebars.registerHelper("fsSigned", value => {
    const n = Number(value) || 0;
    return n >= 0 ? `+${n}` : `${n}`;
  });

  /** Sum any number of arguments. */
  Handlebars.registerHelper("fsSum", (...args) => {
    args.pop(); // Handlebars options object
    return args.reduce((total, n) => total + (Number(n) || 0), 0);
  });

  /** Repeat a block n times, exposing the index as `this`. */
  Handlebars.registerHelper("fsTimes", function (n, block) {
    let out = "";
    for (let i = 0; i < Number(n); i++) out += block.fn(i);
    return out;
  });

  /**
   * Look up a Spirit trait pair for the characteristics tab.
   * Usage: {{#each config.spiritPairs}}{{fsSpirit ../system this.primary}}{{/each}}
   */
  Handlebars.registerHelper("fsSpirit", (system, key) => system?.spirit?.[key] ?? { value: 0 });
}
