const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;
const { TextEditor } = foundry.applications.ux;

/**
 * The Fading Suns actor sheet, built on ApplicationV2.
 */
export class FadingSunsActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    classes: ["fading-suns", "sheet", "actor"],
    position: { width: 760, height: 820 },
    window: { resizable: true, icon: "fa-solid fa-user-astronaut" },
    form: { submitOnChange: true, closeOnSubmit: false },
    actions: {
      editImage: FadingSunsActorSheet.#onEditImage,
      roll: FadingSunsActorSheet.#onRoll,
      itemCreate: FadingSunsActorSheet.#onItemCreate,
      itemEdit: FadingSunsActorSheet.#onItemEdit,
      itemDelete: FadingSunsActorSheet.#onItemDelete,
      itemUse: FadingSunsActorSheet.#onItemUse,
      itemToggle: FadingSunsActorSheet.#onItemToggle,
      rollDamage: FadingSunsActorSheet.#onRollDamage,
      rollArmour: FadingSunsActorSheet.#onRollArmour,
      rollShadow: FadingSunsActorSheet.#onRollShadow,
      openCreation: FadingSunsActorSheet.#onOpenCreation
    }
  };

  /** @inheritDoc */
  static PARTS = {
    header: { template: "systems/fading-suns/templates/actor/parts/header.hbs" },
    tabs: { template: "systems/fading-suns/templates/actor/parts/tabs.hbs" },
    characteristics: { template: "systems/fading-suns/templates/actor/parts/characteristics.hbs" },
    skills: { template: "systems/fading-suns/templates/actor/parts/skills.hbs", scrollable: [""] },
    combat: { template: "systems/fading-suns/templates/actor/parts/combat.hbs", scrollable: [""] },
    occult: { template: "systems/fading-suns/templates/actor/parts/occult.hbs", scrollable: [""] },
    biography: { template: "systems/fading-suns/templates/actor/parts/biography.hbs" }
  };

  /** @inheritDoc */
  static TABS = {
    primary: {
      tabs: [
        { id: "characteristics", icon: "fa-solid fa-chart-simple", label: "FADINGSUNS.Tab.Characteristics" },
        { id: "skills", icon: "fa-solid fa-list-check", label: "FADINGSUNS.Tab.Skills" },
        { id: "combat", icon: "fa-solid fa-crosshairs", label: "FADINGSUNS.Tab.Combat" },
        { id: "occult", icon: "fa-solid fa-hand-sparkles", label: "FADINGSUNS.Tab.Occult" },
        { id: "biography", icon: "fa-solid fa-book", label: "FADINGSUNS.Tab.Biography" }
      ],
      initial: "characteristics"
    }
  };

  /* -------------------------------------------- */
  /*  Context preparation                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.actor;

    Object.assign(context, {
      actor,
      system: actor.system,
      flags: actor.flags,
      config: CONFIG.FADING_SUNS,
      isCharacter: actor.type === "character",
      creationComplete: !!actor.getFlag("fading-suns", "creationComplete"),
      canOpenCreation: !actor.getFlag("fading-suns", "creationComplete") || game.user.isGM,
      isNPC: actor.type === "npc",
      editable: this.isEditable,
      owner: actor.isOwner,
      tabs: this._prepareTabs?.("primary") ?? {},
      items: this.#categoriseItems(),
      characteristics: this.#prepareCharacteristics(),
      spiritPairs: this.#prepareSpiritPairs(),
      benefices: this.#prepareBeneficeTotals(),
      occult: this.#prepareOccult()
    });

    context.enrichedBiography = await TextEditor.implementation.enrichHTML(
      actor.system.biography ?? "",
      { secrets: actor.isOwner, relativeTo: actor }
    );

    return context;
  }

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    if (context.tabs?.[partId]) context.tab = context.tabs[partId];
    return context;
  }

  /**
   * Flatten the Body, Mind and Occult characteristic groups into display rows.
   * @returns {Record<string, Array<{key: string, path: string, label: string, value: number}>>}
   */
  #prepareCharacteristics() {
    const out = {};
    for (const group of ["body", "mind", "occult"]) {
      out[group] = Object.entries(CONFIG.FADING_SUNS[group]).map(([key, label]) => ({
        key,
        path: `${group}.${key}`,
        label: game.i18n.localize(label),
        value: this.actor.system[group][key].value,
        max: this.actor.system[group][key].max,
        overCap: this.actor.system[group][key].overCap
      }));
    }
    return out;
  }

  /**
   * Build the three opposed Spirit trait pairs for display (p.93).
   * @returns {Array<{primary: object, opposed: object}>}
   */
  #prepareSpiritPairs() {
    const describe = key => ({
      key,
      path: `spirit.${key}`,
      label: game.i18n.localize(CONFIG.FADING_SUNS.spirit[key]),
      value: this.actor.system.spirit[key].value,
      max: this.actor.system.spirit[key].max,
      overCap: this.actor.system.spirit[key].overCap,
      isPrimary: this.actor.system.spirit[key].primary
    });
    return CONFIG.FADING_SUNS.spiritPairs.map(pair => ({
      primary: describe(pair.primary),
      opposed: describe(pair.opposed)
    }));
  }

  /**
   * The two occult trait pairs, each with a warning when the shadow has caught up.
   *
   * "Psi and Theurgy will come into conflict when a character tries to raise one
   *  trait past the level of his Urge or Hubris" (p.135), so the sheet says so
   *  rather than leaving the player to notice.
   *
   * @returns {Array<object>}
   */
  #prepareOccult() {
    const label = key => game.i18n.localize(CONFIG.FADING_SUNS.occult[key]);

    return [
      { trait: "psi", shadow: "urge", contestKey: "urge" },
      { trait: "theurgy", shadow: "hubris", contestKey: "hubris" }
    ].map(pair => ({
      ...pair,
      traitLabel: label(pair.trait),
      shadowLabel: label(pair.shadow),
      traitValue: this.actor.system.occult[pair.trait].value,
      shadowValue: this.actor.system.occult[pair.shadow].value,
      active: this.actor.system.occult[pair.trait].value > 0
        || this.actor.system.occult[pair.shadow].value > 0,
      blocked: this.actor.needsContest(pair.contestKey)
    }));
  }

  /**
   * Running totals for the Benefices and Afflictions block (p.88, p.117).
   *
   * Afflictions do not enlarge the Benefice budget. They "give the character
   * additional Extras to spend on more Benefices or any other trait" (p.117), so
   * they are reported against the Extra point pool instead — which a point spent
   * straight back on a Benefice matches arithmetically, but need not be.
   *
   * @returns {{spent: number, budget: number, remaining: number, extras: number,
   *            firebirds: number, income: number}}
   */
  #prepareBeneficeTotals() {
    let spent = 0;
    let extras = 0;
    let firebirds = 0;
    let income = 0;

    for (const item of this.actor.items) {
      if (item.type === "blessing" && item.system.isCurse) {
        extras += item.system.cost;
        continue;
      }
      if (item.type !== "benefice") continue;
      if (item.system.isAffliction) extras += item.system.value;
      else spent += item.system.value;
      firebirds += item.system.startingFirebirds;
      income += item.system.yearlyIncome;
    }

    const budget = CONFIG.FADING_SUNS.startingBeneficePoints;
    return { spent, budget, remaining: budget - spent, extras, firebirds, income };
  }

  /**
   * Group the actor's items by type for display.
   * @returns {Record<string, Item[]>}
   */
  #categoriseItems() {
    const groups = {
      skill: [], weapon: [], armour: [], equipment: [], blessing: [], benefice: [],
      combatAction: [],
      psychicPower: [], theurgicRite: []
    };
    for (const item of this.actor.items) {
      if (item.type in groups) groups[item.type].push(item);
    }

    groups.skill.sort((a, b) => a.system.label.localeCompare(b.system.label));
    groups.blessing.sort((a, b) => a.name.localeCompare(b.name));
    groups.blessings = groups.blessing.filter(i => i.system.polarity === "blessing");
    groups.curses = groups.blessing.filter(i => i.system.polarity === "curse");
    groups.benefice.sort((a, b) => a.name.localeCompare(b.name));
    groups.combatAction.sort((a, b) =>
      (a.system.level - b.system.level) || a.name.localeCompare(b.name));
    groups.naturalSkills = groups.skill.filter(i => i.system.skillType === "natural");
    groups.learnedSkills = groups.skill.filter(i => i.system.skillType !== "natural");
    for (const key of ["weapon", "armour", "equipment", "psychicPower", "theurgicRite"]) {
      groups[key].sort((a, b) => a.name.localeCompare(b.name));
    }
    return groups;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _onRender(context, options) {
    super._onRender(context, options);
    if (!this.isEditable) return;

    // Inline edits to embedded items are applied directly rather than through the
    // actor's form pipeline, which strips nested item data.
    for (const input of this.element.querySelectorAll("[data-item-field]")) {
      input.addEventListener("change", this.#onItemFieldChange.bind(this));
    }
  }

  /**
   * Persist an inline edit made to an embedded item.
   * @param {Event} event
   */
  async #onItemFieldChange(event) {
    const input = event.currentTarget;
    const itemId = input.closest("[data-item-id]")?.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (!item) return;

    const field = input.dataset.itemField;
    let value = input.type === "checkbox" ? input.checked : input.value;
    if (input.dataset.dtype === "Number") value = Number(value) || 0;
    await item.update({ [field]: value });
  }

  /* -------------------------------------------- */
  /*  Actions                                     */
  /* -------------------------------------------- */

  /**
   * @this {FadingSunsActorSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
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

  /**
   * Make a Goal Roll from a characteristic or skill. Holding Shift skips the dialog.
   * @this {FadingSunsActorSheet}
   */
  static async #onRoll(event, target) {
    const { characteristic, itemId } = target.dataset;
    return this.actor.rollGoal({
      characteristic,
      skillId: itemId,
      skipDialog: event.shiftKey
    });
  }

  /** @this {FadingSunsActorSheet} */
  static async #onItemCreate(event, target) {
    const type = target.dataset.type;
    const name = game.i18n.format("FADINGSUNS.Item.New", {
      type: game.i18n.localize(`TYPES.Item.${type}`)
    });
    const created = await Item.implementation.create({ name, type }, { parent: this.actor });
    return created?.sheet.render(true);
  }

  /** @this {FadingSunsActorSheet} */
  static async #onItemEdit(event, target) {
    const item = this.#getItem(target);
    return item?.sheet.render(true);
  }

  /** @this {FadingSunsActorSheet} */
  static async #onItemDelete(event, target) {
    const item = this.#getItem(target);
    if (!item) return;
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.format("FADINGSUNS.Item.DeleteTitle", { name: item.name }) },
      content: `<p>${game.i18n.format("FADINGSUNS.Item.DeleteConfirm", { name: item.name })}</p>`
    });
    if (confirmed) await item.delete();
  }

  /** @this {FadingSunsActorSheet} */
  static async #onItemUse(event, target) {
    const item = this.#getItem(target);
    return item?.use({ skipDialog: event.shiftKey });
  }

  /** @this {FadingSunsActorSheet} */
  static async #onItemToggle(event, target) {
    const item = this.#getItem(target);
    if (!item) return;
    return item.update({ "system.equipped": !item.system.equipped });
  }

  /** @this {FadingSunsActorSheet} */
  static async #onRollDamage(event, target) {
    const item = this.#getItem(target);
    if (!item) return;
    return this.actor.rollDamage(item.id, Number(target.dataset.victoryDice) || 0);
  }

  /** @this {FadingSunsActorSheet} */
  static async #onRollArmour(event, target) {
    const item = this.#getItem(target);
    if (!item) return;
    return this.actor.rollArmour(item.id);
  }

  /**
   * Roll against a taboo or deed (p.144, p.162).
   * @this {FadingSunsActorSheet}
   */
  static async #onRollShadow(event, target) {
    const { shadow, kind } = target.dataset;
    const { promptOccultTrigger } = await import("./occult-dialog.mjs");
    const choice = await promptOccultTrigger({ actor: this.actor, shadow, kind });
    if (!choice) return;
    return this.actor.rollOccultTrigger({ shadow, kind, ...choice });
  }

  /**
   * Open the character creation wizard (p.70).
   *
   * The wizard locks itself once it has been applied, because running it twice
   * would add a second set of stages, Blessings and Benefices on top of the
   * first. A gamemaster can still reopen it, but is warned first.
   *
   * @this {FadingSunsActorSheet}
   */
  static async #onOpenCreation() {
    const complete = this.actor.getFlag("fading-suns", "creationComplete");

    if (complete) {
      if (!game.user.isGM) {
        ui.notifications.warn(game.i18n.localize("FADINGSUNS.Creation.Locked"));
        return;
      }
      const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: { title: game.i18n.localize("FADINGSUNS.Creation.ReopenTitle") },
        content: `<p>${game.i18n.format("FADINGSUNS.Creation.ReopenWarning", { name: this.actor.name })}</p>`
      });
      if (!confirmed) return;
    }

    const { FadingSunsCreationWizard } = await import("./creation-wizard.mjs");
    return new FadingSunsCreationWizard(this.actor).render(true);
  }

  /**
   * Resolve the embedded item associated with a clicked control.
   * @param {HTMLElement} target
   * @returns {Item|undefined}
   */
  #getItem(target) {
    const id = target.closest("[data-item-id]")?.dataset.itemId;
    return this.actor.items.get(id);
  }
}
