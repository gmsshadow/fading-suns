import { triggersFor, triggerCharacteristic } from "../dice/occult.mjs";

const { DialogV2 } = foundry.applications.api;
const { renderTemplate } = foundry.applications.handlebars;

/**
 * Ask which taboo or deed is being rolled against, and at how many levels.
 *
 * The rulebook leaves the level within each band to the gamemaster — "1–2",
 * "2–3" — so the dialog offers the band rather than deciding.
 *
 * @param {object} options
 * @param {Actor} options.actor
 * @param {"urge"|"hubris"} options.shadow
 * @param {"taboo"|"deed"} options.kind
 * @returns {Promise<{key: string, levels: number}|null>}
 */
export async function promptOccultTrigger({ actor, shadow, kind } = {}) {
  const primary = {
    "spirit.faith": actor.system.spirit.faith.primary,
    "spirit.ego": actor.system.spirit.ego.primary
  };

  const triggers = triggersFor(shadow, kind).map(trigger => {
    const path = triggerCharacteristic(trigger, primary);
    const characteristic = game.i18n.localize(
      CONFIG.FADING_SUNS.rollableCharacteristics[path] ?? path
    );
    const [min, max] = trigger.levels;

    return {
      key: trigger.key,
      label: trigger.label,
      roll: `${characteristic} + ${trigger.skills.join(" / ")}`,
      band: min === max ? `${min}` : `${min}–${max}`,
      levels: Array.from({ length: max - min + 1 }, (_, i) => min + i),
      cost: trigger.cost ?? ""
    };
  });

  const content = await renderTemplate(
    "systems/fading-suns/templates/dialog/occult-trigger.hbs",
    {
      shadowLabel: game.i18n.localize(CONFIG.FADING_SUNS.occult[shadow]),
      isTaboo: kind === "taboo",
      triggers
    }
  );

  return DialogV2.prompt({
    window: {
      title: game.i18n.localize(`FADINGSUNS.Occult.${kind === "taboo" ? "Taboo" : "Deed"}`),
      icon: kind === "taboo" ? "fa-solid fa-fire" : "fa-solid fa-dove"
    },
    classes: ["fading-suns", "occult-dialog"],
    position: { width: 460 },
    content,
    ok: {
      label: "FADINGSUNS.Roll.Roll",
      icon: "fa-solid fa-dice-d20",
      callback: (event, button) => {
        const data = new foundry.applications.ux.FormDataExtended(button.form).object;
        if (!data.key) return null;
        return { key: data.key, levels: Number(data.levels) || undefined };
      }
    },
    rejectClose: false
  });
}
