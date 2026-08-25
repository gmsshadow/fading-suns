/**
 * Source data for the Blessings and Curses compendium (Core Rules p.115–p.116).
 *
 * Blessings add a positive modifier to a characteristic or skill in a specific
 * situation; Curses subtract one. The restriction — the situation that activates
 * the modifier — is part of the trait: "If the situation does not come into play,
 * then the character does not receive that modifier." (p.115)
 *
 * That is why these are stored as data the player ticks at roll time rather than
 * as Active Effects. An always-on effect would be wrong for all but the Size and
 * Appearance entries.
 *
 * Fields:
 *   n     name
 *   c     cost in points (always positive; Curses grant points rather than cost them)
 *   mods  [{ value, target, targetType }]  targetType: characteristic | skill | all
 *   r     restriction — the situation in which the modifier applies
 *   vit   modifier to base Vitality, where the trait changes it
 *   run   base run in metres, where the trait changes it
 *   note  anything else the trait does that is not a die modifier
 *   always  true when the modifier is not situational (Size, Appearance)
 */

const ch = (value, target) => ({ value, target, targetType: "characteristic" });
const sk = (value, target) => ({ value, target, targetType: "skill" });
const all = value => ({ value, target: "", targetType: "all" });

/* -------------------------------------------- */
/*  Appearance (p.115)                          */
/* -------------------------------------------- */

// "These modifiers always apply in situations involving social interaction and
//  are interracial." Applied to Charm rather than a characteristic.
const APPEARANCE = [
  { n: "Handsome", p: "blessing", c: 1, mods: [sk(1, "Charm")], r: "In social interaction", always: true },
  { n: "Beautiful", p: "blessing", c: 2, mods: [sk(2, "Charm")], r: "In social interaction", always: true },
  { n: "Angelic", p: "blessing", c: 3, mods: [sk(3, "Charm")], r: "In social interaction", always: true },
  { n: "Homely", p: "curse", c: 1, mods: [sk(-1, "Charm")], r: "In social interaction", always: true },
  { n: "Ugly", p: "curse", c: 2, mods: [sk(-2, "Charm")], r: "In social interaction", always: true },
  { n: "Monstrous", p: "curse", c: 3, mods: [sk(-3, "Charm")], r: "Unless seeking pity" }
];

/* -------------------------------------------- */
/*  Behavior (p.115–116)                        */
/* -------------------------------------------- */

const BEHAVIOR_BLESSINGS = [
  { n: "Bold", c: 2, mods: [ch(2, "spirit.passion")], r: "While acting when others hesitate" },
  { n: "Compassionate", c: 2, mods: [ch(2, "spirit.passion")], r: "When helping others" },
  { n: "Curious", c: 2, mods: [ch(2, "spirit.extrovert")], r: "When seeing something new" },
  { n: "Disciplined", c: 2, mods: [ch(2, "spirit.calm")], r: "In combat situations" },
  { n: "Gracious", c: 2, mods: [ch(2, "spirit.extrovert")], r: "To guests" },
  { n: "Innovative", c: 2, mods: [ch(2, "mind.tech")], r: "When trying to invent something new" },
  { n: "Just", c: 2, mods: [ch(2, "spirit.passion")], r: "When righting a wrong" },
  { n: "Loyal", c: 2, mods: [ch(2, "spirit.passion")], r: "When following liege" },
  { n: "Pious", c: 2, mods: [ch(2, "spirit.extrovert")], r: "Among the sinful" },
  { n: "Shrewd", c: 2, mods: [ch(2, "mind.wits")], r: "Against attempts to fast-talk" },
  { n: "Suspicious", c: 2, mods: [ch(2, "mind.perception")], r: "When rivals are about" },
  { n: "Unyielding", c: 2, mods: [ch(2, "body.endurance")], r: "When honour is at stake" }
];

