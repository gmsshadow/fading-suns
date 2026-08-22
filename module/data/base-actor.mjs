import { vitalityPenalty } from "../dice/victory-chart.mjs";

const fields = foundry.data.fields;

/**
 * Build a characteristic field: a rating from 1 to 10 (p.93).
 * @param {number} initial
 * @returns {foundry.data.fields.SchemaField}
 */
function characteristic(initial = 3) {
  return new fields.SchemaField({
    value: new fields.NumberField({ required: true, integer: true, min: 0, max: 20, initial })
  });
}

/**
 * Build a Spirit characteristic field. Spirit traits come in opposed pairs; one
 * of each pair is primary and begins at 3, the other begins at 1 (p.93).
 * @param {number} initial
 * @param {boolean} primary
 * @returns {foundry.data.fields.SchemaField}
 */
function spiritCharacteristic(initial, primary) {
  return new fields.SchemaField({
    value: new fields.NumberField({ required: true, integer: true, min: 0, max: 20, initial }),
    primary: new fields.BooleanField({ initial: primary })
  });
}

/**
 * Shared schema and derivation for every Fading Suns actor type.
 * @abstract
 */
export class FadingSunsActorBase extends foundry.abstract.TypeDataModel {

  /** @inheritDoc */
  static defineSchema() {
    return {
      // Vitality: five vital levels plus Endurance (p.125).
      vitality: new fields.SchemaField({
        value: new fields.NumberField({ required: true, integer: true, initial: 8 }),
        bonus: new fields.NumberField({ required: true, integer: true, initial: 0 })
      }),

      // Wyrd: spiritual energy, derived from the character's occult path (p.125).
      wyrd: new fields.SchemaField({
        value: new fields.NumberField({ required: true, integer: true, min: 0, initial: 3 }),
        bonus: new fields.NumberField({ required: true, integer: true, initial: 0 })
      }),

      // Body characteristics (p.93).
      body: new fields.SchemaField({
        strength: characteristic(3),
        dexterity: characteristic(3),
        endurance: characteristic(3)
      }),

      // Mind characteristics (p.93).
      mind: new fields.SchemaField({
        wits: characteristic(3),
        perception: characteristic(3),
        tech: characteristic(3)
      }),

      // Spirit characteristics, in opposed pairs (p.93).
      spirit: new fields.SchemaField({
        extrovert: spiritCharacteristic(3, true),
        introvert: spiritCharacteristic(1, false),
        passion: spiritCharacteristic(3, true),
        calm: spiritCharacteristic(1, false),
        faith: spiritCharacteristic(3, true),
        ego: spiritCharacteristic(1, false)
      }),

      // Occult characteristics (p.128, p.143, p.160).
      occult: new fields.SchemaField({
        psi: characteristic(0),
        urge: characteristic(0),
        theurgy: characteristic(0),
        hubris: characteristic(0)
      }),

      biography: new fields.HTMLField({ required: false, blank: true, initial: "" })
    };
  }

  /* -------------------------------------------- */

  /**
   * Migrate legacy template.json data into the current schema.
   * @inheritDoc
   */
  static migrateData(source) {
    // v0.1.0 stored an absolute Vitality maximum; it is now derived from Endurance
    // plus an explicit bonus so that Blessings and Curses can be represented.
    if (source?.vitality && ("max" in source.vitality) && !("bonus" in source.vitality)) {
      const endurance = source.body?.endurance?.value ?? 3;
      source.vitality.bonus = Number(source.vitality.max) - (5 + Number(endurance));
      delete source.vitality.max;
    }
    if (source?.wyrd && ("max" in source.wyrd) && !("bonus" in source.wyrd)) {
      delete source.wyrd.max;
    }
    return super.migrateData(source);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareDerivedData() {
    super.prepareDerivedData();

    // Some Blessings and Curses change base Vitality outright — Giant +2,
    // Dwarf -2, Incurable Disease -1 (p.116).
    this.vitality.traitModifier = this.#traitVitality();

    // Vitality is Endurance plus five vital levels (p.125).
    this.vitality.max = Math.max(
      1, 5 + this.body.endurance.value + this.vitality.bonus + this.vitality.traitModifier
    );
    this.vitality.value = Math.min(this.vitality.value, this.vitality.max);

    // Wound penalties apply to every task once vital levels are lost (p.125).
    this.vitality.penalty = vitalityPenalty(this.vitality.value);
    this.vitality.unconscious = this.vitality.value <= 1 && this.vitality.value > 0;
    this.vitality.dead = this.vitality.value <= 0;

    // Beginning Wyrd depends on the character's occult path (p.125).
    this.wyrd.base = this.#deriveWyrdBase();
    this.wyrd.max = Math.max(0, this.wyrd.base + this.wyrd.bonus);
    this.wyrd.value = Math.min(this.wyrd.value, this.wyrd.max);
  }

  /* -------------------------------------------- */

  /**
   * Total Vitality modifier from owned Blessings and Curses (p.116).
   * @returns {number}
   */
  #traitVitality() {
    let total = 0;
    for (const item of this.parent?.items ?? []) {
      if (item.type === "blessing") total += item.system.vitalityModifier ?? 0;
    }
    return total;
  }

  /**
   * Beginning Wyrd (p.125):
   *   Theurgy      — equal to Faith.
   *   Psi          — equal to Extrovert or Introvert, whichever is primary.
   *   Non-occultist — equal to Passion or Calm, whichever is primary.
   * @returns {number}
   */
  #deriveWyrdBase() {
    if (this.occult.theurgy.value > 0) {
      this.wyrd.source = "theurgy";
      return this.spirit.faith.value;
    }
    if (this.occult.psi.value > 0) {
      this.wyrd.source = "psi";
      return this.#primaryOf("extrovert", "introvert");
    }
    this.wyrd.source = "mundane";
    return this.#primaryOf("passion", "calm");
  }

  /**
   * Return the value of whichever trait in an opposed pair is marked primary.
   * Falls back to the higher of the two if neither is flagged.
   * @param {string} a
   * @param {string} b
   * @returns {number}
   */
  #primaryOf(a, b) {
    const first = this.spirit[a];
    const second = this.spirit[b];
    if (first.primary && !second.primary) return first.value;
    if (second.primary && !first.primary) return second.value;
    return Math.max(first.value, second.value);
  }

  /* -------------------------------------------- */

  /**
   * Resolve a characteristic rating from a dot path such as "body.dexterity".
   * @param {string} path
   * @returns {number}
   */
  getCharacteristic(path) {
    if (!path) return 0;
    const parts = String(path).split(".");
    if (parts.length === 2) return this[parts[0]]?.[parts[1]]?.value ?? 0;
    // Tolerate a bare name such as "dexterity" for convenience.
    for (const group of ["body", "mind", "spirit", "occult"]) {
      if (this[group]?.[parts[0]]) return this[group][parts[0]].value;
    }
    return 0;
  }
}
