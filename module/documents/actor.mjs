import { goalRoll, damageRoll, armourRoll } from "../dice/rolls.mjs";
import { applyArmour } from "../dice/effect-dice.mjs";
import { attackModifiers, rangeBand, energyShieldAbsorb } from "../dice/combat.mjs";
import {
  SHADOWS, findTrigger, triggerCharacteristic, resolveTrigger, requiresContest
} from "../dice/occult.mjs";
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
  async rollGoal(options = {}) {
    const { characteristic, skillId, item, skipDialog = false } = options;
    let { modifier = 0 } = options;
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
        wyrdAvailable: this.system.wyrd.value,
        traits: this.applicableTraits({ characteristic: charPath, skill: skill?.name }),
        modifierParts: options.modifierParts ?? [],
        distance: options.distance ?? null
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
   * Blessings and Curses whose modifier could bear on a given roll (p.115).
   *
   * Whether a trait actually applies depends on the situation, which no system
   * can judge, so this returns the candidates and the player ticks what is true
   * at the table. Traits flagged `always` — Size and Appearance — are pre-ticked.
   *
   * @param {object} options
   * @param {string} [options.characteristic]
   * @param {string} [options.skill]
   * @returns {Array<{id: string, name: string, modifier: number, restriction: string,
   *                  isCurse: boolean, checked: boolean}>}
   */
  applicableTraits({ characteristic, skill } = {}) {
    const traits = [];
    for (const item of this.items) {
      if (item.type !== "blessing") continue;
      const modifier = item.system.modifierFor({ characteristic, skill });
      if (!modifier) continue;
      traits.push({
        id: item.id,
        name: item.name,
        modifier,
        restriction: item.system.restriction,
        isCurse: item.system.isCurse,
        checked: item.system.always
      });
    }
    return traits.sort((a, b) => a.name.localeCompare(b.name));
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

    // Everything the weapon and the situation contribute, itemised (p.296).
    const distance = options.distance ?? this.distanceToTarget();
    const { total, parts } = attackModifiers({
      weaponModifier: weapon.system.goalModifier,
      actionModifier: options.actionModifier ?? 0,
      distance,
      short: weapon.system.range.short,
      long: weapon.system.range.long,
      required: weapon.system.strength,
      strength: this.system.body.strength.value,
      actions: options.actions ?? this.declaredActions
    });

    return this.rollGoal({
      characteristic: weapon.system.characteristic || defaults.characteristic,
      skillId: skill?.id,
      item: weapon,
      modifier: (options.modifier ?? 0) + total,
      modifierParts: parts,
      distance,
      ...options
    });
  }

  /**
   * Distance in metres from this actor's token to the user's current target.
   *
   * Returns null when either token is missing, which leaves range out of the
   * attack entirely rather than guessing at it — the right answer for a table
   * playing in theatre of the mind.
   *
   * @returns {number|null}
   */
  distanceToTarget() {
    const origin = this.getActiveTokens(true)[0];
    const target = game.user?.targets?.first();
    if (!origin || !target || origin === target) return null;

    const measure = canvas?.grid?.measurePath?.([origin.center, target.center]);
    const distance = measure?.distance ?? null;
    return Number.isFinite(distance) ? Math.round(distance) : null;
  }

  /** Actions declared for this turn in the combat tracker, defaulting to one. */
  get declaredActions() {
    const combatant = game.combat?.getCombatantByActor?.(this.id);
    return combatant?.declaration?.actions ?? 1;
  }

  /** The band a given distance falls into for a weapon (p.296). */
  rangeBandFor(weapon, distance) {
    if (distance === null || !weapon?.system.range.long) return null;
    return rangeBand(distance, weapon.system.range.short, weapon.system.range.long);
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
   * Apply wound points, letting armour and any energy shield stop what they can.
   *
   * The order matters. An energy shield either activates and caps the blow, or
   * lets it through untouched (p.296); whatever gets past is then reduced by
   * rolled armour points (p.65).
   *
   * @param {number} woundPoints
   * @param {object} [options]
   * @param {boolean} [options.useArmour=true]  Roll worn armour automatically.
   * @param {number} [options.armourPoints]     Supply a rolled figure instead.
   * @returns {Promise<{taken: number, blocked: number, shield: object|null}>}
   */
  async applyDamage(woundPoints, options = {}) {
    // Callers used to pass a bare number; keep that working.
    if (typeof options === "number") options = { armourPoints: options };
    const { useArmour = true } = options;

    let incoming = Math.max(0, Math.round(woundPoints ?? 0));
    let shieldResult = null;

    const shield = this.equippedEnergyShield;
    if (shield) {
      const { min, max, hits } = shield.system.energyShield;
      shieldResult = energyShieldAbsorb(incoming, { min, max, hits: hits.value });
      incoming = shieldResult.through;
      if (shieldResult.hitsUsed) {
        await shield.update({
          "system.energyShield.hits.value": Math.max(0, hits.value - shieldResult.hitsUsed)
        });
      }
    }

    let armourPoints = options.armourPoints ?? 0;
    if (options.armourPoints === undefined && useArmour && incoming > 0) {
      const worn = this.equippedArmour;
      if (worn) {
        const roll = await this.rollArmour(worn.id);
        armourPoints = roll?.points ?? 0;
      }
    }

    const taken = applyArmour(incoming, armourPoints);
    const value = Math.max(0, this.system.vitality.value - taken);
    await this.update({ "system.vitality.value": value });

    return { taken, blocked: (woundPoints ?? 0) - taken, shield: shieldResult };
  }

  /** The armour the character is wearing, if any. */
  get equippedArmour() {
    return this.items.find(i =>
      i.type === "armour" && i.system.equipped && i.system.armourType === "armour") ?? null;
  }

  /** The energy shield the character is wearing, if any. */
  get equippedEnergyShield() {
    return this.items.find(i =>
      i.type === "armour" && i.system.equipped && i.system.armourType === "energyShield") ?? null;
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

  /* -------------------------------------------- */
  /*  Urge and Hubris (p.144, p.162)              */
  /* -------------------------------------------- */

  /**
   * Whether raising an occult trait would need a contest of wills first (p.135).
   * @param {"urge"|"hubris"} shadow
   * @returns {boolean}
   */
  needsContest(shadow) {
    const { trait, shadow: shadowPath } = SHADOWS[shadow];
    return requiresContest(this.system.getCharacteristic(trait),
                           this.system.getCharacteristic(shadowPath));
  }

  /**
   * Roll against a taboo or deed, and apply whatever it costs or sheds.
   *
   * Taboos are resisted — failing the roll is what gains Urge — while deeds must
   * succeed to shed a level (p.144).
   *
   * @param {object} options
   * @param {"urge"|"hubris"} options.shadow
   * @param {"taboo"|"deed"} options.kind
   * @param {string} options.key            Which taboo or deed.
   * @param {number} [options.levels]       The gamemaster's choice within the band.
   * @param {boolean} [options.skipDialog]
   * @returns {Promise<object|null>}
   */
  async rollOccultTrigger({ shadow, kind, key, levels, skipDialog = false } = {}) {
    const trigger = findTrigger(shadow, kind, key);
    if (!trigger) return null;

    const characteristic = triggerCharacteristic(trigger, {
      "spirit.faith": this.system.spirit.faith.primary,
      "spirit.ego": this.system.spirit.ego.primary
    });

    // The chart offers a choice of skills for some entries; take the best one.
    const skill = trigger.skills
      .map(name => this.getSkill(name))
      .filter(Boolean)
      .sort((a, b) => b.system.value - a.system.value)[0];

    const outcome = await this.rollGoal({
      characteristic,
      skillId: skill?.id,
      skipDialog,
      flavor: game.i18n.localize(`FADINGSUNS.Occult.${kind === "taboo" ? "Taboo" : "Deed"}`)
        + ": " + trigger.label
    });
    if (!outcome) return null;

    const { change, applied } = resolveTrigger({ kind, success: outcome.success, trigger, levels });
    if (applied) await this.adjustShadow(shadow, change);

    return { ...outcome, trigger, change, applied };
  }

  /**
   * Raise or lower Urge or Hubris, never below zero.
   * @param {"urge"|"hubris"} shadow
   * @param {number} change
   * @returns {Promise<Actor>}
   */
  async adjustShadow(shadow, change) {
    const path = SHADOWS[shadow].shadow;
    const current = this.system.getCharacteristic(path);
    const value = Math.max(0, current + change);

    await this.update({ [`system.${path}.value`]: value });

    const message = change > 0 ? "FADINGSUNS.Occult.Gained" : "FADINGSUNS.Occult.Shed";
    ui.notifications.info(game.i18n.format(message, {
      name: this.name,
      levels: Math.abs(change),
      shadow: game.i18n.localize(`FADINGSUNS.Characteristic.${SHADOWS[shadow].label}`)
    }));

    return this;
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
