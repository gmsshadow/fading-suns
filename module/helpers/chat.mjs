/**
 * Wire up interactive controls on Fading Suns chat cards.
 *
 * Foundry v13 replaced the jQuery-based `renderChatMessage` hook with
 * `renderChatMessageHTML`, which passes a plain HTMLElement.
 */
export function registerChatListeners() {
  Hooks.on("renderChatMessageHTML", (message, html) => {
    const flags = message.flags?.["fading-suns"];
    if (!flags) return;

    for (const button of html.querySelectorAll("[data-fs-action]")) {
      button.addEventListener("click", event => onCardAction(event, message));
    }
  });
}

/**
 * Handle a click on a chat card control.
 * @param {PointerEvent} event
 * @param {ChatMessage} message
 */
async function onCardAction(event, message) {
  event.preventDefault();
  const button = event.currentTarget;
  const action = button.dataset.fsAction;
  const flags = message.flags["fading-suns"];

  const actor = flags.actorUuid ? await fromUuid(flags.actorUuid) : null;
  const item = flags.itemUuid ? await fromUuid(flags.itemUuid) : null;

  if (!actor?.isOwner) {
    ui.notifications.warn(game.i18n.localize("FADINGSUNS.Warning.NotOwner"));
    return;
  }

  switch (action) {
    case "rollDamage": {
      if (!item) return;
      // The attacker may pull the punch, using fewer victory dice (p.65).
      const pulled = event.ctrlKey ? 1 : null;
      button.disabled = true;
      await actor.rollDamage(item.id, flags.victoryDice ?? 0, pulled);
      break;
    }
    case "applyDamage": {
      const points = Number(button.dataset.points) || 0;
      const targets = canvas.tokens?.controlled?.filter(t => t.actor?.isOwner) ?? [];
      if (!targets.length) {
        ui.notifications.warn(game.i18n.localize("FADINGSUNS.Warning.NoTargets"));
        return;
      }
      for (const token of targets) await token.actor.applyDamage(points);
      break;
    }
  }
}
