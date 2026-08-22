const { DialogV2 } = foundry.applications.api;
const { renderTemplate } = foundry.applications.handlebars;

/**
 * Prompt the user to configure a Goal Roll before it is made.
 *
 * Collects a situational modifier from the Bonuses and Penalties chart (p.64) and,
 * optionally, a Wyrd accent (p.69).
 *
 * @param {object} options
 * @param {string} options.title            Dialog title.
 * @param {number} [options.characteristicValue=0]
 * @param {string} [options.characteristicLabel=""]
 * @param {number} [options.skillValue=0]
 * @param {string} [options.skillLabel=""]
 * @param {number} [options.woundPenalty=0]  Wound penalty that will be applied (p.125).
 * @param {number} [options.wyrdAvailable=0] Wyrd points the actor currently has.
 * @param {object[]} [options.traits=[]]     Blessings and Curses that could apply (p.115).
 * @returns {Promise<{modifier: number, accent: number, spendWyrd: boolean}|null>}
 *          Null if the user cancelled.
 */
export async function promptGoalRoll({
  title,
  characteristicValue = 0,
  characteristicLabel = "",
  skillValue = 0,
  skillLabel = "",
  woundPenalty = 0,
  wyrdAvailable = 0,
  traits = []
} = {}) {

  const content = await renderTemplate(
    "systems/fading-suns/templates/dialog/goal-roll.hbs",
    {
      characteristicValue,
      characteristicLabel,
      skillValue,
      skillLabel,
      woundPenalty,
      wyrdAvailable,
      traits,
      baseGoal: characteristicValue + skillValue + woundPenalty,
      difficulties: CONFIG.FADING_SUNS.difficulties
    }
  );

  const result = await DialogV2.prompt({
    window: { title, icon: "fa-solid fa-dice-d20" },
    classes: ["fading-suns", "goal-roll-dialog"],
    position: { width: 380 },
    content,
    ok: {
      label: "FADINGSUNS.Roll.Roll",
      icon: "fa-solid fa-dice-d20",
      callback: (event, button) => {
        const data = new foundry.applications.ux.FormDataExtended(button.form).object;
        const difficulty = Number(data.difficulty) || 0;
        const situational = Number(data.situational) || 0;
        const accent = Number(data.accent) || 0;

        // Each ticked Blessing or Curse contributes its modifier (p.115).
        let traitModifier = 0;
        const applied = [];
        for (const trait of traits) {
          if (data[`trait.${trait.id}`]) {
            traitModifier += trait.modifier;
            applied.push(trait.name);
          }
        }

        return {
          modifier: difficulty + situational + traitModifier,
          accent,
          traitModifier,
          appliedTraits: applied,
          spendWyrd: accent !== 0
        };
      }
    },
    rejectClose: false
  });

  return result ?? null;
}
