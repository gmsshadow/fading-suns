const fields = foundry.data.fields;

/**
 * Fields shared by every Fading Suns item.
 * @abstract
 */
export class FadingSunsItemBase extends foundry.abstract.TypeDataModel {

  /** @inheritDoc */
  static defineSchema() {
    return {
      description: new fields.HTMLField({ required: false, blank: true, initial: "" }),
      techLevel: new fields.NumberField({ required: false, integer: true, min: 0, max: 12, initial: 5 }),
      cost: new fields.NumberField({ required: false, integer: true, min: 0, initial: 0 })
    };
  }
}

/**
 * Physical items that occupy inventory space.
 * @abstract
 */
export class FadingSunsPhysicalItem extends FadingSunsItemBase {

  /** @inheritDoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      quantity: new fields.NumberField({ required: true, integer: true, min: 0, initial: 1 }),
      weight: new fields.NumberField({ required: true, min: 0, initial: 0 }),
      equipped: new fields.BooleanField({ initial: false })
    });
  }
}

/* -------------------------------------------- */

/**
 * A weapon. Attacks are Goal Rolls; damage is rolled as effect dice (p.65).
 */
export class FadingSunsWeapon extends FadingSunsPhysicalItem {

  /** @inheritDoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      weaponType: new fields.StringField({
        required: true, blank: false, initial: "melee",
        choices: () => CONFIG.FADING_SUNS.weaponTypes
      }),
      damage: new fields.SchemaField({
        dice: new fields.NumberField({ required: true, integer: true, min: 0, initial: 2 }),
        type: new fields.StringField({
          required: true, blank: false, initial: "wound",
          choices: () => CONFIG.FADING_SUNS.damageTypes
        })
      }),
      characteristic: new fields.StringField({ required: true, blank: false, initial: "body.dexterity" }),
      skill: new fields.StringField({ required: true, blank: true, initial: "Melee" }),
      // Range bands impose their own penalties (p.174); stored in metres.
      range: new fields.SchemaField({
        short: new fields.NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        medium: new fields.NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        long: new fields.NumberField({ required: true, integer: true, min: 0, initial: 0 })
      }),
      rateOfFire: new fields.NumberField({ required: true, integer: true, min: 0, initial: 1 }),
      shots: new fields.SchemaField({
        value: new fields.NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        max: new fields.NumberField({ required: true, integer: true, min: 0, initial: 0 })
      })
    });
  }

  /** @inheritDoc */
  static migrateData(source) {
    // v0.1.0 stored bare characteristic names such as "dexterity".
    if (typeof source?.characteristic === "string" && !source.characteristic.includes(".")) {
      const map = {
        strength: "body.strength", dexterity: "body.dexterity", endurance: "body.endurance",
        wits: "mind.wits", perception: "mind.perception", tech: "mind.tech"
      };
      source.characteristic = map[source.characteristic] ?? "body.dexterity";
    }
    return super.migrateData(source);
  }
}

/**
 * Armour. Protection is rolled as effect dice; victory dice never apply (p.65).
 */
export class FadingSunsArmour extends FadingSunsPhysicalItem {

  /** @inheritDoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      protection: new fields.SchemaField({
        dice: new fields.NumberField({ required: true, integer: true, min: 0, initial: 2 })
      }),
      coverage: new fields.StringField({
        required: true, blank: false, initial: "body",
        choices: () => CONFIG.FADING_SUNS.armourCoverage
      }),
      // Some armour hinders movement and dexterous action (p.196).
      penalty: new fields.NumberField({ required: true, integer: true, initial: 0 })
    });
  }
}

/**
 * Generic gear.
 */
export class FadingSunsEquipment extends FadingSunsPhysicalItem {}

/**
 * A skill (p.97, p.99). Natural skills begin at 3; learned skills begin at 0.
 */
export class FadingSunsSkill extends FadingSunsItemBase {

  /** @inheritDoc */
  static defineSchema() {
    const schema = super.defineSchema();
    delete schema.techLevel;
    delete schema.cost;
    return Object.assign(schema, {
      value: new fields.NumberField({ required: true, integer: true, min: 0, max: 20, initial: 0 }),
      skillType: new fields.StringField({
        required: true, blank: false, initial: "learned",
        choices: () => CONFIG.FADING_SUNS.skillTypes
      }),
      characteristic: new fields.StringField({ required: true, blank: false, initial: "mind.wits" }),
      // Many skills take a parenthetical focus, e.g. Lore (Jumproads), Speak (Latin).
      specialty: new fields.StringField({ required: false, blank: true, initial: "" }),
      guildSkill: new fields.BooleanField({ initial: false })
    });
  }