const BEHAVIOR_CURSES = [
  { n: "Argumentative", c: 2, mods: [ch(-2, "spirit.extrovert")], r: "In conversation" },
  { n: "Austere", c: 2, mods: [ch(-2, "spirit.passion")], r: "Before members of the flock" },
  { n: "Bluster", c: 2, mods: [ch(-2, "spirit.extrovert")], r: "When recounting deeds" },
  { n: "Brainwashed", c: 2, mods: [ch(-2, "mind.wits")], r: "When confronted with something that contradicts the brainwashed belief" },
  { n: "Callous", c: 2, mods: [ch(-2, "spirit.passion")], r: "When asked for aid" },
  { n: "Clueless", c: 2, mods: [ch(-2, "mind.perception")], r: "Noticing social cues" },
  { n: "Condescending", c: 2, mods: [ch(-2, "spirit.extrovert")], r: "Among the unenlightened" },
  { n: "Delusional", c: 2, mods: [ch(-2, "mind.perception")], r: "When confronted with something that contradicts the delusional belief" },
  { n: "Disrespectful", c: 2, mods: [ch(-2, "spirit.extrovert")], r: "Around authority figures" },
  { n: "Greedy", c: 2, mods: [ch(-2, "spirit.calm")], r: "When money is involved" },
  { n: "Guilty", c: 2, mods: [all(-2)], r: "On all rolls when opposing Church officials" },
  { n: "Gullible", c: 2, mods: [ch(-2, "mind.wits")], r: "Against attempts to fast-talk" },
  { n: "Haughty", c: 2, mods: [ch(-2, "spirit.extrovert")], r: "Around serfs" },
  { n: "Impetuous", c: 2, mods: [ch(-2, "mind.wits")], r: "When trading" },
  { n: "Mammon", c: 2, mods: [ch(-2, "spirit.faith")], r: "When money is involved" },
  { n: "Nosy", c: 2, mods: [ch(-2, "spirit.calm")], r: "When seeing something new" },
  { n: "Phobic", c: 2, mods: [ch(-2, "spirit.calm")], r: "Around the source of the phobia" },
  { n: "Possessive", c: 2, mods: [ch(-2, "spirit.calm")], r: "When cut out of the action" },
  { n: "Prideful", c: 2, mods: [ch(-2, "spirit.calm")], r: "When insulted" },
  { n: "Righteous", c: 2, mods: [ch(-2, "spirit.calm")], r: "When judgment is questioned" },
  { n: "Secretive", c: 2, mods: [ch(-2, "spirit.extrovert")], r: "Around strangers" },
  { n: "Subtle", c: 2, mods: [ch(-2, "spirit.extrovert")], r: "When explaining something" },
  { n: "Surly", c: 2, mods: [ch(-2, "spirit.extrovert")], r: "When upset" },
  { n: "Uncouth", c: 2, mods: [ch(-2, "spirit.extrovert")], r: "At society functions" },
  { n: "Unnerving", c: 2, mods: [ch(-2, "spirit.extrovert")], r: "Around superstitious people" },
  { n: "Vain", c: 1, mods: [ch(-1, "mind.perception")], r: "When being flattered" },
  { n: "Vengeful", c: 3, mods: [ch(-3, "spirit.calm")], r: "When honour is impinged; never forgets a slight" }
];

/* -------------------------------------------- */
/*  Injuries (p.116) — Curses only              */
/* -------------------------------------------- */

const INJURIES = [
  { n: "Bad Heart", c: 2, mods: [ch(-2, "body.endurance")], r: "With athletic tasks" },
  { n: "Bad Liver", c: 2, mods: [ch(-2, "body.endurance")], r: "Against toxins" },
  { n: "Bad Lungs", c: 1, mods: [ch(-1, "body.endurance")], r: "With athletic tasks" },
  { n: "Horrible Scar or Burn", c: 2, mods: [sk(-2, "Charm")], r: "When the scar is visible" },
  { n: "Incurable Disease", c: 3, mods: [], r: "Always", vit: -1, always: true, note: "Reduces base Vitality by one." },
  { n: "Limp", c: 1, mods: [], r: "Always", run: 8, always: true, note: "Base run is reduced to 8 metres." },
  { n: "Missing Arm", c: 4, mods: [ch(-4, "body.dexterity")], r: "For tasks requiring two arms" },
  { n: "Missing Eye", c: 3, mods: [ch(-2, "mind.perception"), sk(-1, "Shoot")], r: "Always", always: true, note: "Limited field of vision and poor depth perception." },
  { n: "Missing Leg", c: 4, mods: [sk(-2, "Dodge")], r: "Always", run: 2, always: true, note: "Base run is reduced to 2 metres." },
  { n: "Pain Sensitive", c: 4, mods: [all(-2)], r: "For two turns after being wounded" },
  { n: "Shaky Hands", c: 2, mods: [ch(-2, "body.dexterity")], r: "With fine manipulation" }
];

/* -------------------------------------------- */
/*  Knacks (p.116)                              */
/* -------------------------------------------- */

