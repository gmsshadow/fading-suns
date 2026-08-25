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
      // The charts give two ranges in metres; anything past long is Extreme.
      // Long costs -2 to the goal roll and Extreme -4 (p.296).
      range: new fields.SchemaField({
        short: new fields.NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        long: new fields.NumberField({ required: true, integer: true, min: 0, initial: 0 })
      }),
      // Strength needed to wield it; below this the goal roll takes -2 (p.296).
      strength: new fields.NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      size: new fields.StringField({
        required: false, blank: true, initial: "M",
        choices: () => CONFIG.FADING_SUNS.weaponSizes
      }),
      initiativeModifier: new fields.NumberField({ required: true, integer: true, initial: 0 }),
      goalModifier: new fields.NumberField({ required: true, integer: true, initial: 0 }),
      autofire: new fields.BooleanField({ initial: false }),
      costNote: new fields.StringField({ required: false, blank: true, initial: "" }),
      notes: new fields.StringField({ required: false, blank: true, initial: "" }),
      rateOfFire: new fields.NumberField({ required: true, integer: true, min: 0, initial: 1 }),
      shots: new fields.SchemaField({
        value: new fields.NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        max: new fields.NumberField({ required: true, integer: true, min: 0, initial: 0 })
      })
    });
  }

  /** @inheritDoc */
  static migrateData(source) {
    // The charts give Short and Long only, so a stored medium band folds into
    // long rather than being discarded.
    if (source?.range && ("medium" in source.range)) {
      if (!source.range.long) source.range.long = source.range.medium;
      delete source.range.medium;
    }
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
  static migrateData(source) {
    // A single penalty became one per characteristic, matching the chart.
    if (source && ("penalty" in source) && !("penalties" in source)) {
      source.penalties = { strength: 0, dexterity: Number(source.penalty) || 0, vigor: 0 };
      delete source.penalty;
    }
    return super.migrateData(source);
  }

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
      armourType: new fields.StringField({
        required: true, blank: false, initial: "armour",
        choices: () => CONFIG.FADING_SUNS.armourTypes
      }),
      // Heavy armour hinders movement and dexterous action (p.299).
      penalties: new fields.SchemaField({
        strength: new fields.NumberField({ required: true, integer: true, initial: 0 }),
        dexterity: new fields.NumberField({ required: true, integer: true, initial: 0 }),
        vigor: new fields.NumberField({ required: true, integer: true, initial: 0 })
      }),
      // Whether an energy shield may be worn over it (p.299).
      energyShieldCompatible: new fields.BooleanField({ initial: false }),
      // A physical shield may be rammed into a target (p.174).
      shieldDamage: new fields.NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      // Energy shields absorb between a minimum and maximum, for a number of
      // hits before the cell is spent (p.300).
      energyShield: new fields.SchemaField({
        min: new fields.NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        max: new fields.NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        hits: new fields.SchemaField({
          value: new fields.NumberField({ required: true, integer: true, min: 0, initial: 0 }),
          max: new fields.NumberField({ required: true, integer: true, min: 0, initial: 0 })
        })
      }),
      costNote: new fields.StringField({ required: false, blank: true, initial: "" }),
      notes: new fields.StringField({ required: false, blank: true, initial: "" })
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
      level: new fields.NumberField({ required: true, integer: true, min: 1, max: 10, initial: 1 }),
      path: new fields.StringField({ required: true, blank: true, initial: "" }),
      wyrdCost: new fields.NumberField({ required: true, integer: true, min: 0, initial: 1 }),
      wyrdNote: new fields.StringField({ required: false, blank: true, initial: "" }),
      characteristic: new fields.StringField({ required: true, blank: true, initial: "occult.psi" }),
      skill: new fields.StringField({ required: true, blank: true, initial: "Focus" }),
      // A handful of entries print "Special (see text)" instead of a pairing.
      rollNote: new fields.StringField({ required: false, blank: true, initial: "" }),
      duration: new fields.StringField({ required: false, blank: true, initial: "" }),
      range: new fields.StringField({ required: false, blank: true, initial: "" }),
      // "A character chooses a path and must buy each level consecutively"
      // (p.128). Stored rather than inferred, because Sympathy begins at level
      // three and Omen at level six.
      requires: new fields.StringField({ required: false, blank: true, initial: "" })
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
      level: new fields.NumberField({ required: true, integer: true, min: 1, max: 10, initial: 1 }),
      ritual: new fields.StringField({ required: true, blank: true, initial: "" }),
      // The sect whose liturgy this rite belongs to; rites outside a character's
      // own sect cost more to learn (p.147).
      sect: new fields.StringField({ required: false, blank: true, initial: "" }),
      // Gesture, Litany and Paraphernalia, as the rite requires (p.147).
      components: new fields.StringField({ required: false, blank: true, initial: "" }),
      wyrdCost: new fields.NumberField({ required: true, integer: true, min: 0, initial: 1 }),
      wyrdNote: new fields.StringField({ required: false, blank: true, initial: "" }),
      characteristic: new fields.StringField({ required: true, blank: true, initial: "occult.theurgy" }),
      skill: new fields.StringField({ required: true, blank: true, initial: "Focus" }),
      rollNote: new fields.StringField({ required: false, blank: true, initial: "" }),
      duration: new fields.StringField({ required: false, blank: true, initial: "" }),
      range: new fields.StringField({ required: false, blank: true, initial: "" }),
      requires: new fields.StringField({ required: false, blank: true, initial: "" })
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

/**
 * A Character History stage (p.72–p.89).
 *
 * Upbringing, Apprenticeship, Early Career and the extra stages are all the same
 * shape: a bundle of grants that the lifepath engine applies in order. The grants
 * are stored as loosely-typed objects because they are a small tagged union, and
 * `module/lifepath/grants.mjs` validates them — a malformed grant throws there
 * rather than being quietly dropped here.
 */
export class FadingSunsStage extends FadingSunsItemBase {

  /** @inheritDoc */
  static defineSchema() {
    const schema = super.defineSchema();
    delete schema.techLevel;
    delete schema.cost;
    return Object.assign(schema, {
      stageType: new fields.StringField({
        required: true, blank: false, initial: "upbringing",
        choices: () => CONFIG.FADING_SUNS.stageTypes
      }),
      faction: new fields.StringField({
        required: true, blank: true, initial: "noble",
        choices: () => CONFIG.FADING_SUNS.factions
      }),
      // Priests and guildsmembers share their Upbringings, so a stage may be
      // open to more than one faction. Empty means any.
      factions: new fields.ArrayField(new fields.StringField()),
      // A composite stage fills one slot of several. Priests and guildsmembers
      // build their Upbringing from an Environment and a Class (p.77), where a
      // noble takes a single stage filling the whole thing.
      slot: new fields.StringField({ required: false, blank: true, initial: "" }),
      // The house, sect, guild or grouping this stage belongs to, e.g. "Hawkwood",
      // "Military". Free text because minor houses are meant to be invented (p.72).
      group: new fields.StringField({ required: false, blank: true, initial: "" }),
      grants: new fields.ArrayField(new fields.ObjectField()),
      // "Suggested Benefices" from the faction and house write-ups (p.72–76).
      // Advisory only: the rulebook offers them, it does not require them.
      suggestedBenefices: new fields.ArrayField(new fields.SchemaField({
        label: new fields.StringField({ required: true, blank: false }),
        uuid: new fields.StringField({ required: false, blank: true, initial: "" }),
        value: new fields.NumberField({ required: false, integer: true, min: 0, initial: 0 }),
        note: new fields.StringField({ required: false, blank: true, initial: "" })
      })),
      // "Benefice Restriction: Riches (7 pts maximum)" and the like.
      beneficeRestriction: new fields.StringField({ required: false, blank: true, initial: "" }),

      // Extra Stages only (p.84). Each costs 20 of the 40 Extra points, and most
      // hand the player an allowance to distribute rather than fixed traits.
      extraCost: new fields.NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      allowance: new fields.SchemaField({
        characteristics: new fields.NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        skills: new fields.NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        free: new fields.NumberField({ required: true, integer: true, min: 0, initial: 0 })
      }),
      // Another Tour of Duty may only follow a Tour of Duty, and so on.
      requires: new fields.StringField({ required: false, blank: true, initial: "" }),
      // Loaded-for-Bear may be taken alone: "can take no other Extra Stages".
      exclusive: new fields.BooleanField({ initial: false }),
      // Listed but not yet takeable, pending the Psi and Theurgy compendiums.
      pending: new fields.BooleanField({ initial: false }),
      // "Suggested Benefices" as printed alongside each house, sect or guild.
      // Advisory only: the wizard collates them at Step Five (p.72–p.85).
      suggestedBenefices: new fields.ArrayField(new fields.SchemaField({
        label: new fields.StringField({ required: true, blank: false }),
        uuid: new fields.StringField({ required: false, blank: true, initial: "" }),
        value: new fields.NumberField({ required: false, integer: true, min: 0, initial: 0 })
      })),
      // "Benefice Restriction: Riches (7 pts maximum)" and the like.
      beneficeRestriction: new fields.StringField({ required: false, blank: true, initial: "" }),

      // Extra Stages only (p.84). Each costs 20 of the 40 Extra points, and most
      // hand the player an allowance to distribute rather than fixed traits.
      extraCost: new fields.NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      allowance: new fields.SchemaField({
        characteristics: new fields.NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        skills: new fields.NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        free: new fields.NumberField({ required: true, integer: true, min: 0, initial: 0 })
      }),
      // Another Tour of Duty may only follow a Tour of Duty, and so on.
      requires: new fields.StringField({ required: false, blank: true, initial: "" }),
      // Loaded-for-Bear may be taken alone: "can take no other Extra Stages".
      exclusive: new fields.BooleanField({ initial: false }),
      // Listed but not yet takeable, pending the Psi and Theurgy compendiums.
      pending: new fields.BooleanField({ initial: false })
    });
  }

  /**
   * The points this stage is worth, from the published budgets (p.88).
   * @returns {{characteristics: number, skills: number}|null}
   */
  get budget() {
    return CONFIG.FADING_SUNS.stageBudgets[this.stageType] ?? null;
  }

  /** Choices in this stage that the player must decide. */
  get choices() {
    return this.grants.filter(g => g.kind === "choice");
  }

  /** Whether the stage can be applied without asking the player anything. */
  get isAutomatic() {
    return !this.choices.length;
  }
}

/**
 * A Combat Action (p.102, charted p.292–p.295).
 *
 * "Combat actions are not skills so much as trained maneuvers... They are rated
 *  by the level of the relevant skill required to learn them." (p.102)
 *
 * The level is the point cost at creation, one Extra point per level (p.88).
 * Actions with level 0 are those the charts leave unrated — anyone may attempt
 * them without training.
 *
 * Initiative, goal and damage are stored as the charts print them, because
 * several are not plain numbers ("0/-1", "-1/m", "3+"). Where the printed value
 * is a plain integer a numeric modifier is derived alongside, so a roll can use
 * it without parsing display text.
 */
export class FadingSunsCombatAction extends FadingSunsItemBase {

  /** @inheritDoc */
  static defineSchema() {
    const schema = super.defineSchema();
    delete schema.techLevel;
    delete schema.cost;
    return Object.assign(schema, {
      category: new fields.StringField({
        required: true, blank: false, initial: "fencing",
        choices: () => CONFIG.FADING_SUNS.combatActionCategories
      }),
      level: new fields.NumberField({ required: true, integer: true, min: 0, max: 10, initial: 1 }),
      characteristic: new fields.StringField({ required: false, blank: true, initial: "body.dexterity" }),
      skill: new fields.StringField({ required: false, blank: true, initial: "Melee" }),
      initiative: new fields.StringField({ required: false, blank: true, initial: "-" }),
      goal: new fields.StringField({ required: false, blank: true, initial: "-" }),
      damage: new fields.StringField({ required: false, blank: true, initial: "-" }),
      initiativeModifier: new fields.NumberField({ required: true, integer: true, initial: 0 }),
      goalModifier: new fields.NumberField({ required: true, integer: true, initial: 0 }),
      effect: new fields.StringField({ required: false, blank: true, initial: "" })
    });
  }

  /** Whether this action must be bought, or may be attempted by anyone. */
  get requiresTraining() {
    return this.level > 0;
  }

  /** Extra points this action costs, at one per level (p.88). */
  get pointCost() {
    return this.level;
  }

  /** A short summary such as "Dexterity + Melee, Goal -2". */
  get summary() {
    if (!this.skill) return this.effect ? "" : "-";
    const characteristic = game.i18n.localize(
      CONFIG.FADING_SUNS.rollableCharacteristics[this.characteristic] ?? this.characteristic
    );
    return `${characteristic} + ${this.skill}`;
  }
}
