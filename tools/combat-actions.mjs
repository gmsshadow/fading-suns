/**
 * Source data for the Combat Actions compendium (Core Rules p.164–p.180,
 * charted at p.292–p.295).
 *
 * "Combat actions are not skills so much as trained maneuvers that provide the
 *  character with bonuses or special effects. Combat actions themselves are not
 *  rolled, but are instead resolved using Fight, Melee or Shoot skills. They are
 *  rated by the level of the relevant skill required to learn them." (p.102)
 *
 * The level is what matters mechanically at creation: an action costs one Extra
 * point per level (p.88). Several firearms actions have no level at all — anyone
 * may attempt them — and are recorded here with level 0.
 *
 * Initiative, goal and damage are kept as the chart prints them, because several
 * are not plain numbers ("0/-1", "-1/m", "3+", "-3d"). The build derives numeric
 * modifiers alongside wherever the printed value is a plain integer.
 *
 * Fields:
 *   n     name
 *   lvl   level; 0 for actions available to anyone
 *   ch    characteristic rolled, as a dot path; null where no roll is made
 *   sk    skill rolled; null where no roll is made
 *   ini   initiative modifier as printed
 *   goal  goal modifier as printed
 *   dmg   damage as printed
 *   e     effect
 */

const F = "body.dexterity";

/* -------------------------------------------- */
/*  Martial Arts (p.292–293)                    */
/* -------------------------------------------- */

const MARTIAL_ARTS = [
  { n: "Martial Fist", lvl: 1, ch: F, sk: "Fight", ini: "-", goal: "-", dmg: "3" },
  { n: "Martial Kick", lvl: 2, ch: F, sk: "Fight", ini: "-1", goal: "-", dmg: "4" },
  { n: "Martial Hold", lvl: 3, ch: F, sk: "Fight", ini: "-1", goal: "-", dmg: "3", e: "On a success, roll Dexterity + Fight plus victory points against the target's Strength + Vigor. If that succeeds the target is grappled, and the attacker may deliver grapple damage each turn." },
  { n: "Head Butt", lvl: 3, ch: F, sk: "Fight", ini: "-2", goal: "1", dmg: "4", e: "The attacker takes any damage exceeding his Endurance." },
  { n: "Block", lvl: 4, ch: F, sk: "Fight", ini: "-", goal: "-", dmg: "-", e: "Works as Dodge. On a success, add three successes to resist attacks." },
  { n: "Confuse Foe", lvl: 4, ch: "mind.wits", sk: "Knavery", ini: "-", goal: "-", dmg: "-", e: "Reduces the opponent's block, dodge or parry by one per victory point, for the attacker's next action." },
  { n: "Disengage", lvl: 4, ch: F, sk: "Dodge", ini: "-1", goal: "1", dmg: "-", e: "Grants +3 to resist grapples." },
  { n: "Martial Throw", lvl: 4, ch: F, sk: "Fight", ini: "-2", goal: "-", dmg: "3", e: "On a success, roll Dexterity + Fight plus victory points against the target's Strength + Vigor. If that succeeds the target is thrown one metre per success, up to the attacker's Strength, taking an extra damage die per three metres thrown." },
  { n: "Rooting", lvl: 4, ch: F, sk: "Fight", ini: "-", goal: "-", dmg: "-", e: "Grants +3 to resist being knocked over." },
  { n: "Claw Fist", lvl: 5, ch: F, sk: "Fight", ini: "-", goal: "-", dmg: "4" },
  { n: "Drop & Kick", lvl: 5, ch: F, sk: "Fight", ini: "-", goal: "2", dmg: "4", e: "Initiative is reduced by two on the next action." },
  { n: "Tornado Kick", lvl: 5, ch: F, sk: "Fight", ini: "-1", goal: "-", dmg: "5" },
  { n: "Sure Fist", lvl: 6, ch: F, sk: "Fight", ini: "-2", goal: "2", dmg: "3" },
  { n: "Leaping Kick", lvl: 6, ch: F, sk: "Fight", ini: "-2", goal: "-1", dmg: "6" },
  { n: "Choke Hold", lvl: 6, ch: F, sk: "Fight", ini: "-3", goal: "-1", dmg: "4", e: "After three turns of grappling, roll Strength + Vigor against the target's Endurance + Vigor. On a success the target falls unconscious." },
  { n: "Bear Hug", lvl: 7, ch: F, sk: "Fight", ini: "-2", goal: "-1", dmg: "4", e: "Damage may be rolled each turn until the target escapes." },
  { n: "Iron Body", lvl: 7, ch: null, sk: null, ini: "-", goal: "-", dmg: "-", e: "Resolved by the defender's block. The attacking opponent takes one damage per victory point from the blocking roll." },
  { n: "Speed Fist", lvl: 7, ch: F, sk: "Fight", ini: "2", goal: "-", dmg: "3", e: "Adds three successes against dodges and blocks." },
  { n: "Trip Kick", lvl: 7, ch: F, sk: "Fight", ini: "-2", goal: "-1", dmg: "4", e: "Rolled against the target's Dexterity + Vigor. On a success the target is knocked down." },
  { n: "Throw Group", lvl: 7, ch: F, sk: "Fight", ini: "-2", goal: "-", dmg: "3", e: "Rolled against the target's attack roll. On a success the target is thrown one metre per success, up to the attacker's Strength, taking an extra damage die per three metres. One attacker may be thrown per point of Fight." },
  { n: "Block & Strike", lvl: 8, ch: F, sk: "Fight", ini: "-", goal: "+2/0", dmg: "-/3 or 4", e: "Blocks the opponent's attack. On a success, roll a Martial Fist or Martial Kick attack with no multiple action penalty." },
  { n: "Slide Kick", lvl: 8, ch: F, sk: "Fight", ini: "-2", goal: "-1", dmg: "5", e: "Compare the attacker's successes plus three against the target's Dexterity + Vigor roll. If the target loses, he is knocked down." },
  { n: "Power Fist", lvl: 9, ch: F, sk: "Fight", ini: "-", goal: "-1", dmg: "5", e: "Wyrd may be spent to add damage, one point per die, to a maximum of three." },
  { n: "Vital Strike", lvl: 10, ch: F, sk: "Fight", ini: "-3", goal: "-2", dmg: "3", e: "Roll Perception + Physick as a complementary skill and add its victory dice to the damage." }
];

