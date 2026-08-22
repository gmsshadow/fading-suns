import { resolveGoalRoll } from "./victory-chart.mjs";
import {
  countEffectSuccesses, damagePool, EFFECT_DIE_SUCCESS_THRESHOLD
} from "./effect-dice.mjs";

const { renderTemplate } = foundry.applications.handlebars;

/**
 * Post a chat message, honouring the user's current roll mode.
 * @param {object} messageData
 * @param {string} [rollMode]
 * @returns {Promise<ChatMessage>}
 */
async function postMessage(messageData, rollMode) {
  const mode = rollMode ?? game.settings.get("core", "rollMode");
  ChatMessage.applyRollMode(messageData, mode);
  return ChatMessage.create(messageData);
}

/* -------------------------------------------- */
/*  Goal Rolls (p.64)                           */
/* -------------------------------------------- */

/**
 * Roll a Goal Roll and post the result to chat.
 *
 * @param {object} options
 * @param {Actor} options.actor                 The acting actor.
 * @param {string} [options.characteristic]     Dot path, e.g. "body.dexterity".
 * @param {string} [options.skillId]            Id of the skill Item being used.
 * @param {number} [options.modifier=0]         Situational modifier (p.64).
 * @param {number} [options.accent=0]           Wyrd accent (p.69).
 * @param {number} [options.woundPenalty=0]     Automatic wound penalty (p.125).
 * @param {string} [options.flavor]             Optional flavour text.
 * @param {Item}   [options.item]               Weapon or power prompting the roll.
 * @param {string} [options.rollMode]
 * @returns {Promise<object>} The resolved outcome, with `roll` and `message` attached.
 */
export async function goalRoll({
  actor, characteristic, skillId, modifier = 0, accent = 0,
  woundPenalty = 0, flavor, item, rollMode
} = {}) {
  if (!actor) throw new Error("Fading Suns | A Goal Roll requires an actor.");

  const skill = skillId ? actor.items.get(skillId) : null;
  const charPath = characteristic || skill?.system.characteristic || "mind.wits";

  const charValue = actor.system.getCharacteristic(charPath);
  const skillValue = skill?.system.value ?? 0;
  const goal = charValue + skillValue + modifier + woundPenalty;

  const roll = new Roll("1d20");
  await roll.evaluate();

  const outcome = resolveGoalRoll({ natural: roll.total, goal, accent });

  const charLabel = game.i18n.localize(
    CONFIG.FADING_SUNS.rollableCharacteristics[charPath] ?? charPath
  );

  const context = {
    ...outcome,
    actorName: actor.name,
    characteristicLabel: charLabel,
    characteristicValue: charValue,
    skillLabel: skill ? skill.system.label : null,
    skillValue,
    modifier,
    woundPenalty,
    accomplishmentLabel: game.i18n.localize(
      `FADINGSUNS.Accomplishment.${outcome.accomplishment}`
    ),
    itemName: item?.name ?? null,
    // A successful weapon attack offers a damage roll (p.65).
    canRollDamage: !!(item?.type === "weapon" && outcome.success)
  };

  const messageData = {
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: flavor ?? (item ? item.name : null),
    rolls: [roll],
    content: await renderTemplate("systems/fading-suns/templates/chat/goal-roll.hbs", context),
    flags: {
      "fading-suns": {
        kind: "goalRoll",
        actorUuid: actor.uuid,
        itemUuid: item?.uuid ?? null,
        victoryDice: outcome.victoryDice,
        outcome
      }
    }
  };

  const message = await postMessage(messageData, rollMode);
  return { ...outcome, roll, message };
}

/* -------------------------------------------- */
/*  Effect Dice (p.65)                          */
/* -------------------------------------------- */

/**
 * Roll a pool of effect dice and post the result to chat.
 *
 * @param {object} options
 * @param {Actor}  options.actor
 * @param {number} options.dice                 Number of d6 to roll.
 * @param {"damage"|"armour"} [options.kind]    Whether these are wound or armour points.
 * @param {number} [options.weaponDice]         Weapon dice, for display.
 * @param {number} [options.victoryDice]        Victory dice included, for display.
 * @param {string} [options.label]
 * @param {string} [options.rollMode]
 * @returns {Promise<{roll: Roll, points: number, results: number[]}>}
 */
export async function effectRoll({
  actor, dice, kind = "damage", weaponDice = null, victoryDice = null, label, rollMode
} = {}) {
  const pool = Math.max(0, Math.round(dice ?? 0));
  const roll = new Roll(`${pool}d6`);
  await roll.evaluate();

  const results = roll.dice[0]?.results?.map(r => r.result) ?? [];
  const points = countEffectSuccesses(results);

  const context = {
    actorName: actor?.name ?? "",
    kind,
    isDamage: kind === "damage",
    label: label ?? null,
    pool,
    weaponDice,
    victoryDice,
    threshold: EFFECT_DIE_SUCCESS_THRESHOLD,
    results: results.map(r => ({ result: r, success: r <= EFFECT_DIE_SUCCESS_THRESHOLD })),
    points
  };

  const messageData = {
    speaker: ChatMessage.getSpeaker({ actor }),
    rolls: [roll],
    content: await renderTemplate("systems/fading-suns/templates/chat/effect-roll.hbs", context),
    flags: {
      "fading-suns": { kind: "effectRoll", effectKind: kind, points }
    }
  };

  await postMessage(messageData, rollMode);
  return { roll, points, results };
}

/**
 * Roll a weapon's damage, adding victory dice from a preceding attack (p.65).
 * @param {object} options
 * @param {Actor}  options.actor
 * @param {Item}   options.item
 * @param {number} [options.victoryDice=0]
 * @param {number|null} [options.pulledPunch=null]  Victory dice the attacker chooses to use.
 * @returns {Promise<object>}
 */
export async function damageRoll({ actor, item, victoryDice = 0, pulledPunch = null } = {}) {
  const pool = damagePool({
    weaponDice: item?.system.damage?.dice ?? 0,
    victoryDice,
    pulledPunch
  });
  return effectRoll({
    actor,
    dice: pool.total,
    kind: "damage",
    weaponDice: pool.weaponDice,
    victoryDice: pool.victoryDice,
    label: item?.name
  });
}

/**
 * Roll a suit of armour's protection dice (p.65). Victory dice never apply.
 * @param {object} options
 * @param {Actor} options.actor
 * @param {Item}  options.item
 * @returns {Promise<object>}
 */
export async function armourRoll({ actor, item } = {}) {
  return effectRoll({
    actor,
    dice: item?.system.protection?.dice ?? 0,
    kind: "armour",
    label: item?.name
  });
}
