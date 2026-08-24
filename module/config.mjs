/**
 * Fading Suns 2nd Edition Revised — system configuration.
 * Exposed at CONFIG.FADING_SUNS so that world scripts and modules can extend it.
 */

export const FADING_SUNS = {};

/* -------------------------------------------- */
/*  Characteristics (p.93)                      */
/* -------------------------------------------- */

/** Body characteristics. */
FADING_SUNS.body = {
  strength: "FADINGSUNS.Characteristic.Strength",
  dexterity: "FADINGSUNS.Characteristic.Dexterity",
  endurance: "FADINGSUNS.Characteristic.Endurance"
};

/** Mind characteristics. */
FADING_SUNS.mind = {
  wits: "FADINGSUNS.Characteristic.Wits",
  perception: "FADINGSUNS.Characteristic.Perception",
  tech: "FADINGSUNS.Characteristic.Tech"
};

/**
 * Spirit characteristics, arranged in opposed pairs (p.93).
 * Within each pair one trait is primary and starts at 3; the other starts at 1.
 */
FADING_SUNS.spirit = {
  extrovert: "FADINGSUNS.Characteristic.Extrovert",
  introvert: "FADINGSUNS.Characteristic.Introvert",
  passion: "FADINGSUNS.Characteristic.Passion",
  calm: "FADINGSUNS.Characteristic.Calm",
  faith: "FADINGSUNS.Characteristic.Faith",
  ego: "FADINGSUNS.Characteristic.Ego"
};

/** The three opposed Spirit trait pairs, in sheet display order. */
FADING_SUNS.spiritPairs = [
  { primary: "extrovert", opposed: "introvert" },
  { primary: "passion", opposed: "calm" },
  { primary: "faith", opposed: "ego" }
];

/** Occult characteristics (p.128, p.143, p.160). */
FADING_SUNS.occult = {
  psi: "FADINGSUNS.Characteristic.Psi",
  urge: "FADINGSUNS.Characteristic.Urge",
  theurgy: "FADINGSUNS.Characteristic.Theurgy",
  hubris: "FADINGSUNS.Characteristic.Hubris"
};

/**
 * Every characteristic that may be paired with a skill for a Goal Roll,
 * keyed by its dot path beneath `system`.
 */
FADING_SUNS.rollableCharacteristics = {
  "body.strength": FADING_SUNS.body.strength,
  "body.dexterity": FADING_SUNS.body.dexterity,
  "body.endurance": FADING_SUNS.body.endurance,
  "mind.wits": FADING_SUNS.mind.wits,
  "mind.perception": FADING_SUNS.mind.perception,
  "mind.tech": FADING_SUNS.mind.tech,
  "spirit.extrovert": FADING_SUNS.spirit.extrovert,
  "spirit.introvert": FADING_SUNS.spirit.introvert,
  "spirit.passion": FADING_SUNS.spirit.passion,
  "spirit.calm": FADING_SUNS.spirit.calm,
  "spirit.faith": FADING_SUNS.spirit.faith,
  "spirit.ego": FADING_SUNS.spirit.ego,
  "occult.psi": FADING_SUNS.occult.psi,
  "occult.theurgy": FADING_SUNS.occult.theurgy
};

/* -------------------------------------------- */
/*  Skills (p.97, p.99)                         */
/* -------------------------------------------- */

/** Skill categories. */
FADING_SUNS.skillTypes = {
  natural: "FADINGSUNS.SkillType.Natural",
  learned: "FADINGSUNS.SkillType.Learned"
};

/**
 * The nine natural skills (p.97). Every character begins with 3 in each of these.
 * The paired characteristic given here is the most common default; the gamemaster
 * may call for any characteristic depending on the situation.
 */
FADING_SUNS.naturalSkills = {
  Charm: "spirit.extrovert",
  Dodge: "body.dexterity",
  Fight: "body.dexterity",
  Impress: "spirit.passion",
  Melee: "body.dexterity",
  Observe: "mind.perception",
  Shoot: "body.dexterity",
  Sneak: "body.dexterity",
  Vigor: "body.strength"
};

