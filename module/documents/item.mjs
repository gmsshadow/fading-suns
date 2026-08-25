const { renderTemplate } = foundry.applications.handlebars;

/** Default artwork per item subtype. */
const DEFAULT_IMAGES = {
  weapon: "icons/svg/sword.svg",
  armour: "icons/svg/shield.svg",
  equipment: "icons/svg/item-bag.svg",
  skill: "icons/svg/upgrade.svg",
  psychicPower: "icons/svg/aura.svg",
  theurgicRite: "icons/svg/holy-shield.svg",
  blessing: "icons/svg/regen.svg",
  benefice: "icons/svg/coins.svg",
  stage: "icons/svg/book.svg",
  combatAction: "icons/svg/sword.svg"
};

/**
 * The Fading Suns Item document.
 */
export class FadingSunsItem extends Item {

  /** @inheritDoc */
  prepareBaseData() {
    super.prepareBaseData();
  }

  /** @inheritDoc */
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;

    // Only override the generic mystery-man placeholder.
    if (!data.img || (data.img === Item.implementation.DEFAULT_ICON)) {
      const img = DEFAULT_IMAGES[data.type];
      if (img) this.updateSource({ img });
    }

    // A Benefice a character may only hold one of pools into the entry they
    // already have, rather than arriving as a second copy. The rank tables are
    // cumulative, so Ordained 3 plus Ordained 2 is a Deacon at 5 (p.123).
    if (this.type === "benefice" && this.system.unique && this.actor) {
      const existing = this.actor.items.find(i =>
        i.type === "benefice" && i.name === this.name && i !== this);

      if (existing) {
        const value = existing.system.value + (this.system.value ?? 0);
        await existing.update({ "system.value": value });
        ui.notifications.info(game.i18n.format("FADINGSUNS.Benefice.Pooled", {
          name: this.name,
          value,
          rank: existing.system.rank?.label ?? ""
        }));
        return false;
      }
    }

    return true;
  }

  /* -------------------------------------------- */

  /**
   * Use this item. Weapons make an attack Goal Roll; occult powers and rites make
   * their own Goal Roll and spend Wyrd; everything else posts a description card.
   * @param {object} [options]
   * @returns {Promise<*>}
   */
  async use(options = {}) {
    if (!this.actor) {
      ui.notifications.warn(game.i18n.localize("FADINGSUNS.Warning.NoOwningActor"));
      return null;
    }

    switch (this.type) {
      case "weapon":
        return this.actor.rollWeaponAttack(this.id, options);

      case "psychicPower":
      case "theurgicRite":
        return this.#useOccultPower(options);

      case "combatAction":
        return this.#useCombatAction(options);

      case "skill":
        return this.actor.rollGoal({
          skillId: this.id,
          characteristic: this.system.characteristic,
          ...options
        });

      default:
        return this.toChat();
    }
  }

  /**
   * Invoke a psychic power or theurgic rite (p.128).
   *
   * Wyrd is only spent once the roll has been made: "the character does not spend
   * any Wyrd points. Only if the roll is successful — or if it is a critical
   * failure — are the listed Wyrd points spent." (p.128)
   *
   * @param {object} options
   * @returns {Promise<object|null>}
   */
  async #useOccultPower(options = {}) {
    const skill = this.actor.getSkill(this.system.skill);
    const outcome = await this.actor.rollGoal({
      characteristic: this.system.characteristic,
      skillId: skill?.id,
      item: this,
      ...options
    });
    if (!outcome) return null;

    const cost = this.system.wyrdCost ?? 0;
    if (cost > 0 && (outcome.success || outcome.criticalFailure)) {
      const spent = await this.actor.spendWyrd(cost);
      if (spent === null) ui.notifications.warn(game.i18n.localize("FADINGSUNS.Warning.NoWyrd"));
    }

    // "Fumbling a psychic power roll" and "Fumbling a theurgy rite" are taboos
    // in their own right (p.144, p.162), so a critical failure invites the
    // shadow — resisted, as always, by a roll the character must pass.
    if (outcome.criticalFailure) {
      const psychic = this.type === "psychicPower";
      await this.actor.rollOccultTrigger({
        shadow: psychic ? "urge" : "hubris",
        kind: "taboo",
        key: psychic ? "fumbledPower" : "fumbledRite",
        skipDialog: true
      });
    }

    return outcome;
  }

  /**
   * Perform a combat action (p.102).
   *
   * "Combat actions themselves are not rolled, but are instead resolved using
   *  Fight, Melee or Shoot skills", so the action supplies the pairing and its
   *  goal modifier, and the roll is an ordinary Goal Roll.
   *
   * @param {object} options
   * @returns {Promise<object|null>}
   */
  async #useCombatAction(options = {}) {
    if (!this.system.skill) return this.toChat();

    const skill = this.actor.getSkill(this.system.skill);
    return this.actor.rollGoal({
      characteristic: this.system.characteristic,
      skillId: skill?.id,
      item: this,
      modifier: (options.modifier ?? 0) + this.system.goalModifier,
      ...options
    });
  }

  /**
   * Post this item's description to chat.
   * @returns {Promise<ChatMessage>}
   */
  async toChat() {
    const description = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
      this.system.description ?? "",
      { secrets: this.isOwner, relativeTo: this }
    );

    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: await renderTemplate("systems/fading-suns/templates/chat/item-card.hbs", {
        item: this,
        description
      })
    });
  }
}