/* -------------------------------------------- */
/*  Graa — the Vorox fighting style (p.293)     */
/* -------------------------------------------- */

const GRAA = [
  { n: "Banga (Charge)", lvl: 3, ch: F, sk: "Fight", ini: "-3", goal: "-", dmg: "3+", e: "On a success both attacker and target are knocked down. Add two damage dice per three metres charged." },
  { n: "Drox", lvl: 5, ch: F, sk: "Fight", ini: "-2", goal: "-", dmg: "-", e: "Allows a second action, using another limb, with no multiple action penalty." },
  { n: "Throx", lvl: 9, ch: F, sk: "Fight", ini: "-3", goal: "-", dmg: "-", e: "Allows a third action, using another limb, with no multiple action penalty." }
];

/* -------------------------------------------- */
/*  Fencing (p.294)                             */
/* -------------------------------------------- */

const FENCING = [
  { n: "Parry", lvl: 1, ch: F, sk: "Melee", ini: "-", goal: "2", dmg: "-", e: "Roll victory dice plus the weapon's damage dice as armour." },
  { n: "Thrust", lvl: 2, ch: F, sk: "Melee", ini: "2", goal: "-", dmg: "-" },
  { n: "Slash", lvl: 3, ch: F, sk: "Melee", ini: "-2", goal: "1", dmg: "-" },
  { n: "Counter Parry", lvl: 3, ch: "mind.wits", sk: "Melee", ini: "-", goal: "-", dmg: "-", e: "Eliminates the opponent's +2 parry bonus." },
  { n: "Fancy Footwork", lvl: 4, ch: F, sk: "Vigor", ini: "-", goal: "-", dmg: "-", e: "The opponent's goal is reduced by one per victory point." },
  { n: "Flat of Blade", lvl: 4, ch: F, sk: "Melee", ini: "-", goal: "-", dmg: "-3d", e: "No victory dice are added." },
  { n: "Draw & Strike", lvl: 4, ch: F, sk: "Melee", ini: "-2", goal: "-", dmg: "-", e: "Draw the sword and strike in the same action." },
  { n: "Compound Attack", lvl: 5, ch: F, sk: "Melee", ini: "-", goal: "-1", dmg: "-", e: "Next turn's goal is at +2." },
  { n: "Disarm", lvl: 5, ch: F, sk: "Melee", ini: "-2", goal: "-1", dmg: "-", e: "On a success, roll Dexterity + Melee plus victory points against the target's Strength + Melee. If that succeeds the target drops the blade, which may be thrown one metre per victory point. Can be learned separately for whips." },
  { n: "Feint", lvl: 5, ch: F, sk: "Melee", ini: "-2", goal: "-1", dmg: "-", e: "Adds three successes against dodges only." },
  { n: "Stop Thrust", lvl: 5, ch: F, sk: "Melee", ini: "3", goal: "-2", dmg: "-", e: "Reduces the opponent's goal by two." },
  { n: "Off-hand", lvl: 6, ch: F, sk: "Melee", ini: "-", goal: "-", dmg: "-", e: "No penalties are suffered for off-hand weapons." },
  { n: "Parry/Riposte", lvl: 6, ch: F, sk: "Melee", ini: "-", goal: "-2", dmg: "-", e: "Parries the opponent's attack. On a success, roll an attack with no multiple action penalty." },
  { n: "Snare", lvl: 6, ch: F, sk: "Melee", ini: "-", goal: "-", dmg: "-", e: "Whip users only." },
  { n: "Wall of Steel", lvl: 6, ch: F, sk: "Melee", ini: "-", goal: "-", dmg: "-", e: "Allows three parries." },
  { n: "Cloak", lvl: 7, ch: F, sk: "Melee", ini: "-", goal: "0/-1", dmg: "-", e: "Parries the opponent's attack with a cloak in the off-hand; armour equals victory points plus three, goal is 8 plus Strength. On a success the attacker may attempt a Disarm with no multiple action penalty. Can be learned separately for flails." },
  { n: "Florentine", lvl: 7, ch: F, sk: "Melee", ini: "-", goal: "-", dmg: "-", e: "One attack and one parry without multiple action penalties." },
  { n: "Athletic Strike", lvl: 8, ch: F, sk: "Melee", ini: "-3", goal: "-2", dmg: "-", e: "Performs an athletic feat — swinging from a chandelier and the like — in the same action with no multiple action penalty." },
  { n: "Pierce", lvl: 9, ch: F, sk: "Melee", ini: "-2", goal: "-3", dmg: "-", e: "Ignores the target's physical armour, though not energy shields." },
  { n: "Double Strike", lvl: 10, ch: F, sk: "Melee", ini: "-1", goal: "-1", dmg: "-", e: "Attack with the primary and off-hand weapon in the same action, rolling both attacks separately." }
];