const KNACK_BLESSINGS = [
  { n: "Ambidextrous", c: 4, mods: [all(4)], r: "To offset the -4 penalty for an off-hand weapon" },
  { n: "Beastmaster", c: 2, mods: [all(2)], r: "For non-combat interaction with animals" },
  { n: "Born Salesman", c: 2, mods: [ch(2, "spirit.extrovert")], r: "When selling" },
  { n: "Casanova", c: 2, mods: [ch(2, "spirit.passion")], r: "When seducing others" },
  { n: "Compass", c: 2, mods: [ch(2, "mind.wits")], r: "When working out direction or location" },
  { n: "Crack Driver/Pilot", c: 4, mods: [all(2)], r: "With all Drive skills" },
  { n: "Eloquent", c: 2, mods: [ch(2, "spirit.extrovert")], r: "When swaying others through speech" },
  { n: "Fast Draw", c: 2, mods: [all(2)], r: "Initiative when drawing and firing a gun in the same action" },
  { n: "Grease Monkey", c: 4, mods: [all(2)], r: "With all Tech Redemption skills" },
  { n: "Hacker", c: 2, mods: [all(2)], r: "With all think machine tasks" },
  { n: "Keen Ears", c: 2, mods: [ch(2, "mind.perception")], r: "With hearing only" },
  { n: "Keen Eyes", c: 2, mods: [ch(2, "mind.perception")], r: "With sight only" },
  { n: "Lucky at Cards", c: 2, mods: [sk(2, "Gambling")], r: "With cards" },
  { n: "Sensitive Smell", c: 1, mods: [ch(2, "mind.perception")], r: "With smell only" },
  { n: "Sensitive Touch", c: 1, mods: [ch(2, "mind.perception")], r: "To discern touched objects" },
  { n: "Sonorous", c: 2, mods: [ch(2, "spirit.extrovert")], r: "When impressing others through speech" },
  { n: "The Man", c: 2, mods: [sk(2, "Impress")], r: "When leading underlings" },
  { n: "Thrifty", c: 2, mods: [ch(2, "mind.wits")], r: "In money matters" }
];

const KNACK_CURSES = [
  { n: "Bad Hearing", c: 2, mods: [ch(-2, "mind.perception")], r: "With hearing only" },
  { n: "Bad Vision", c: 2, mods: [ch(-2, "mind.perception")], r: "With sight only" },
  { n: "Beast Foe", c: 2, mods: [all(-2)], r: "For non-combat interaction with animals" },
  { n: "Clumsy", c: 2, mods: [ch(-2, "body.dexterity")], r: "With athletic tasks" },
  { n: "Mechanically Disinclined", c: 2, mods: [all(-2)], r: "With all Tech Redemption skills" },
  { n: "Poor Liar", c: 2, mods: [ch(-2, "mind.wits")], r: "When lying" },
  { n: "Quasimodo", c: 2, mods: [ch(-2, "spirit.passion")], r: "When seducing others" }
];

/* -------------------------------------------- */
/*  Reputation (p.116)                          */
/* -------------------------------------------- */

const REPUTATION = [
  { n: "Well-liked", p: "blessing", c: 1, mods: [sk(1, "Charm")], r: "Among those who know the character's reputation" },
  { n: "Charitable", p: "blessing", c: 2, mods: [sk(2, "Charm")], r: "Among those who know the character's reputation" },
  { n: "Honest", p: "blessing", c: 2, mods: [ch(2, "spirit.extrovert")], r: "Among those who know the character's reputation" },
  { n: "Hero", p: "blessing", c: 2, mods: [sk(2, "Impress")], r: "Among those who know the character's reputation" },
  { n: "Cad", p: "curse", c: 2, mods: [sk(-2, "Charm")], r: "Among those who know the character's reputation" },
  { n: "Scary", p: "curse", c: 2, mods: [ch(-2, "spirit.extrovert")], r: "Among those who know the character's reputation" },
  { n: "Liar or Known Criminal", p: "curse", c: 2, mods: [sk(-2, "Knavery")], r: "Among those who know the character's reputation" },
  { n: "Tyrant", p: "curse", c: 2, mods: [sk(-2, "Charm")], r: "Among peasants" }
];

/* -------------------------------------------- */
/*  Size (p.116) — always in effect             */
/* -------------------------------------------- */

const SIZE = [
  { n: "Dwarf", p: "curse", c: 5, mods: [], r: "Always", vit: -2, run: 6, always: true, note: "Requires tailored clothing." },
  { n: "Short", p: "curse", c: 3, mods: [], r: "Always", vit: -1, run: 8, always: true },
  { n: "Tall", p: "blessing", c: 3, mods: [], r: "Always", vit: 1, run: 12, always: true },
  { n: "Giant", p: "blessing", c: 5, mods: [], r: "Always", vit: 2, run: 14, always: true, note: "Requires tailored clothing." }
];

/* -------------------------------------------- */

const tag = (entries, category, polarity) =>
  entries.map(e => ({ ...e, category, p: e.p ?? polarity }));

/** Every Blessing and Curse in the core rules, p.115–p.116. */
export const BLESSINGS_AND_CURSES = [
  ...tag(APPEARANCE, "appearance"),
  ...tag(BEHAVIOR_BLESSINGS, "behavior", "blessing"),
  ...tag(BEHAVIOR_CURSES, "behavior", "curse"),
  ...tag(INJURIES, "injury", "curse"),
  ...tag(KNACK_BLESSINGS, "knack", "blessing"),
  ...tag(KNACK_CURSES, "knack", "curse"),
  ...tag(REPUTATION, "reputation"),
  ...tag(SIZE, "size")
];