  /** @inheritDoc */
  static migrateData(source) {
    // v0.1.0 called this field "type", which now collides with the Item subtype.
    if (source && ("type" in source) && !("skillType" in source)) {
      source.skillType = source.type;
      delete source.type;
    }
    if (typeof source?.characteristic === "string" && !source.characteristic.includes(".")) {
      const map = {
        strength: "body.strength", dexterity: "body.dexterity", endurance: "body.endurance",
        wits: "mind.wits", perception: "mind.perception", tech: "mind.tech"
      };
      source.characteristic = map[source.characteristic] ?? "mind.wits";
    }
    return super.migrateData(source);
  }

  /**
   * The skill's display name including any specialty, e.g. "Speak (Latin)".
   *
   * Compendium skills are named with the specialty already in place so that the
   * sidebar is readable, so it is only appended when it is not there already.
   */
  get label() {
    const name = this.parent?.name ?? "";
    if (!this.specialty) return name;
    return name.includes(this.specialty) ? name : `${name} (${this.specialty})`;
  }
}

/**
 * A psychic power (p.128).
 */
export class FadingSunsPsychicPower extends FadingSunsItemBase {

  /** @inheritDoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      level: new fields.NumberField({ required: true, integer: true, min: 1, max: 9, initial: 1 }),
      path: new fields.StringField({ required: true, blank: true, initial: "" }),
      wyrdCost: new fields.NumberField({ required: true, integer: true, min: 0, initial: 1 }),
      characteristic: new fields.StringField({ required: true, blank: false, initial: "occult.psi" }),
      skill: new fields.StringField({ required: true, blank: true, initial: "Focus" }),
      duration: new fields.StringField({ required: false, blank: true, initial: "" }),
      range: new fields.StringField({ required: false, blank: true, initial: "" })
    });
  }

  /** @inheritDoc */
  static migrateData(source) {
    if (source && ("cost" in source) && !("wyrdCost" in source)) {
      source.wyrdCost = source.cost;
      delete source.cost;
    }
    return super.migrateData(source);
  }
}

/**
 * A theurgic rite (p.128).
 */
export class FadingSunsTheurgicRite extends FadingSunsItemBase {

  /** @inheritDoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      level: new fields.NumberField({ required: true, integer: true, min: 1, max: 9, initial: 1 }),
      ritual: new fields.StringField({ required: true, blank: true, initial: "" }),
      wyrdCost: new fields.NumberField({ required: true, integer: true, min: 0, initial: 1 }),
      characteristic: new fields.StringField({ required: true, blank: false, initial: "occult.theurgy" }),
      skill: new fields.StringField({ required: true, blank: true, initial: "Focus" }),
      duration: new fields.StringField({ required: false, blank: true, initial: "" }),
      range: new fields.StringField({ required: false, blank: true, initial: "" })
    });
  }

  /** @inheritDoc */
  static migrateData(source) {
    if (source && ("cost" in source) && !("wyrdCost" in source)) {
      source.wyrdCost = source.cost;
      delete source.cost;
    }
    return super.migrateData(source);
  }
}

/**
 * A Blessing or Curse (p.115).
 *
 * These are stored as data rather than Active Effects because they are
 * situational by nature: "Blessings and Curses have restrictions, or situations
 * which activate their modifiers. If the situation does not come into play, then
 * the character does not receive that modifier." (p.115)
 *
 * The roll dialog therefore offers a character's Blessings and Curses as
 * checkboxes with their restriction text, and the player ticks what applies.
 * Traits flagged `always` — Size and Appearance — are ticked by default.
 */
export class FadingSunsBlessing extends FadingSunsItemBase {

  /** @inheritDoc */
  static defineSchema() {
    const schema = super.defineSchema();
    delete schema.techLevel;
    return Object.assign(schema, {
      polarity: new fields.StringField({
        required: true, blank: false, initial: "blessing",
        choices: () => CONFIG.FADING_SUNS.blessingPolarities
      }),
      category: new fields.StringField({
        required: true, blank: false, initial: "behavior",
        choices: () => CONFIG.FADING_SUNS.blessingCategories
      }),
      // Blessings cost Extra points; Curses grant them. Stored as a magnitude.
      cost: new fields.NumberField({ required: true, integer: true, min: 0, initial: 2 }),
      modifiers: new fields.ArrayField(new fields.SchemaField({
        value: new fields.NumberField({ required: true, integer: true, initial: 0 }),
        target: new fields.StringField({ required: false, blank: true, initial: "" }),
        targetType: new fields.StringField({
          required: true, blank: false, initial: "characteristic",
          choices: () => CONFIG.FADING_SUNS.modifierTargets
        })
      })),
      restriction: new fields.StringField({ required: true, blank: true, initial: "" }),
      always: new fields.BooleanField({ initial: false }),
      // Some traits change derived statistics outright rather than a die roll.
      vitalityModifier: new fields.NumberField({ required: true, integer: true, initial: 0 }),
      baseRun: new fields.NumberField({ required: false, integer: true, min: 0, initial: 0 }),
      note: new fields.StringField({ required: false, blank: true, initial: "" })
    });
  }