/* -------------------------------------------- */
/*  Shield (p.294)                              */
/* -------------------------------------------- */

const SHIELD = [
  { n: "Shield Parry", lvl: 1, ch: F, sk: "Melee", ini: "-", goal: "-", dmg: "-", e: "Roll victory dice plus the shield's defence dice as armour." },
  { n: "Shield Attack", lvl: 2, ch: F, sk: "Melee", ini: "-1", goal: "-", dmg: "-", e: "Ram the shield into the target, inflicting the shield's damage." },
  { n: "Attack & Parry", lvl: 3, ch: F, sk: "Melee", ini: "-", goal: "-", dmg: "-", e: "Parry with the shield and attack in the same turn without multiple action penalties." }
];

/* -------------------------------------------- */
/*  Firearms (p.295)                            */
/* -------------------------------------------- */

// The first six have no level: anyone may attempt them.
const FIREARMS = [
  { n: "Aim", lvl: 0, ch: F, sk: "Shoot", ini: "-3", goal: "-", dmg: "-", e: "Adds +1 per turn, to a maximum of three, or more with a sight." },
  { n: "Hipshot", lvl: 0, ch: F, sk: "Shoot", ini: "2", goal: "-1", dmg: "-", e: "Only for the first shot of combat, with a handgun." },
  { n: "3-round Burst", lvl: 0, ch: F, sk: "Shoot", ini: "-", goal: "-", dmg: "1" },
  { n: "6-round Burst", lvl: 0, ch: F, sk: "Shoot", ini: "-1", goal: "-1", dmg: "3" },
  { n: "Empty Clip", lvl: 0, ch: F, sk: "Shoot", ini: "-1", goal: "-2", dmg: "5", e: "Adds three successes against dodges only." },
  { n: "Spread", lvl: 0, ch: F, sk: "Shoot", ini: "-2", goal: "-1/m", dmg: "4", e: "Spreads up to five metres; anyone in the targeted area must dodge or be hit." },
  { n: "Snapshot", lvl: 4, ch: F, sk: "Shoot", ini: "1", goal: "-2", dmg: "-", e: "May be performed with a dodge for no penalty, though no other actions may be taken that turn." },
  { n: "Quick Reload", lvl: 5, ch: null, sk: null, ini: "-", goal: "-", dmg: "-", e: "Reload a clip and fire with no multiple action penalty." },
  { n: "Quick Draw", lvl: 5, ch: F, sk: "Shoot", ini: "-2", goal: "-1", dmg: "-", e: "Draw the gun and fire in the same action." },
  { n: "Off-Hand Shot", lvl: 6, ch: null, sk: null, ini: "-", goal: "-", dmg: "-", e: "No penalties are suffered for an off-hand handgun." },
  { n: "Recock", lvl: 6, ch: F, sk: "Shoot", ini: "-2", goal: "-1", dmg: "-", e: "Recock a rifle or shotgun and fire in the same action." },
  { n: "Leap & Shoot", lvl: 7, ch: F, sk: "Shoot", ini: "-1", goal: "-1", dmg: "-", e: "Leap one metre in any direction." },
  { n: "Roll & Shoot", lvl: 8, ch: F, sk: "Shoot", ini: "-2", goal: "-1", dmg: "-", e: "Roll up to three metres in any direction." },
  { n: "Two Guns", lvl: 8, ch: F, sk: "Shoot", ini: "0/-1", goal: "-", dmg: "-", e: "One shot from each handgun, with no multiple action penalty." },
  { n: "Instinct Shot", lvl: 9, ch: F, sk: "Shoot", ini: "1", goal: "-1", dmg: "-", e: "Fire at an unseen target." }
];

/* -------------------------------------------- */

const tag = (entries, category) => entries.map(e => ({ ...e, cat: category }));

/** Every combat action charted in the core rules (p.292–p.295). */
export const COMBAT_ACTIONS = [
  ...tag(MARTIAL_ARTS, "martialArts"),
  ...tag(GRAA, "graa"),
  ...tag(FENCING, "fencing"),
  ...tag(SHIELD, "shield"),
  ...tag(FIREARMS, "firearms")
];