/* -------------------------------------------- */
/*  Difficulty modifiers (p.64)                 */
/* -------------------------------------------- */

/** The standard Bonuses and Penalties chart (p.64). */
FADING_SUNS.difficulties = {
  10: "FADINGSUNS.Difficulty.Effortless",
  8: "FADINGSUNS.Difficulty.ChildsPlay",
  6: "FADINGSUNS.Difficulty.PieceOfCake",
  4: "FADINGSUNS.Difficulty.Easy",
  2: "FADINGSUNS.Difficulty.Natural",
  0: "FADINGSUNS.Difficulty.Average",
  "-2": "FADINGSUNS.Difficulty.Hard",
  "-4": "FADINGSUNS.Difficulty.Demanding",
  "-6": "FADINGSUNS.Difficulty.Tough",
  "-8": "FADINGSUNS.Difficulty.Severe",
  "-10": "FADINGSUNS.Difficulty.Herculean"
};

/* -------------------------------------------- */
/*  Equipment                                   */
/* -------------------------------------------- */

/** Damage categories for weapons. */
FADING_SUNS.damageTypes = {
  wound: "FADINGSUNS.DamageType.Wound",
  energy: "FADINGSUNS.DamageType.Energy",
  stun: "FADINGSUNS.DamageType.Stun"
};

/** Broad weapon categories, which determine the default attack skill. */
FADING_SUNS.weaponTypes = {
  melee: "FADINGSUNS.WeaponType.Melee",
  fight: "FADINGSUNS.WeaponType.Fight",
  ranged: "FADINGSUNS.WeaponType.Ranged",
  thrown: "FADINGSUNS.WeaponType.Thrown"
};

/** Default characteristic and skill pairings per weapon category. */
FADING_SUNS.weaponDefaults = {
  melee: { characteristic: "body.dexterity", skill: "Melee" },
  fight: { characteristic: "body.dexterity", skill: "Fight" },
  ranged: { characteristic: "body.dexterity", skill: "Shoot" },
  thrown: { characteristic: "body.dexterity", skill: "Throwing" }
};

/** Armour coverage areas. */
FADING_SUNS.armourCoverage = {
  full: "FADINGSUNS.Coverage.Full",
  body: "FADINGSUNS.Coverage.Body",
  torso: "FADINGSUNS.Coverage.Torso",
  head: "FADINGSUNS.Coverage.Head",
  arms: "FADINGSUNS.Coverage.Arms",
  legs: "FADINGSUNS.Coverage.Legs"
};

/** Psychic paths (p.128). */
FADING_SUNS.psiPaths = {
  farHand: "FADINGSUNS.PsiPath.FarHand",
  soma: "FADINGSUNS.PsiPath.Soma",
  sixthSense: "FADINGSUNS.PsiPath.SixthSense",
  psyche: "FADINGSUNS.PsiPath.Psyche",
  everForm: "FADINGSUNS.PsiPath.EverForm",
  fireDance: "FADINGSUNS.PsiPath.FireDance",
  omen: "FADINGSUNS.PsiPath.Omen",
  sympathy: "FADINGSUNS.PsiPath.Sympathy",
  vis: "FADINGSUNS.PsiPath.Vis"
};

/** Wyrd derivation, by occult path (p.125). */
FADING_SUNS.wyrdSources = {
  mundane: "FADINGSUNS.WyrdSource.Mundane",
  psi: "FADINGSUNS.WyrdSource.Psi",
  theurgy: "FADINGSUNS.WyrdSource.Theurgy"
};

/* -------------------------------------------- */
/*  Blessings and Curses (p.115)                */
/* -------------------------------------------- */

FADING_SUNS.blessingPolarities = {
  blessing: "FADINGSUNS.Blessing.Blessing",
  curse: "FADINGSUNS.Blessing.Curse"
};