  /** Whether this trait is a Curse. */
  get isCurse() {
    return this.polarity === "curse";
  }

  /**
   * Total modifier magnitude, used to check the limit of seven (p.115).
   * @returns {number}
   */
  get totalModifier() {
    return this.modifiers.reduce((n, m) => n + Math.abs(m.value ?? 0), 0);
  }

  /**
   * The modifier this trait contributes to a given roll, or 0 if it does not apply.
   * @param {object} options
   * @param {string} [options.characteristic]  Dot path of the characteristic rolled.
   * @param {string} [options.skill]           Name of the skill rolled.
   * @returns {number}
   */
  modifierFor({ characteristic, skill } = {}) {
    let total = 0;
    for (const mod of this.modifiers) {
      if (mod.targetType === "all") total += mod.value;
      else if (mod.targetType === "characteristic" && mod.target === characteristic) total += mod.value;
      else if (mod.targetType === "skill" && skill && mod.target === skill) total += mod.value;
    }
    return total;
  }

  /** A short summary such as "+2 Calm — In combat situations". */
  get summary() {
    const parts = this.modifiers.map(m => {
      const sign = m.value >= 0 ? "+" : "";
      const label = m.targetType === "all"
        ? game.i18n.localize("FADINGSUNS.Blessing.AllRolls")
        : (game.i18n.localize(CONFIG.FADING_SUNS.rollableCharacteristics[m.target] ?? "") || m.target);
      return `${sign}${m.value} ${label}`.trim();
    });
    return parts.join(", ");
  }
}

/**
 * A Benefice or Affliction (p.117).
 *
 * "While Blessings and Curses represent features inherent to an individual
 *  (directly modifying characteristics or skills), Benefices and Afflictions are
 *  based on the individual's place in society." (p.117)
 *
 * They carry no die modifiers. What they carry is a point cost, and most are
 * ranked — Refuge runs from a small farm at 2 points to a military base at 10 —
 * so the rank table is data rather than prose, and the chosen rank is stored on
 * the character's copy of the item.
 */
export class FadingSunsBenefice extends FadingSunsItemBase {

  /** @inheritDoc */
  static defineSchema() {
    const schema = super.defineSchema();
    delete schema.techLevel;
    delete schema.cost;
    return Object.assign(schema, {
      polarity: new fields.StringField({
        required: true, blank: false, initial: "benefice",
        choices: () => CONFIG.FADING_SUNS.beneficePolarities
      }),
      category: new fields.StringField({
        required: true, blank: false, initial: "background",
        choices: () => CONFIG.FADING_SUNS.beneficeCategories
      }),
      // The rank the character has actually bought. Benefices cost points;
      // Afflictions grant them. Stored as a magnitude either way.
      value: new fields.NumberField({ required: true, integer: true, min: 0, initial: 1 }),
      // The published rank table, where the entry is ranked at all.
      ranks: new fields.ArrayField(new fields.SchemaField({
        value: new fields.NumberField({ required: true, integer: true, min: 0, initial: 1 }),
        label: new fields.StringField({ required: true, blank: true, initial: "" }),
        firebirds: new fields.NumberField({ required: false, integer: true, min: 0, initial: 0 }),
        income: new fields.NumberField({ required: false, integer: true, min: 0, initial: 0 })
      })),
      // Starting firebirds and yearly income, for entries that carry them (p.121).
      firebirds: new fields.NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      income: new fields.NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      requires: new fields.StringField({ required: false, blank: true, initial: "" }),
      excludes: new fields.StringField({ required: false, blank: true, initial: "" })
    });
  }

  /** Whether this entry is an Affliction. */
  get isAffliction() {
    return this.polarity === "affliction";
  }

  /**
   * The rank table entry matching the bought value, if there is one.
   * @returns {object|null}
   */
  get rank() {
    if (!this.ranks.length) return null;
    // The highest published rank at or below what the character bought.
    const eligible = this.ranks.filter(r => r.value <= this.value);
    return eligible.length ? eligible[eligible.length - 1] : this.ranks[0];
  }

  /**
   * Points this entry costs a character. Afflictions return points, so they are
   * reported as a negative cost (p.118).
   * @returns {number}
   */
  get pointCost() {
    return this.isAffliction ? -this.value : this.value;
  }

  /** Starting firebirds granted, taking the chosen rank into account (p.121). */
  get startingFirebirds() {
    return this.rank?.firebirds || this.firebirds || 0;
  }

  /** Yearly income granted, taking the chosen rank into account (p.121). */
  get yearlyIncome() {
    return this.rank?.income || this.income || 0;
  }

  /** A short summary such as "Refuge 6 — Monastery". */
  get summary() {
    const rank = this.rank;
    return rank?.label ? `${this.value} — ${rank.label}` : `${this.value}`;
  }
}
