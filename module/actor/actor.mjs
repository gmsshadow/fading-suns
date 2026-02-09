/**
 * Extend the base Actor document
 */
export class FadingSunsActor extends Actor {

  /** @override */
  prepareData() {
    super.prepareData();
  }

  /** @override */
  prepareDerivedData() {
    const actorData = this;
    const systemData = actorData.system;

    // Calculate Vitality max (5 + Endurance)
    if (systemData.body?.endurance) {
      systemData.vitality.max = 5 + systemData.body.endurance.value;
      // Make sure current doesn't exceed max
      if (systemData.vitality.value > systemData.vitality.max) {
        systemData.vitality.value = systemData.vitality.max;
      }
    }
  }

  /**
   * Roll a characteristic + skill check
   * @param {string} characteristic - The characteristic to use (e.g., "dexterity")
   * @param {string} skillName - The name of the skill (optional)
   * @param {number} modifier - Additional modifier to the roll
   */
  async rollCheck(characteristic, skillName = null, modifier = 0) {
    const actor = this;
    const systemData = actor.system;

    // Get characteristic value
    let charValue = 0;
    const charParts = characteristic.split('.');
    
    if (charParts.length === 2) {
      // e.g., "body.strength"
      const category = charParts[0];
      const charName = charParts[1];
      charValue = systemData[category]?.[charName]?.value || 0;
    } else {
      // Try to find it in any category
      for (const category of ['body', 'mind', 'spirit', 'occult']) {
        if (systemData[category]?.[characteristic]) {
          charValue = systemData[category][characteristic].value;
          break;
        }
      }
    }

    // Get skill value from owned items
    let skillValue = 0;
    if (skillName) {
      const skillItem = actor.items.find(i => 
        i.type === 'skill' && 
        i.name.toLowerCase() === skillName.toLowerCase()
      );
      skillValue = skillItem?.system.value || 0;
    }

    // Calculate goal number
    const goalNumber = charValue + skillValue + modifier;

    // Create roll formula
    const roll = new Roll("1d20");
    await roll.evaluate();

    // Determine success
    const diceResult = roll.total;
    const isSuccess = diceResult <= goalNumber;
    const isCriticalSuccess = diceResult === goalNumber && goalNumber <= 20;
    const isCriticalFailure = diceResult === 20;
    const isAutoSuccess = diceResult === 1;

    // Calculate victory points
    let victoryPoints = 0;
    if (isSuccess || isAutoSuccess) {
      if (isAutoSuccess) {
        victoryPoints = 1;
      } else if (isCriticalSuccess) {
        victoryPoints = this._getVictoryPoints(diceResult) * 2;
      } else {
        victoryPoints = this._getVictoryPoints(diceResult);
      }
    }

    // Create chat message
    const chatData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      roll: roll,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      content: await renderTemplate("systems/fading-suns/templates/chat/roll-check.hbs", {
        actor: actor.name,
        characteristic: characteristic,
        charValue: charValue,
        skillName: skillName,
        skillValue: skillValue,
        modifier: modifier,
        goalNumber: goalNumber,
        diceResult: diceResult,
        isSuccess: isSuccess,
        isCriticalSuccess: isCriticalSuccess,
        isCriticalFailure: isCriticalFailure,
        isAutoSuccess: isAutoSuccess,
        victoryPoints: victoryPoints,
        accomplishment: this._getAccomplishment(victoryPoints)
      })
    };

    ChatMessage.create(chatData);
    return roll;
  }

  /**
   * Convert successes to victory points based on the Victory Chart
   */
  _getVictoryPoints(successes) {
    if (successes <= 2) return 1;
    if (successes <= 5) return 1;
    if (successes <= 8) return 2;
    if (successes <= 11) return 3;
    if (successes <= 14) return 4;
    if (successes <= 17) return 5;
    if (successes <= 20) return 6;
    return 6;
  }

  /**
   * Get accomplishment description
   */
  _getAccomplishment(victoryPoints) {
    const accomplishments = [
      "Failure",
      "Barely satisfactory",
      "Mediocre",
      "Pretty good",
      "Good job",
      "Excellent",
      "Brilliant",
      "Virtuoso performance"
    ];
    return accomplishments[Math.min(victoryPoints, 7)] || accomplishments[0];
  }
}