FADING_SUNS.blessingCategories = {
  appearance: "FADINGSUNS.Blessing.Appearance",
  behavior: "FADINGSUNS.Blessing.Behaviour",
  injury: "FADINGSUNS.Blessing.Injury",
  knack: "FADINGSUNS.Blessing.Knack",
  reputation: "FADINGSUNS.Blessing.Reputation",
  size: "FADINGSUNS.Blessing.Size"
};

FADING_SUNS.modifierTargets = {
  characteristic: "FADINGSUNS.Blessing.TargetCharacteristic",
  skill: "FADINGSUNS.Blessing.TargetSkill",
  all: "FADINGSUNS.Blessing.TargetAll"
};

/* -------------------------------------------- */
/*  Benefices and Afflictions (p.117)           */
/* -------------------------------------------- */

FADING_SUNS.beneficePolarities = {
  benefice: "FADINGSUNS.Benefice.Benefice",
  affliction: "FADINGSUNS.Benefice.Affliction"
};

FADING_SUNS.beneficeCategories = {
  background: "FADINGSUNS.Benefice.Background",
  community: "FADINGSUNS.Benefice.Community",
  possessions: "FADINGSUNS.Benefice.Possessions",
  artifacts: "FADINGSUNS.Benefice.Artifacts",
  riches: "FADINGSUNS.Benefice.Riches",
  status: "FADINGSUNS.Benefice.Status"
};

/**
 * Points of Benefices every character begins with.
 *
 * The rulebook gives two figures: Step Five of the creation procedure says ten
 * (p.88), while the Benefices chapter says five (p.117). Ten is the default
 * because Step Five is the procedure being followed, but the world setting
 * "beneficePoints" overrides it.
 */
FADING_SUNS.startingBeneficePoints = 10;

/** Extra points every character receives at Step Six (p.88). */
FADING_SUNS.startingExtraPoints = 40;

/* -------------------------------------------- */
/*  Character Histories (p.72)                  */
/* -------------------------------------------- */

FADING_SUNS.stageTypes = {
  upbringing: "FADINGSUNS.Stage.Upbringing",
  apprenticeship: "FADINGSUNS.Stage.Apprenticeship",
  earlyCareer: "FADINGSUNS.Stage.EarlyCareer",
  tourOfDuty: "FADINGSUNS.Stage.TourOfDuty",
  extra: "FADINGSUNS.Stage.Extra"
};

FADING_SUNS.factions = {
  noble: "FADINGSUNS.Faction.Noble",
  priest: "FADINGSUNS.Faction.Priest",
  merchant: "FADINGSUNS.Faction.Merchant",
  alien: "FADINGSUNS.Faction.Alien"
};

/** Points each stage represents (p.88). Mirrors STAGE_BUDGET in the lifepath engine. */
FADING_SUNS.stageBudgets = {
  upbringing: { characteristics: 5, skills: 5 },
  apprenticeship: { characteristics: 5, skills: 10 },
  earlyCareer: { characteristics: 10, skills: 15 }
};

/* -------------------------------------------- */
/*  Combat Actions (p.102, p.292)               */
/* -------------------------------------------- */

FADING_SUNS.combatActionCategories = {
  martialArts: "FADINGSUNS.CombatAction.MartialArts",
  fencing: "FADINGSUNS.CombatAction.Fencing",
  shield: "FADINGSUNS.CombatAction.Shield",
  firearms: "FADINGSUNS.CombatAction.Firearms",
  graa: "FADINGSUNS.CombatAction.Graa"
};

/**
 * "Suggested Benefices" printed for each faction as a whole (p.72–p.85).
 * Stage-level suggestions, which vary by house or sect, live on the stage items.
 */
FADING_SUNS.factionBenefices = {
  noble: [
    { label: "Nobility", key: "Nobility" },
    { label: "Riches", key: null }
  ],
  priest: [],
  merchant: [],
  alien: []
};
