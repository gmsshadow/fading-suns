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

  /** The skill's display name including any specialty. */
  get label() {
    const name = this.parent?.name ?? "";
    return this.specialty ? `${name} (${this.specialty})` : name;
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
