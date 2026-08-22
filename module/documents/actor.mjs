import { goalRoll, damageRoll, armourRoll } from "../dice/rolls.mjs";
import { applyArmour } from "../dice/effect-dice.mjs";
import { promptGoalRoll } from "../applications/roll-dialog.mjs";

/**
 * The Fading Suns Actor document.
 */
export class FadingSunsActor extends Actor {

  /**
   * Foundry v14 resets Active Effect phase tracking inside Actor#prepareBaseData,
   * so this override must always call super or subsequent updates will throw.
   * @inheritDoc
   */
  prepareBaseData() {
    super.prepareBaseData();
  }

  /** @inheritDoc */
  prepareDerivedData() {
    super.prepareDerivedData();
  }

  /* -------------------------------------------- */
  /*  Convenience accessors                       */
  /* -------------------------------------------- */

  /** All skill items, sorted by display name. */
  get skills() {
    return this.items
      .filter(i => i.type === "skill")
      .sort((a, b) => a.system.label.localeCompare(b.system.label));
  }

  /**
   * Find a skill by name, ignoring case and any parenthetical specialty.
   * @param {string} name
   * @returns {Item|null}
   */
  getSkill(name) {
    if (!name) return null;
    const needle = String(name).toLowerCase().trim();
    return this.items.find(i =>
      i.type === "skill" &&
      (i.name.toLowerCase() === needle || i.system.label.toLowerCase() === needle)
    ) ?? null;
  }

  /** @inheritDoc */
  getRollData() {
    const data = super.getRollData();
    data.vitality = this.system.vitality;
    data.wyrd = this.system.wyrd;
    for (const group of ["body", "mind", "spirit", "occult"]) {
      for (const [key, trait] of Object.entries(this.system[group] ?? {})) {
        data[key] = trait.value;
      }
    }
    return data;
  }

  /* -------------------------------------------- */
  /*  Rolling                                     */
  /* -------------------------------------------- */

  /**
   * Make a Goal Roll (p.64), optionally opening the configuration dialog first.
   *
   * @param {object} options
   * @param {string} [options.characteristic]  Dot path, e.g. "body.dexterity".
   * @param {string} [options.skillId]         Id of a skill Item.
   * @param {Item}   [options.item]            Weapon or power prompting the roll.
   * @param {number} [options.modifier=0]
   * @param {boolean} [options.skipDialog=false]
   * @returns {Promise<object|null>}
   */
  async rollGoal({ characteristic, skillId, item, modifier = 0, skipDialog = false } = {}) {
    const skill = skillId ? this.items.get(skillId) : null;
    const charPath = characteristic || skill?.system.characteristic || "mind.wits";

    const applyWounds = game.settings.get("fading-suns", "applyWoundPenalties");
    const woundPenalty = applyWounds ? (this.system.vitality.penalty ?? 0) : 0;

    let accent = 0;
    if (!skipDialog) {
      const charLabel = game.i18n.localize(
        CONFIG.FADING_SUNS.rollableCharacteristics[charPath] ?? charPath
      );
      const config = await promptGoalRoll({
        title: `${this.name}: ${skill ? skill.system.label : charLabel}`,
        characteristicValue: this.system.getCharacteristic(charPath),
        characteristicLabel: charLabel,
        skillValue: skill?.system.value ?? 0,
        skillLabel: skill?.system.label ?? "",
        woundPenalty,
        wyrdAvailable: this.system.wyrd.value
      });
      if (!config) return null;
      modifier += config.modifier;
      accent = config.accent;

      // Accenting an action costs one Wyrd point (p.69).
      if (config.spendWyrd) {
        if (this.system.wyrd.value < 1) {
          ui.notifications.warn(game.i18n.localize("FADINGSUNS.Warning.NoWyrd"));
          accent = 0;
        } else {
          await this.spendWyrd(1);
        }
      }
    }

    return goalRoll({
      actor: this, characteristic: charPath, skillId, modifier, accent, woundPenalty, item
    });
  }

  /**
   * Attack with a weapon (p.174). The attack skill and characteristic come from
   * the weapon, falling back to the weapon category defaults.
   * @param {string} itemId
   * @param {object} [options]
   * @returns {Promise<object|null>}
   */
  async rollWeaponAttack(itemId, options = {}) {
    const weapon = this.items.get(itemId);
    if (weapon?.type !== "weapon") return null;

    const defaults = CONFIG.FADING_SUNS.weaponDefaults[weapon.system.weaponType] ?? {};
    const skill = this.getSkill(weapon.system.skill || defaults.skill);

    return this.rollGoal({
      characteristic: weapon.system.characteristic || defaults.characteristic,
      skillId: skill?.id,
      item: weapon,
      ...options
    });
  }

  /**
   * Roll a weapon's damage dice plus any victory dice (p.65).
   * @param {string} itemId
   * @param {number} [victoryDice=0]
   * @param {number|null} [pulledPunch=null]
   */
  async rollDamage(itemId, victoryDice = 0, pulledPunch = null) {
    const item = this.items.get(itemId);
    if (item?.type !== "weapon") return null;
    return damageRoll({ actor: this, item, victoryDice, pulledPunch });
  }

  /**
   * Roll a suit of armour's protection dice (p.65).
   * @param {string} itemId
   */
  async rollArmour(itemId) {
    const item = this.items.get(itemId);
    if (item?.type !== "armour") return null;
    return armourRoll({ actor: this, item });
  }

  /* -------------------------------------------- */
  /*  Resources                                   */
  /* -------------------------------------------- */

  /**
   * Apply wound points, subtracting armour first (p.65).
   * @param {number} woundPoints
   * @param {number} [armourPoints=0]
   * @returns {Promise<Actor>}
   */
  async applyDamage(woundPoints, armourPoints = 0) {
    const taken = applyArmour(woundPoints, armourPoints);
    const value = Math.max(0, this.system.vitality.value - taken);
    return this.update({ "system.vitality.value": value });
  }

  /**
   * Restore Vitality levels, never exceeding the maximum.
   * @param {number} points
   * @returns {Promise<Actor>}
   */
  async healDamage(points) {
    const value = Math.min(this.system.vitality.max, this.system.vitality.value + Math.abs(points));
    return this.update({ "system.vitality.value": value });
  }

  /**
   * Spend Wyrd points (p.125).
   * @param {number} [points=1]
   * @returns {Promise<Actor|null>}  Null if the actor has too few points.
   */
  async spendWyrd(points = 1) {
    const value = this.system.wyrd.value - Math.abs(points);
    if (value < 0) return null;
    return this.update({ "system.wyrd.value": value });
  }

  /* -------------------------------------------- */
  /*  Creation defaults                            */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;

    const updates = {};

    // Give new characters the nine natural skills at their base rating of 3 (p.97).
    if ((data.type === "character") && !data.items?.length) {
      updates.items = Object.entries(CONFIG.FADING_SUNS.naturalSkills).map(([name, char]) => ({
        name,
        type: "skill",
        img: "icons/svg/upgrade.svg",
        system: { value: 3, skillType: "natural", characteristic: char }
      }));
    }

    // Prototype tokens for player characters should be linked and friendly.
    if (data.type === "character") {
      updates.prototypeToken = foundry.utils.mergeObject({
        actorLink: true,
        sight: { enabled: true },
        disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY
      }, data.prototypeToken ?? {}, { inplace: false });
    }

    if (!foundry.utils.isEmpty(updates)) this.updateSource(updates);
    return true;
  }
}
