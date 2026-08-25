import { FadingSunsActorBase } from "./base-actor.mjs";

const fields = foundry.data.fields;

/**
 * A player character.
 */
export class FadingSunsCharacter extends FadingSunsActorBase {

  /** @inheritDoc */
  static migrateData(source) {
    // Race was free text before the racial rules existed.
    const known = { Human: "human", "Ur-Obun": "urObun", "Ur-Ukar": "urUkar", Vorox: "vorox" };
    if (source?.details?.race in known) source.details.race = known[source.details.race];
    else if (source?.details && !source.details.race) source.details.race = "human";
    return super.migrateData(source);
  }

  /** @inheritDoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      details: new fields.SchemaField({
        race: new fields.StringField({
          required: true, blank: false, initial: "human",
          choices: () => CONFIG.FADING_SUNS.races
        }),
        faction: new fields.StringField({ required: true, blank: true, initial: "" }),
        house: new fields.StringField({ required: true, blank: true, initial: "" }),
        rank: new fields.StringField({ required: true, blank: true, initial: "" }),
        role: new fields.StringField({ required: true, blank: true, initial: "" }),
        homeworld: new fields.StringField({ required: true, blank: true, initial: "" }),
        age: new fields.StringField({ required: true, blank: true, initial: "" }),
        gender: new fields.StringField({ required: true, blank: true, initial: "" })
      }),
      firebirds: new fields.NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      experience: new fields.SchemaField({
        value: new fields.NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        total: new fields.NumberField({ required: true, integer: true, min: 0, initial: 0 })
      })
    });
  }
}

/**
 * A gamemaster character or creature.
 */
export class FadingSunsNPC extends FadingSunsActorBase {

  /** @inheritDoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      details: new fields.SchemaField({
        race: new fields.StringField({
          required: true, blank: false, initial: "human",
          choices: () => CONFIG.FADING_SUNS.races
        }),
        type: new fields.StringField({ required: true, blank: true, initial: "" }),
        faction: new fields.StringField({ required: true, blank: true, initial: "" })
      }),
      // A shorthand armour rating for creatures with natural protection, so that a
      // gamemaster need not create an armour Item for every beast (p.65).
      naturalArmour: new fields.NumberField({ required: true, integer: true, min: 0, initial: 0 })
    });
  }
}
