import { initiativeValue, multipleActionPenalty, MAX_ACTIONS } from "../dice/combat.mjs";

const { DialogV2 } = foundry.applications.api;

/**
 * The Fading Suns Combatant.
 *
 * Initiative is not rolled: "Each character's rating is equal to the skill he is
 * using, and the character with the highest rating acts first." (p.164) Which
 * skill that is depends on what the character intends to do, so it is declared
 * each round rather than derived once.
 *
 * The declaration also carries how many actions are being attempted, since
 * "multiple action penalties and wound penalties are applied to initiative
 * ratings in addition to goal rolls" (p.164).
 */
export class FadingSunsCombatant extends Combatant {

  /** The declaration made for the current round, if any. */
  get declaration() {
    return this.getFlag("fading-suns", "declaration") ?? null;
  }

  /** The skill rating this combatant is acting on, or zero if undeclared. */
  get declaredSkill() {
    const declared = this.declaration;
    if (!declared) return null;
    const item = this.actor?.items.get(declared.skillId);
    return item ? { name: item.system.label, value: item.system.value } : null;
  }

  /* -------------------------------------------- */

  /**
   * Record what this combatant intends to do this round, and set initiative
   * from it.
   *
   * @param {object} declaration
   * @param {string} declaration.skillId      Id of the skill Item being used.
   * @param {number} [declaration.actions=1]  Actions attempted this turn.
   * @param {number} [declaration.modifier=0] From a weapon or combat action.
   * @returns {Promise<Combatant>}
   */
  async declare({ skillId, actions = 1, modifier = 0 } = {}) {
    const skill = this.actor?.items.get(skillId);
    if (!skill) return this;

    const initiative = initiativeValue({
      skill: skill.system.value,
      wits: this.actor.system.mind.wits.value,
      modifier,
      woundPenalty: this.actor.system.vitality.penalty ?? 0,
      actions
    });

    await this.setFlag("fading-suns", "declaration", {
      skillId,
      skillName: skill.system.label,
      actions: Math.min(MAX_ACTIONS, Math.max(1, actions)),
      modifier,
      round: this.combat?.round ?? 0
    });

    return this.update({ initiative });
  }

  /** Clear the declaration, as at the start of a new round. */
  async clearDeclaration() {
    if (!this.declaration) return this;
    await this.unsetFlag("fading-suns", "declaration");
    return this.update({ initiative: null });
  }

  /* -------------------------------------------- */

  /**
   * Ask the player what this combatant is doing, then set initiative from it.
   * @returns {Promise<Combatant|null>}
   */
  async promptDeclaration() {
    const actor = this.actor;
    if (!actor) return null;

    const skills = actor.items
      .filter(i => i.type === "skill")
      .sort((a, b) => (b.system.value - a.system.value) || a.name.localeCompare(b.name));

    if (!skills.length) {
      ui.notifications.warn(game.i18n.localize("FADINGSUNS.Combat.NoSkills"));
      return null;
    }

    const current = this.declaration;
    const content = await foundry.applications.handlebars.renderTemplate(
      "systems/fading-suns/templates/dialog/declare-initiative.hbs",
      {
        actorName: actor.name,
        skills: skills.map(s => ({
          id: s.id,
          label: s.system.label,
          value: s.system.value,
          selected: s.id === current?.skillId
        })),
        actions: [1, 2, 3].map(n => ({
          value: n,
          penalty: multipleActionPenalty(n),
          selected: n === (current?.actions ?? 1)
        })),
        woundPenalty: actor.system.vitality.penalty ?? 0,
        wits: actor.system.mind.wits.value
      }
    );

    const result = await DialogV2.prompt({
      window: { title: game.i18n.localize("FADINGSUNS.Combat.Declare"), icon: "fa-solid fa-flag" },
      classes: ["fading-suns", "declare-dialog"],
      position: { width: 420 },
      content,
      ok: {
        label: "FADINGSUNS.Combat.Declare",
        callback: (event, button) => {
          const data = new foundry.applications.ux.FormDataExtended(button.form).object;
          return {
            skillId: data.skillId,
            actions: Number(data.actions) || 1,
            modifier: Number(data.modifier) || 0
          };
        }
      },
      rejectClose: false
    });

    if (!result) return null;
    return this.declare(result);
  }

  /* -------------------------------------------- */

  /**
   * Initiative is a declared rating rather than a roll, so rolling it opens the
   * declaration instead.
   * @inheritDoc
   */
  async getInitiativeRoll() {
    await this.promptDeclaration();
    return null;
  }
}
