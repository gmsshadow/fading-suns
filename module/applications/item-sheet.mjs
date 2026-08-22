const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;
const { TextEditor } = foundry.applications.ux;

/**
 * The Fading Suns item sheet, built on ApplicationV2.
 *
 * A single set of PARTS serves every item subtype; the "details" part renders a
 * per-type partial chosen at context-preparation time, which avoids mutating the
 * static PARTS declaration.
 */
export class FadingSunsItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    classes: ["fading-suns", "sheet", "item"],
    position: { width: 560, height: 540 },
    window: { resizable: true, icon: "fa-solid fa-scroll" },
    form: { submitOnChange: true, closeOnSubmit: false },
    actions: {
      editImage: FadingSunsItemSheet.#onEditImage,
      toChat: FadingSunsItemSheet.#onToChat
    }
  };

  /** @inheritDoc */
  static PARTS = {
    header: { template: "systems/fading-suns/templates/item/parts/header.hbs" },
    tabs: { template: "systems/fading-suns/templates/item/parts/tabs.hbs" },
    details: { template: "systems/fading-suns/templates/item/parts/details.hbs" },
    description: { template: "systems/fading-suns/templates/item/parts/description.hbs" }
  };

  /** @inheritDoc */
  static TABS = {
    primary: {
      tabs: [
        { id: "details", icon: "fa-solid fa-sliders", label: "FADINGSUNS.Tab.Details" },
        { id: "description", icon: "fa-solid fa-align-left", label: "FADINGSUNS.Tab.Description" }
      ],
      initial: "details"
    }
  };

  /** Named Handlebars partials providing the body of the "details" tab per subtype. */
  static DETAIL_PARTIALS = {
    weapon: "fadingSuns.detailsWeapon",
    armour: "fadingSuns.detailsArmour",
    equipment: "fadingSuns.detailsEquipment",
    skill: "fadingSuns.detailsSkill",
    psychicPower: "fadingSuns.detailsPsychicPower",
    theurgicRite: "fadingSuns.detailsTheurgicRite",
    blessing: "fadingSuns.detailsBlessing"
  };

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const item = this.item;

    Object.assign(context, {
      item,
      system: item.system,
      flags: item.flags,
      config: CONFIG.FADING_SUNS,
      editable: this.isEditable,
      owner: item.isOwner,
      tabs: this._prepareTabs?.("primary") ?? {},
      detailsPartial: FadingSunsItemSheet.DETAIL_PARTIALS[item.type] ?? "fadingSuns.detailsEquipment"
    });

    context.enrichedDescription = await TextEditor.implementation.enrichHTML(
      item.system.description ?? "",
      { secrets: item.isOwner, relativeTo: item }
    );

    return context;
  }

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    if (context.tabs?.[partId]) context.tab = context.tabs[partId];
    return context;
  }

  /* -------------------------------------------- */

  /** @this {FadingSunsItemSheet} */
  static async #onEditImage(event, target) {
    const field = target.dataset.field || "img";
    const current = foundry.utils.getProperty(this.document, field);
    const picker = new foundry.applications.apps.FilePicker.implementation({
      type: "image",
      current,
      callback: path => this.document.update({ [field]: path })
    });
    return picker.browse();
  }

  /** @this {FadingSunsItemSheet} */
  static async #onToChat() {
    return this.item.toChat();
  }
}
