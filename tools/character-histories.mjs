/**
 * Source data for the Character Histories compendium (Core Rules p.72–p.85).
 *
 * The noble faction, complete: fifteen Upbringings (three settings for each of
 * the five royal houses), the six noble Apprenticeships and the five noble Early
 * Careers. Apprenticeships and Early Careers are shared across all five houses,
 * so only the Upbringings vary by house.
 *
 * Blessings, Curses and Benefices are referenced by name and resolved to their
 * compendium uuids at build time, so the references cannot drift.
 *
 * Grant shorthand:
 *   ch(key, n)          characteristic delta
 *   pri(key, n)         characteristic delta that also marks the trait primary
 *   sk(name, n)         skill delta
 *   sp(name, spec, n)   skill delta against a specialty
 *   lang(name, spec, p) a language costing p points, refundable if already known
 *   bless(name)  curse(name)  ben(name, rank)
 *   action(name)        a Combat Action, costed at its level (p.102)
 *   wyrd(n)             raises the Wyrd maximum by n
 *   note(text)          something not yet modelled, recorded for the player
 *   pickOne(id, label, ...options)   an enumerated choice
 *   pickN(id, label, n, ...options)  an enumerated choice picking several
 *   open(id, label, pool, n, [f])    an open choice worth n points, optionally narrowed
 *                       to skills whose name begins with one of the prefixes f
 *   opt(label, ...grants)            one option within a choice
 */

const ch = (key, value) => ({ kind: "characteristic", key, value });
const pri = (key, value) => ({ kind: "characteristic", key, value, primary: true });
const sk = (key, value) => ({ kind: "skill", key, value });
const sp = (key, specialty, value) => ({ kind: "skill", key, specialty, value });
const lang = (key, specialty, points) => ({ kind: "language", key, specialty, value: 1, points });
const bless = key => ({ kind: "blessing", key });
const curse = key => ({ kind: "curse", key });
const ben = (key, value) => ({ kind: "benefice", key, value });
const note = text => ({ kind: "note", text });
const action = name => ({ kind: "combatAction", key: name });
const wyrd = value => ({ kind: "wyrd", value });

const opt = (label, ...grants) => ({ label, grants });
const pickOne = (id, label, ...options) => ({ kind: "choice", id, label, pick: 1, options });
const pickN = (id, label, pick, ...options) => ({ kind: "choice", id, label, pick, options });
const open = (id, label, pool, value, filter) => ({ kind: "choice", id, label, pick: 1, pool, value, filter });

/**
 * A Tour of Duty's two free characteristic levels (p.84).
 *
 * "Characteristic (choose one) +1, Characteristic (choose another) +1" — two
 * levels, in two different traits, at no cost in Extra points. That is a choice
 * rather than a budget, so it is modelled as one: the second picker excludes
 * whatever the first took.
 *
 * @param {string} owner
 * @returns {object[]}
 */
const tourCharacteristics = owner => [
  { ...open(`${owner}-char-1`, "Characteristic (choose one) +1", "characteristic", 1) },
  {
    ...open(`${owner}-char-2`, "Characteristic (choose another) +1", "characteristic", 1),
    distinctFrom: `${owner}-char-1`
  }
];

/** "Extrovert or Introvert +1" and friends, which recur across many stages. */
const orSpirit = (id, a, b, value) => pickOne(
  id, `${a} or ${b} +${value}`,
  opt(a, ch(`spirit.${a.toLowerCase()}`, value)),
  opt(b, ch(`spirit.${b.toLowerCase()}`, value))
);

/* -------------------------------------------- */
/*  Upbringing — the five royal houses (p.73–74) */
/* -------------------------------------------- */

/**
 * Each house's Blessing and Curse pair, which is the same across all three of
 * its Upbringings (p.73).
 */
const HOUSE_TRAITS = {
  Hawkwood: [bless("Unyielding"), curse("Prideful")],
  Decados: [bless("Suspicious"), curse("Vain")],
  Hazat: [bless("Disciplined"), curse("Vengeful")],
  "Li Halan": [bless("Pious"), curse("Guilty")],
  "al-Malik": [bless("Gracious"), curse("Impetuous")]
};

/**
 * "Suggested Benefices" as printed beside each house (p.72–73). Only Li Halan
 * and al-Malik carry one; the other three houses are covered by the noble
 * faction's general suggestion of Nobility and Riches.
 *
 * `key` names an entry in the Benefices compendium, resolved to a uuid at build
 * time. A null key is a category rather than an entry, so it is shown as advice
 * without a link.
 */
const NOBLE_BENEFICES = [
  { label: "Nobility", key: "Nobility", value: 3 },
  { label: "Riches", key: "Cash", value: 1, note: "Or any other form of Riches" }
];

const HOUSE_BENEFICES = {
  Hawkwood: [],
  Decados: [],
  Hazat: [],
  "Li Halan": [{ label: "Church Ally (1-11 pts)", key: "Ally", value: 1 }],
  "al-Malik": [{ label: "Passage Contract (8 pts)", key: "Passage Contracts", value: 8 }]
};

const SETTINGS = {
  "High-Court": "Raised in a palace among servants and tutors, watched closely and held to high expectations — but present when foreign visitors call and famous things happen.",
  "Rural Estate": "Raised in a manor or castle, far from high-court but well above the lot of freemen. Tutors divide their time, leaving the child to find her own way.",
  "Landless": "The family is landless and lives on the charity of other nobles. Many homes in one childhood, and the insults of higher-born children to answer."
};

/**
 * Build one house's Upbringing.
 * @param {string} house
 * @param {string} setting
 * @param {object[]} grants   Characteristic and skill grants, without the house traits.
 * @returns {object}
 */
const upbringing = (house, setting, grants) => ({
  n: `${setting} (${house})`,
  stage: "upbringing",
  faction: "noble",
  group: house,
  d: SETTINGS[setting],
  grants: [...grants, ...HOUSE_TRAITS[house]],
  suggested: [...NOBLE_BENEFICES, ...HOUSE_BENEFICES[house]]
});

/** Shorthand for the choice ids, which must be unique across the whole pack. */
const cid = (house, setting, what) =>
  `${house}-${setting}-${what}`.toLowerCase().replace(/[^a-z0-9-]+/g, "");

const UPBRINGING = [

  // ---- High-Court ----
  upbringing("Hawkwood", "High-Court", [
    ch("body.strength", 1), ch("body.dexterity", 1), ch("mind.wits", 1),
    pri("spirit.extrovert", 2),
    sk("Melee", 1), sk("Etiquette", 1), sp("Lore", "Heraldry", 1), lang("Read", "Urthish", 2)
  ]),
  upbringing("Decados", "High-Court", [
    ch("body.dexterity", 1), ch("mind.perception", 2), pri("spirit.ego", 2),
    sk("Etiquette", 1), sp("Lore", "Rival House", 1), sk("Inquiry", 1), lang("Read", "Urthish", 2)
  ]),
  upbringing("Hazat", "High-Court", [
    ch("body.endurance", 1), ch("mind.perception", 2), pri("spirit.passion", 2),
    sk("Impress", 1), sk("Melee", 1), sk("Etiquette", 1), lang("Read", "Urthish", 2)
  ]),
  upbringing("Li Halan", "High-Court", [
    ch("mind.wits", 1),
    orSpirit(cid("lihalan", "hc", "social"), "Extrovert", "Introvert", 1),
    orSpirit(cid("lihalan", "hc", "temper"), "Passion", "Calm", 1),
    pri("spirit.faith", 2),
    sk("Etiquette", 1), sk("Focus", 1), sp("Lore", "Theology", 1), lang("Read", "Latin", 2)
  ]),
  upbringing("al-Malik", "High-Court", [
    ch("body.dexterity", 1), ch("mind.wits", 1),
    orSpirit(cid("almalik", "hc", "social"), "Extrovert", "Introvert", 1),
    pri("spirit.calm", 2),
    sk("Etiquette", 1), lang("Speak", "Graceful Tongue", 2), lang("Read", "Urthish", 2)
  ]),

  // ---- Rural Estate ----
  upbringing("Hawkwood", "Rural Estate", [
    ch("body.strength", 2), ch("body.dexterity", 1), ch("mind.wits", 1),
    pri("spirit.extrovert", 1),
    sk("Etiquette", 1), sp("Lore", "Fief", 1), lang("Read", "Urthish", 2), sk("Ride", 1)
  ]),
  upbringing("Decados", "Rural Estate", [
    ch("body.dexterity", 2), ch("mind.perception", 2), pri("spirit.ego", 1),
    sk("Etiquette", 1), sp("Lore", "Rival House", 1), sk("Knavery", 1), lang("Read", "Urthish", 2)
  ]),
  upbringing("Hazat", "Rural Estate", [
    ch("body.endurance", 2), ch("mind.perception", 2), pri("spirit.passion", 1),
    sk("Impress", 1), sk("Melee", 1), sk("Etiquette", 1), lang("Read", "Urthish", 2)
  ]),
  upbringing("Li Halan", "Rural Estate", [
    ch("mind.wits", 1),
    orSpirit(cid("lihalan", "re", "social"), "Extrovert", "Introvert", 1),
    orSpirit(cid("lihalan", "re", "temper"), "Passion", "Calm", 1),
    pri("spirit.faith", 2),
    sk("Etiquette", 1), sk("Focus", 1), sp("Lore", "Theology", 1), lang("Read", "Latin", 2)
  ]),
  upbringing("al-Malik", "Rural Estate", [
    ch("body.dexterity", 2), ch("mind.wits", 1),
    orSpirit(cid("almalik", "re", "social"), "Extrovert", "Introvert", 1),
    pri("spirit.calm", 1),
    sk("Melee", 1), sk("Inquiry", 1), sp("Lore", "Trading", 1), lang("Speak", "Graceful Tongue", 2)
  ]),

  // ---- Landless ----
  upbringing("Hawkwood", "Landless", [
    ch("body.strength", 1), ch("body.dexterity", 2), ch("mind.wits", 1),
    pri("spirit.extrovert", 1),
    sk("Impress", 1), sk("Vigor", 1), sk("Melee", 2), sk("Ride", 1)
  ]),
  upbringing("Decados", "Landless", [
    ch("body.dexterity", 2), ch("mind.perception", 2), pri("spirit.ego", 1),
    sk("Melee", 1), sk("Observe", 1), sk("Sneak", 1), sk("Knavery", 2)
  ]),
  upbringing("Hazat", "Landless", [
    ch("body.endurance", 2), ch("mind.perception", 2), pri("spirit.passion", 1),
    sk("Impress", 1), sk("Melee", 1), sk("Shoot", 1), sk("Vigor", 1), sk("Remedy", 1)
  ]),
  upbringing("Li Halan", "Landless", [
    ch("mind.wits", 1),
    orSpirit(cid("lihalan", "ll", "social"), "Extrovert", "Introvert", 1),
    orSpirit(cid("lihalan", "ll", "temper"), "Passion", "Calm", 1),
    pri("spirit.faith", 2),
    sk("Melee", 1), sk("Observe", 1), sk("Focus", 1), sp("Lore", "Theology", 1), sk("Remedy", 1)
  ]),
  upbringing("al-Malik", "Landless", [
    ch("body.dexterity", 2), ch("mind.wits", 1),
    orSpirit(cid("almalik", "ll", "social"), "Extrovert", "Introvert", 1),
    pri("spirit.calm", 1),
    sk("Etiquette", 1), lang("Speak", "Graceful Tongue", 2), lang("Read", "Urthish", 2)
  ])
];


/* -------------------------------------------- */
/*  Upbringing — priests and guilds (p.77)      */
/* -------------------------------------------- */

/**
 * "Most priests or guildsmembers grow up in similar towns or cities... The two
 *  factors to consider here are the character's environment and social status."
 *
 * Their Upbringing is therefore composite: one Environment and one Class, which
 * together come to the five characteristic and five skill points a noble spends
 * on a single stage. Environment is worth 4 and 3, Class 1 and 2.
 *
 * Brother Battle is the exception — "monks are chosen at an early age" — and
 * fills the whole Upbringing on its own.
 */
const FREEMAN_FACTIONS = ["priest", "merchant"];

const freemanUpbringing = (name, slot, description, grants, extra = {}) => ({
  n: name,
  stage: "upbringing",
  faction: "",
  factions: FREEMAN_FACTIONS,
  path: "freeman",
  slot,
  group: slot === "environment" ? "Environment" : "Class",
  d: description,
  grants,
  ...extra
});

const FREEMAN_UPBRINGING = [
  freemanUpbringing("City", "environment",
    "Raised among crowds and commerce, where news travels fast and nothing stays private for long.", [
    ch("mind.wits", 2), ch("mind.perception", 2),
    sk("Observe", 1), sk("Inquiry", 1), sk("Streetwise", 1)
  ]),
  freemanUpbringing("Town", "environment",
    "Raised somewhere small enough that everyone knows your family, and large enough that it matters.", [
    ch("mind.wits", 1), ch("mind.perception", 1), ch("spirit.extrovert", 2),
    sk("Charm", 1), sk("Vigor", 1), sk("Inquiry", 1)
  ]),
  freemanUpbringing("Country", "environment",
    "Raised on the land, among beasts and weather and the long memory of a parish.", [
    ch("body.strength", 1), ch("body.endurance", 2), ch("spirit.faith", 1),
    sk("Vigor", 1),
    pickOne("freeman-country-beast", "Beast Lore or Drive (Beastcraft) 1",
      opt("Beast Lore", sk("Beast Lore", 1)),
      opt("Drive (Beastcraft)", sp("Drive", "Beastcraft", 1))),
    sp("Lore", "Regional", 1)
  ]),

  freemanUpbringing("Wealthy", "class",
    "The family had money, and spent some of it on your letters.", [
    ch("spirit.extrovert", 1), lang("Read", "Urthish", 2)
  ]),
  freemanUpbringing("Average", "class",
    "Neither rich nor wanting; a household that got by.", [
    orSpirit("freeman-average-social", "Extrovert", "Introvert", 1),
    pickOne("freeman-average-skill", "Charm or Impress +1",
      opt("Charm", sk("Charm", 1)),
      opt("Impress", sk("Impress", 1))),
    pickOne("freeman-average-lore", "Lore (Folk or Regional) 1",
      opt("Lore (Folk)", sp("Lore", "Folk", 1)),
      opt("Lore (Regional)", sp("Lore", "Regional", 1)))
  ]),
  freemanUpbringing("Poor", "class",
    "You learned early what a coin was worth and what people would do for one.", [
    orSpirit("freeman-poor-spirit", "Faith", "Ego", 1),
    sk("Knavery", 1),
    pickOne("freeman-poor-skill", "Streetwise or Survival 1",
      opt("Streetwise", sk("Streetwise", 1)),
      opt("Survival", sk("Survival", 1)))
  ]),

  // Brother Battle fills the whole Upbringing rather than a slot.
  {
    n: "Brother Battle Warrior Monk",
    stage: "upbringing",
    faction: "priest",
    slot: "",
    group: "Brother Battle",
    d: "Taken by the order as a child. The training is harsh and begins at once.",
    grants: [
      ch("body.strength", 1), ch("body.dexterity", 2), ch("body.endurance", 1),
      ch("spirit.faith", 1),
      sk("Dodge", 1), sk("Fight", 2), sk("Melee", 1), sk("Shoot", 2), sk("Vigor", 1),
      sk("Focus", 1), sk("Remedy", 1), sk("Stoic Body", 1),
      bless("Disciplined"), curse("Clueless")
    ]
  }
];

/* -------------------------------------------- */
/*  Apprenticeship — all noble houses (p.74)    */
/* -------------------------------------------- */

const APPRENTICESHIP = [
  {
    n: "Soldier", stage: "apprenticeship", faction: "noble", group: "Military",
    d: "Military training from a young age, in the field as much as the drill yard.",
    grants: [
      ch("body.strength", 2), ch("body.dexterity", 2), ch("body.endurance", 1),
      sk("Fight", 1), sk("Shoot", 2), sk("Vigor", 1), sk("Remedy", 1),
      sp("Social", "Leadership", 3), sk("Survival", 1), sp("Warfare", "Military Tactics", 1)
    ]
  },
  {
    n: "Starman", stage: "apprenticeship", faction: "noble", group: "Military",
    d: "Trained aboard ship, learning vacuum, gunnery and the discipline of a crew.",
    grants: [
      ch("body.dexterity", 1), ch("mind.wits", 2), ch("mind.perception", 1),
      ch("spirit.extrovert", 1),
      sk("Impress", 1), sk("Melee", 1), sk("Shoot", 2), sk("Remedy", 1),
      sp("Social", "Leadership", 2), sk("Spacesuit", 1), sk("Think Machine", 1),
      sp("Warfare", "Gunnery", 1)
    ]
  },
  {
    n: "Diplomacy/Intrigue", stage: "apprenticeship", faction: "noble", group: "Diplomacy",
    d: "Schooled in the arts of court: what to say, what to notice and what to leave unsaid.",
    grants: [
      ch("mind.wits", 2), ch("mind.perception", 1), ch("spirit.extrovert", 1),
      ch("spirit.calm", 1),
      sk("Charm", 2), sk("Observe", 1), sk("Sneak", 1), sp("Arts", "Rhetoric", 1),
      sk("Etiquette", 2),
      pickOne("appr-diplomacy-guile", "Inquiry or Knavery 2",
        opt("Inquiry", sk("Inquiry", 2)),
        opt("Knavery", sk("Knavery", 2))),
      pickOne("appr-diplomacy-social", "Social (Debate or Oratory) 1",
        opt("Debate", sp("Social", "Debate", 1)),
        opt("Oratory", sp("Social", "Oratory", 1)))
    ]
  },
  {
    n: "Duelist", stage: "apprenticeship", faction: "noble", group: "Leisure",
    d: "Years at the fencing school, learning the forms and the etiquette of the challenge.",
    grants: [
      ch("body.strength", 1), ch("body.dexterity", 2), ch("body.endurance", 1),
      orSpirit("appr-duelist-temper", "Passion", "Calm", 1),
      pickOne("appr-duelist-defence", "Dodge or Vigor +1",
        opt("Dodge", sk("Dodge", 1)),
        opt("Vigor", sk("Vigor", 1))),
      sk("Melee", 2), sk("Remedy", 1),
      action("Parry"), action("Thrust"), action("Slash")
    ]
  },
  {
    n: "Dandy", stage: "apprenticeship", faction: "noble", group: "Leisure",
    d: "A youth of leisure and accomplishment, with time enough to be good at whatever took the fancy.",
    grants: [
      ch("body.dexterity", 1), ch("mind.wits", 2), ch("mind.perception", 1),
      orSpirit("appr-dandy-temper", "Passion", "Calm", 1),
      open("appr-dandy-any", "Any skill +2", "skill", 2),
      sk("Charm", 1), sk("Observe", 1), sk("Shoot", 1),
      open("appr-dandy-art", "Arts (choose a favourite) 1", "skill", 1, ["Arts"]),
      pickOne("appr-dandy-drive", "Drive (Aircraft or Landcraft) 1",
        opt("Aircraft", sp("Drive", "Aircraft", 1)),
        opt("Landcraft", sp("Drive", "Landcraft", 1))),
      sk("Empathy", 1), sk("Gambling", 1), sk("Ride", 1)
    ]
  },
  {
    n: "Study", stage: "apprenticeship", faction: "noble", group: "Study",
    d: "Given over to books and contemplation, and to one subject above all others.",
    grants: [
      ch("mind.wits", 2), ch("spirit.introvert", 2),
      orSpirit("appr-study-temper", "Passion", "Calm", 1),
      sk("Academia", 1), sk("Focus", 3), sk("Inquiry", 1),
      open("appr-study-subject", "Lore or Science (object of study) 3", "skill", 3, ["Lore", "Science"]),
      pickOne("appr-study-read", "Read Urthish or Latin (2 pts)",
        opt("Urthish", lang("Read", "Urthish", 2)),
        opt("Latin", lang("Read", "Latin", 2)))
    ]
  }
];

/* -------------------------------------------- */
/*  Early Career — all noble houses (p.75)      */
/* -------------------------------------------- */

const EARLY_CAREER = [
  {
    n: "Soldier", stage: "earlyCareer", faction: "noble", group: "Military Command",
    d: "Knighted and given soldiers to lead.",
    grants: [
      ch("body.strength", 2), ch("body.dexterity", 2), ch("body.endurance", 2),
      ch("mind.wits", 1), ch("mind.perception", 1), ch("spirit.extrovert", 1),
      orSpirit("career-soldier-temper", "Passion", "Calm", 1),
      sk("Dodge", 1), sk("Fight", 1), sk("Impress", 1), sk("Observe", 1),
      sk("Melee", 1), sk("Shoot", 2), sk("Vigor", 1), sk("Remedy", 1),
      sp("Social", "Leadership", 4), sk("Survival", 1), sp("Warfare", "Military Tactics", 1),
      ben("Nobility", 3)
    ]
  },
  {
    n: "Starman", stage: "earlyCareer", faction: "noble", group: "Military Command",
    d: "Knighted to a berth aboard ship, with a watch to stand and guns to lay.",
    grants: [
      ch("body.dexterity", 2), ch("body.endurance", 2), ch("mind.wits", 2),
      ch("mind.perception", 1), ch("spirit.extrovert", 1),
      orSpirit("career-starman-temper", "Passion", "Calm", 2),
      sk("Impress", 1), sk("Melee", 1), sk("Shoot", 2), sp("Drive", "Spacecraft", 1),
      lang("Read", "Urthish", 2), sk("Remedy", 1), sp("Social", "Leadership", 2),
      sk("Spacesuit", 2), sk("Think Machine", 1),
      sp("Warfare", "Gunnery", 1), sp("Warfare", "Starfleet Tactics", 1),
      ben("Nobility", 3)
    ]
  },
  {
    n: "Duelist", stage: "earlyCareer", faction: "noble", group: "Court",
    d: "Knighted, and known for the blade. Challenges arrive whether sought or not.",
    grants: [
      ch("body.strength", 1), ch("body.dexterity", 2), ch("body.endurance", 2),
      ch("mind.wits", 1), ch("mind.perception", 1),
      orSpirit("career-duelist-social", "Extrovert", "Introvert", 1),
      orSpirit("career-duelist-temper", "Passion", "Calm", 2),
      sk("Dodge", 1), sk("Melee", 2), sk("Etiquette", 1), sk("Remedy", 1),
      pickOne("career-duelist-actions", "Fencing Actions",
        opt("Basic — for those without the Duelist Apprenticeship",
          action("Parry"), action("Thrust"), action("Slash"), action("Draw & Strike")),
        opt("Advanced — Parry/Riposte (only with the Duelist Apprenticeship)",
          action("Draw & Strike"), action("Parry/Riposte")),
        opt("Advanced — Disarm and Feint (only with the Duelist Apprenticeship)",
          action("Draw & Strike"), action("Disarm"), action("Feint"))),
      ben("Nobility", 3)
    ]
  },
  {
    n: "Ambassador", stage: "earlyCareer", faction: "noble", group: "Court",
    d: "Knighted and sent to speak for the house, where a misplaced word costs more than a misplaced blade.",
    grants: [
      ch("body.dexterity", 1), ch("mind.wits", 2), ch("mind.perception", 2),
      ch("spirit.extrovert", 2), ch("spirit.calm", 2),
      orSpirit("career-ambassador-faith", "Faith", "Ego", 1),
      sk("Charm", 2), sk("Observe", 1), sk("Sneak", 1), sp("Arts", "Rhetoric", 1),
      sk("Etiquette", 2),
      pickOne("career-ambassador-guile", "Inquiry or Knavery 2",
        opt("Inquiry", sk("Inquiry", 2)),
        opt("Knavery", sk("Knavery", 2))),
      sp("Lore", "Court Rivals", 1),
      pickOne("career-ambassador-social", "Social (Debate or Oratory) 1",
        opt("Debate", sp("Social", "Debate", 1)),
        opt("Oratory", sp("Social", "Oratory", 1))),
      lang("Read", "Urthish", 2), sk("Ride", 1),
      ben("Nobility", 3)
    ]
  },
  {
    n: "Questing", stage: "earlyCareer", faction: "noble", group: "Questing",
    d: "Knighted and sent out into the realm, to make a name or fail trying. Shaped by the road rather than by the house.",
    suggested: [
      { label: "Imperial Knight Charter (5 pts)", key: "Imperial Charter", value: 5 },
      { label: "Well-Travelled (5 pts)", key: "Well-Travelled", value: 5 }
    ],
    grants: [
      pickOne("career-questing-body-major", "Body characteristic (choose one) +2",
        opt("Strength", ch("body.strength", 2)),
        opt("Dexterity", ch("body.dexterity", 2)),
        opt("Endurance", ch("body.endurance", 2))),
      pickN("career-questing-body-minor", "Body characteristic (choose two) +1 each", 2,
        opt("Strength", ch("body.strength", 1)),
        opt("Dexterity", ch("body.dexterity", 1)),
        opt("Endurance", ch("body.endurance", 1))),
      pickOne("career-questing-mind-major", "Mind characteristic (choose one) +2",
        opt("Wits", ch("mind.wits", 2)),
        opt("Perception", ch("mind.perception", 2)),
        opt("Tech", ch("mind.tech", 2))),
      pickOne("career-questing-mind-minor", "Mind characteristic (choose one) +1",
        opt("Wits", ch("mind.wits", 1)),
        opt("Perception", ch("mind.perception", 1)),
        opt("Tech", ch("mind.tech", 1))),
      open("career-questing-spirit-major", "Spirit characteristic (choose one) +2", "spirit", 2),
      open("career-questing-spirit-minor", "Spirit characteristic (choose one) +1", "spirit", 1),
      pickOne("career-questing-social", "Charm or Impress +1",
        opt("Charm", sk("Charm", 1)),
        opt("Impress", sk("Impress", 1))),
      sk("Dodge", 1),
      pickOne("career-questing-combat-major", "Combat skill (choose primary) +2",
        opt("Fight", sk("Fight", 2)),
        opt("Melee", sk("Melee", 2)),
        opt("Shoot", sk("Shoot", 2))),
      pickOne("career-questing-combat-minor", "Combat skill (choose secondary) +1",
        opt("Fight", sk("Fight", 1)),
        opt("Melee", sk("Melee", 1)),
        opt("Shoot", sk("Shoot", 1))),
      sk("Observe", 1), sk("Sneak", 1), sk("Vigor", 1),
      open("career-questing-drive", "Drive (choose craft) 1", "skill", 1, ["Drive"]),
      pickOne("career-questing-guile", "Inquiry or Knavery 1",
        opt("Inquiry", sk("Inquiry", 1)),
        opt("Knavery", sk("Knavery", 1))),
      sp("Lore", "People and Places Seen", 1),
      sk("Remedy", 1),
      open("career-questing-speak", "Speak (choose dialect) 2 pts", "language", 2, ["Speak"]),
      sk("Streetwise", 1),
      ben("Nobility", 3)
    ]
  }
];



/* -------------------------------------------- */
/*  Apprenticeship — priests (p.77–78)          */
/* -------------------------------------------- */

/**
 * The priest Apprenticeship is a matrix: three settings by four sects.
 *
 * Temple Avesti print "See Cathedral, above" for both Parish and Monastery, so
 * those cells share the Cathedral entry rather than being invented.
 *
 * "Note that nobles can join the priesthood at this stage" (p.77), so these are
 * open to nobles as well as priests.
 */
const PRIEST_FACTIONS = ["priest", "noble", "alien"];

/**
 * Which alien races may take the human sects' stages.
 *
 * "Obun can instead choose to join a guild or human sect for their
 *  Apprenticeship and Early Career stages (especially true of off-world Obun)."
 *  (p.82)
 *
 * The Ukari and the Vorox are offered guilds only — "Many Ukari join a guild
 * instead of learning the traditional clan careers" (p.83), "Vorox can choose
 * to join a guild instead" (p.84) — so neither may be ordained in a human sect.
 */
const PRIEST_ALIEN_RACES = ["urObun"];

const priestStage = (name, group, description, grants, extra = {}) => ({
  n: name, stage: "apprenticeship", faction: "", factions: PRIEST_FACTIONS,
  alienRaces: PRIEST_ALIEN_RACES,
  path: "priest", group, d: description, grants, ...extra
});

const PRIEST_APPRENTICESHIP = [
  priestStage("Cathedral (Orthodoxy)", "Cathedral",
    "First training in a city cathedral, close to libraries, learned people and perhaps even high technology.", [
    ch("mind.wits", 1), ch("spirit.extrovert", 1), ch("spirit.calm", 1), ch("spirit.faith", 2),
    pickOne("pr-cath-orth-social", "Charm or Impress +1",
      opt("Charm", sk("Charm", 1)), opt("Impress", sk("Impress", 1))),
    sk("Academia", 1), sk("Focus", 1), sp("Lore", "Theology", 1), sk("Physick", 1),
    sp("Social", "Oratory", 2), lang("Read", "Latin", 2), sk("Remedy", 1),
    bless("Pious"), curse("Austere")
  ]),
  priestStage("Cathedral (Eskatonic Order)", "Cathedral",
    "First training in a city cathedral, among the order's alchemists and their close-kept books.", [
    ch("mind.wits", 1), ch("spirit.introvert", 2), ch("spirit.faith", 2),
    sk("Observe", 1), sk("Academia", 1), sk("Alchemy", 1), sk("Focus", 3),
    sp("Lore", "Occult", 1), sk("Stoic Mind", 1), lang("Read", "Latin", 2),
    bless("Curious"), curse("Subtle")
  ]),
  priestStage("Cathedral (Temple Avesti)", "Cathedral",
    "First training in a city cathedral, learning where sin hides and what is done about it. Avestites train the same way in parish and monastery.", [
    ch("body.endurance", 1), ch("mind.perception", 2), ch("spirit.faith", 2),
    sk("Impress", 1), sk("Melee", 1), sk("Observe", 1), sk("Shoot", 1),
    sk("Inquiry", 1), sp("Lore", "Doctrine", 1), sk("Search", 1), sk("Torture", 1),
    bless("Pious"), curse("Righteous")
  ]),
  priestStage("Cathedral (Sanctuary Aeon)", "Cathedral",
    "First training in a city cathedral, in the wards rather than the library.", [
    ch("body.dexterity", 2), ch("mind.tech", 1), ch("spirit.calm", 1), ch("spirit.faith", 1),
    sk("Charm", 1), sp("Arts", "Music", 1), sk("Empathy", 1), sp("Lore", "Theology", 1),
    sk("Physick", 3), sk("Remedy", 2), sk("Stoic Mind", 1),
    bless("Compassionate"), curse("Gullible")
  ]),

  priestStage("Parish (Orthodoxy)", "Parish",
    "A small country or town church, preaching to the same flock every week.", [
    ch("mind.wits", 1), ch("spirit.extrovert", 1), ch("spirit.calm", 1), ch("spirit.faith", 2),
    pickOne("pr-par-orth-social", "Charm or Impress +1",
      opt("Charm", sk("Charm", 1)), opt("Impress", sk("Impress", 1))),
    sk("Empathy", 1), sk("Focus", 1), sp("Lore", "Theology", 2), sp("Lore", "The Flock", 1),
    sk("Physick", 1), sk("Remedy", 1), sp("Social", "Oratory", 2),
    bless("Pious"), curse("Austere")
  ]),
  priestStage("Parish (Eskatonic Order)", "Parish",
    "A small country or town church, far from the order's libraries but close to its people.", [
    ch("mind.wits", 1), ch("spirit.introvert", 2), ch("spirit.faith", 2),
    sk("Observe", 1), sk("Alchemy", 1), sk("Empathy", 1), sk("Focus", 3),
    sp("Lore", "Occult", 1), sk("Remedy", 1), sk("Stoic Mind", 2),
    bless("Curious"), curse("Subtle")
  ]),
  priestStage("Parish (Sanctuary Aeon)", "Parish",
    "A small country or town church, where the healer knows every family by name.", [
    ch("body.dexterity", 2), ch("spirit.calm", 1), ch("spirit.faith", 2),
    sk("Charm", 1), sp("Arts", "Music", 1), sk("Empathy", 1),
    sp("Lore", "Lives of the Local People", 1),
    sk("Physick", 3), sk("Remedy", 2), sk("Stoic Mind", 1),
    bless("Compassionate"), curse("Gullible")
  ]),

  priestStage("Monastery (Orthodoxy)", "Monastery",
    "Secluded from outsiders and given over to the spiritual life; study and contemplation over preaching.", [
    ch("mind.wits", 1), ch("spirit.introvert", 1), ch("spirit.calm", 1), ch("spirit.faith", 2),
    sk("Academia", 1), sk("Focus", 2), sp("Lore", "Theology", 1), sk("Physick", 1),
    sk("Stoic Mind", 1), lang("Read", "Latin", 2), lang("Read", "Urthish", 2),
    bless("Pious"), curse("Austere")
  ]),
  priestStage("Monastery (Eskatonic Order)", "Monastery",
    "Secluded with the order's texts and alembics, and the long silences between them.", [
    ch("mind.wits", 1), ch("spirit.introvert", 2), ch("spirit.faith", 2),
    sk("Academia", 1), sk("Alchemy", 1), sk("Focus", 2), sp("Lore", "Occult", 1),
    sk("Stoic Mind", 1), lang("Read", "Latin", 2), lang("Read", "Urthish", 2),
    bless("Curious"), curse("Subtle")
  ]),
  priestStage("Monastery (Sanctuary Aeon)", "Monastery",
    "Secluded in an Amalthean house, where the sick are brought and the quiet is kept.", [
    ch("body.dexterity", 1), ch("spirit.introvert", 1), ch("spirit.calm", 1), ch("spirit.faith", 2),
    sk("Empathy", 1), sp("Lore", "Theology", 1), sk("Physick", 3), sk("Remedy", 2),
    sk("Stoic Mind", 1), lang("Read", "Urthish", 2),
    bless("Compassionate"), curse("Gullible")
  ]),

  {
    n: "Brother Battle Warrior Monk", stage: "apprenticeship", faction: "priest",
    group: "Brother Battle",
    d: "The order's training proper: the forms of Mantok, or the sword.",
    grants: [
      ch("body.strength", 1), ch("body.dexterity", 2), ch("body.endurance", 1),
      ch("spirit.faith", 1),
      pickOne("pr-bb-combat", "Combat skill (choose Fight or Melee) +1",
        opt("Fight", sk("Fight", 1)), opt("Melee", sk("Melee", 1))),
      sk("Shoot", 1), sk("Remedy", 1), sk("Stoic Body", 1),
      pickOne("pr-bb-style", "Choose a style, matching the combat skill above",
        opt("Mantok Martial Arts", action("Martial Fist"), action("Martial Kick"), action("Martial Hold")),
        opt("Sword Fencing", action("Parry"), action("Thrust"), action("Slash")))
    ]
  }
];

/* -------------------------------------------- */
/*  Early Career — priests (p.78)               */
/* -------------------------------------------- */

const priestCareer = (name, group, description, grants, extra = {}) => ({
  n: name, stage: "earlyCareer", faction: "", factions: PRIEST_FACTIONS,
  alienRaces: PRIEST_ALIEN_RACES,
  path: "priest", group, d: description, grants: [...grants, ben("Ordained", 3)], ...extra
});

const PRIEST_CAREER = [
  priestCareer("Preacher/Pastor", "Ministry",
    "Ordained and posted to preach and aid the people of a cathedral, church or parish.", [
    ch("mind.wits", 2), ch("mind.perception", 1), ch("spirit.extrovert", 2),
    ch("spirit.introvert", 1), ch("spirit.passion", 2), ch("spirit.faith", 2),
    pickOne("pr-preacher-social", "Charm or Impress +2",
      opt("Charm", sk("Charm", 2)), opt("Impress", sk("Impress", 2))),
    sk("Observe", 1), sk("Empathy", 1), sk("Focus", 1), sk("Inquiry", 1),
    sp("Lore", "Flock", 1), sk("Physick", 1), lang("Read", "Latin", 2), sk("Remedy", 1),
    sp("Social", "Oratory", 2), lang("Speak", "Latin", 2)
  ]),
  priestCareer("Monk", "Ministry",
    "Ordained to a cloistered life of contemplation in the monastery.", [
    open("pr-monk-body", "Body characteristic +1", "characteristic", 1),
    ch("mind.wits", 2), ch("mind.perception", 1), ch("spirit.introvert", 2),
    ch("spirit.calm", 2), ch("spirit.faith", 2),
    sk("Observe", 1), sk("Academia", 1), sk("Empathy", 1), sk("Focus", 3), sk("Inquiry", 1),
    sp("Lore", "Theology", 1), sp("Lore", "Area of Interest", 2), sk("Physick", 1),
    lang("Read", "Latin", 2), sk("Remedy", 1), sk("Stoic Mind", 1)
  ]),
  priestCareer("Missionary", "Ministry",
    "Ordained and sent to bring the good word to those the Church has not reached.", [
    ch("body.endurance", 2), ch("mind.wits", 1), ch("mind.perception", 2),
    ch("spirit.extrovert", 2), ch("spirit.passion", 2), ch("spirit.faith", 1),
    pickOne("pr-miss-social", "Charm or Impress +3",
      opt("Charm", sk("Charm", 3)), opt("Impress", sk("Impress", 3))),
    sk("Observe", 1), sp("Drive", "Beastcraft", 1), sk("Empathy", 1), sk("Focus", 1),
    sk("Inquiry", 1), sp("Lore", "Doctrine", 1), sk("Physick", 1), sk("Remedy", 1),
    sk("Ride", 1), sp("Social", "Oratory", 2), sk("Streetwise", 1)
  ]),
  priestCareer("Healer", "Ministry",
    "Ordained to the wards and the roadside, where the sick are.", [
    ch("body.dexterity", 2), ch("body.endurance", 1), ch("mind.wits", 1), ch("mind.tech", 1),
    ch("spirit.extrovert", 2), ch("spirit.calm", 1), ch("spirit.faith", 2),
    sk("Charm", 2), sk("Observe", 1), sk("Empathy", 2), sk("Focus", 1),
    sp("Lore", "Local Populace", 1), sk("Physick", 3), sk("Remedy", 3),
    sp("Social", "Oratory", 1),
    open("pr-healer-tech", "Tech Redemption (choose type) 1", "skill", 1, ["Tech Redemption"])
  ]),
  priestCareer("Inquisitor", "Ministry",
    "Ordained to find heresy, and to be seen finding it.", [
    ch("body.strength", 2), ch("body.dexterity", 1), ch("body.endurance", 2),
    ch("mind.perception", 2), ch("spirit.passion", 2), ch("spirit.faith", 1),
    sk("Impress", 2), sk("Observe", 2), sk("Shoot", 2), sk("Sneak", 1), sk("Vigor", 1),
    sk("Inquiry", 1), sp("Lore", "Heresy", 1), sk("Search", 1),
    pickOne("pr-inq-stoic", "Stoic Body or Stoic Mind 1",
      opt("Stoic Body", sk("Stoic Body", 1)), opt("Stoic Mind", sk("Stoic Mind", 1))),
    sk("Streetwise", 1), sk("Tracking", 1), sk("Torture", 1)
  ]),
  {
    n: "Brother Battle Warrior Monk", stage: "earlyCareer", faction: "priest",
    group: "Brother Battle",
    d: "Sworn to the order and sent where the fighting is.",
    grants: [
      ch("body.strength", 3), ch("body.dexterity", 1), ch("body.endurance", 3),
      orSpirit("pr-bbc-temper", "Passion", "Calm", 1),
      orSpirit("pr-bbc-social", "Extrovert", "Introvert", 1),
      ch("spirit.faith", 1),
      sk("Dodge", 1),
      pickOne("pr-bbc-combat-1", "Combat skill (choose Fight or Melee) +2",
        opt("Fight", sk("Fight", 2)), opt("Melee", sk("Melee", 2))),
      pickOne("pr-bbc-combat-2", "Combat skill (choose Fight or Melee) +1",
        opt("Fight", sk("Fight", 1)), opt("Melee", sk("Melee", 1))),
      sk("Shoot", 2), sk("Physick", 1),
      pickOne("pr-bbc-stoic", "Focus or Stoic Body 2",
        opt("Focus", sk("Focus", 2)), opt("Stoic Body", sk("Stoic Body", 2))),
      sk("Survival", 1), sp("Warfare", "Military Tactics", 1),
      pickOne("pr-bbc-style", "Choose one, matching the style already learned",
        opt("Mantok: Claw Fist", action("Claw Fist")),
        opt("Mantok: Tornado Kick", action("Tornado Kick")),
        opt("Sword: Disarm", action("Disarm")),
        opt("Sword: Feint", action("Feint"))),
      ben("Ordained", 3)
    ]
  }
];


/* -------------------------------------------- */
/*  Apprenticeship — guilds (p.80–81)           */
/* -------------------------------------------- */

/**
 * The guild Apprenticeship is a matrix of three settings by five guilds.
 * "Note that nobles can join a guild at this stage, although it is considered
 *  scandalous" (p.80), so these are open to nobles too.
 */
const GUILD_FACTIONS = ["merchant", "noble", "alien"];

const guildStage = (name, group, description, grants) => ({
  n: name, stage: "apprenticeship", faction: "", factions: GUILD_FACTIONS,
  path: "merchant", group, d: description, grants
});

const combatChoice = (id, value, includeShoot = false) => pickOne(
  id, `Combat skill (choose ${includeShoot ? "Fight, Melee or Shoot" : "Fight or Melee"}) +${value}`,
  opt("Fight", sk("Fight", value)),
  opt("Melee", sk("Melee", value)),
  ...(includeShoot ? [opt("Shoot", sk("Shoot", value))] : [])
);

const GUILD_APPRENTICESHIP = [
  guildStage("Academy (Charioteers)", "Academy",
    "Enrolled in the guild's training academy, where the promising are taught properly.", [
    ch("body.dexterity", 2), ch("mind.wits", 1), ch("spirit.extrovert", 2),
    sk("Impress", 1),
    open("gu-acad-char-d1", "Drive (primary specialty) 3", "skill", 3, ["Drive"]),
    open("gu-acad-char-d2", "Drive (secondary specialty) 2", "skill", 2, ["Drive"]),
    sp("Tech Redemption", "Mech", 2), sk("Remedy", 1), sk("Spacesuit", 1),
    bless("Curious"), curse("Nosy")
  ]),
  guildStage("Academy (Engineers)", "Academy",
    "Enrolled in the guild's training academy, among benches and half-built things.", [
    ch("body.dexterity", 1), ch("mind.wits", 1), ch("mind.tech", 3),
    sk("Inquiry", 1), lang("Read", "Urthtech", 1),
    open("gu-acad-eng-t1", "Tech Redemption (primary specialty) 3", "skill", 3, ["Tech Redemption"]),
    open("gu-acad-eng-t2", "Tech Redemption (secondary specialty) 1", "skill", 1, ["Tech Redemption"]),
    open("gu-acad-eng-s1", "Science (primary specialty) 2", "skill", 2, ["Science"]),
    open("gu-acad-eng-s2", "Science (secondary specialty) 1", "skill", 1, ["Science"]),
    sk("Think Machine", 1),
    bless("Innovative"), curse("Unnerving")
  ]),
  guildStage("Academy (Scravers)", "Academy",
    "Enrolled in the guild's training academy, learning the trade and the cant that goes with it.", [
    ch("body.strength", 2), ch("mind.perception", 2), ch("spirit.ego", 1),
    sk("Impress", 1), combatChoice("gu-acad-scr-combat", 1, true), sk("Sneak", 1),
    sk("Gambling", 1), sk("Inquiry", 1), sk("Knavery", 1),
    lang("Speak", "Scraver Cant", 2), sk("Streetwise", 2),
    bless("The Man"), curse("Possessive")
  ]),
  guildStage("Academy (Muster)", "Academy",
    "Enrolled in the guild's training academy, drilled for the contract work to come.", [
    ch("body.strength", 1), ch("body.dexterity", 2), ch("mind.tech", 2),
    combatChoice("gu-acad-mus-combat", 1), sk("Impress", 1), sk("Shoot", 2),
    open("gu-acad-mus-drive", "Drive (choose specialty) 2", "skill", 2, ["Drive"]),
    sp("Lore", "People and Places Seen", 1), sp("Tech Redemption", "Mech", 1),
    sk("Remedy", 1), sk("Streetwise", 1),
    bless("Bold"), curse("Callous")
  ]),
  guildStage("Academy (Reeves)", "Academy",
    "Enrolled in the guild's training academy, among ledgers, contracts and precedent.", [
    ch("mind.wits", 2), ch("mind.perception", 2), ch("spirit.introvert", 1),
    sk("Impress", 1), sk("Academia", 1), sp("Arts", "Rhetoric", 1), sk("Bureaucracy", 1),
    sk("Etiquette", 1), sk("Inquiry", 1),
    pickOne("gu-acad-ree-lore", "Lore (Finance or Law) 1",
      opt("Lore (Finance)", sp("Lore", "Finance", 1)),
      opt("Lore (Law)", sp("Lore", "Law", 1))),
    lang("Read", "Latin", 2), sp("Social", "Debate", 1),
    bless("Shrewd"), curse("Mammon")
  ]),

  guildStage("Guildhall (Charioteers)", "Guildhall",
    "Training on the job, hanging about the guild hall and petitioning higher-ranking members for work.", [
    ch("body.dexterity", 2), ch("mind.wits", 1), ch("spirit.extrovert", 2),
    sk("Impress", 1),
    open("gu-hall-char-d1", "Drive (primary specialty) 2", "skill", 2, ["Drive"]),
    open("gu-hall-char-d2", "Drive (secondary specialty) 1", "skill", 1, ["Drive"]),
    sk("Empathy", 1), sp("Lore", "People and Places Seen", 1),
    sp("Tech Redemption", "Mech", 1), sk("Remedy", 1),
    open("gu-hall-char-speak", "Speak (local dialect) 2 pts", "language", 2, ["Speak"]),
    bless("Curious"), curse("Nosy")
  ]),
  guildStage("Guildhall (Engineers)", "Guildhall",
    "Training on the job, learning from whoever will spare the time.", [
    ch("body.dexterity", 1), ch("mind.wits", 1), ch("mind.tech", 3),
    sk("Shoot", 1), sk("Inquiry", 1), lang("Read", "Urthtech", 1),
    open("gu-hall-eng-t1", "Tech Redemption (primary specialty) 2", "skill", 2, ["Tech Redemption"]),
    open("gu-hall-eng-t2", "Tech Redemption (secondary specialty) 1", "skill", 1, ["Tech Redemption"]),
    open("gu-hall-eng-s1", "Science (primary specialty) 2", "skill", 2, ["Science"]),
    open("gu-hall-eng-s2", "Science (secondary specialty) 1", "skill", 1, ["Science"]),
    sk("Think Machine", 1),
    bless("Innovative"), curse("Unnerving")
  ]),
  guildStage("Guildhall (Scravers)", "Guildhall",
    "Training on the job, in back rooms and card games.", [
    ch("body.strength", 2), ch("mind.perception", 2), ch("spirit.ego", 1),
    sk("Impress", 1), sk("Dodge", 1), combatChoice("gu-hall-scr-combat", 1, true),
    sk("Sneak", 1), sk("Gambling", 1), sk("Inquiry", 1), sk("Knavery", 1),
    lang("Speak", "Scraver Cant", 2), sk("Streetwise", 1),
    bless("Lucky at Cards"), curse("Possessive")
  ]),
  guildStage("Guildhall (Muster)", "Guildhall",
    "Training on the job, taking whatever contracts the hall hands down.", [
    ch("body.strength", 1), ch("body.dexterity", 2), ch("mind.tech", 2),
    combatChoice("gu-hall-mus-combat", 1), sk("Impress", 1), sk("Shoot", 1),
    open("gu-hall-mus-drive", "Drive (choose specialty) 1", "skill", 1, ["Drive"]),
    sp("Lore", "People and Places Seen", 1), sp("Tech Redemption", "Mech", 1),
    sk("Remedy", 1), sk("Search", 1), sk("Streetwise", 2),
    bless("Bold"), curse("Callous")
  ]),
  guildStage("Guildhall (Reeves)", "Guildhall",
    "Training on the job, filing and witnessing until someone trusts you with more.", [
    ch("mind.wits", 2), ch("mind.perception", 2), ch("spirit.introvert", 1),
    sk("Impress", 1), sk("Observe", 1), sk("Academia", 1), sk("Bureaucracy", 1),
    sk("Etiquette", 1), sk("Inquiry", 1),
    pickOne("gu-hall-ree-lore", "Lore (Finance or Law) 1",
      opt("Lore (Finance)", sp("Lore", "Finance", 1)),
      opt("Lore (Law)", sp("Lore", "Law", 1))),
    lang("Read", "Latin", 2), sp("Social", "Debate", 1),
    bless("Shrewd"), curse("Mammon")
  ]),

  guildStage("The Streets (Charioteers)", "The Streets",
    "No luck at the academies or guild halls, so the toughest school of all.", [
    ch("body.dexterity", 2), ch("mind.wits", 1), ch("spirit.extrovert", 2),
    sk("Impress", 1),
    open("gu-str-char-drive", "Drive (choose specialty) 2", "skill", 2, ["Drive"]),
    sp("Lore", "People and Places Seen", 1), sk("Knavery", 1),
    sp("Tech Redemption", "Mech", 1), sk("Remedy", 1),
    open("gu-str-char-speak", "Speak (local dialect) 2 pts", "language", 2, ["Speak"]),
    sk("Streetwise", 1),
    bless("Curious"), curse("Nosy")
  ]),
  guildStage("The Streets (Engineers)", "The Streets",
    "No luck at the academies or guild halls, so the toughest school of all.", [
    ch("body.dexterity", 2), ch("mind.wits", 1), ch("mind.tech", 2),
    sk("Shoot", 1), sk("Inquiry", 1), lang("Read", "Urthtech", 2),
    open("gu-str-eng-tech", "Tech Redemption (choose specialty) 2", "skill", 2, ["Tech Redemption"]),
    open("gu-str-eng-sci", "Science (choose specialty) 2", "skill", 2, ["Science"]),
    sk("Streetwise", 1), sk("Think Machine", 1),
    bless("Innovative"), curse("Unnerving")
  ]),
  guildStage("The Streets (Scravers)", "The Streets",
    "No luck at the academies or guild halls, so the toughest school of all.", [
    ch("body.strength", 2), ch("mind.perception", 2), ch("spirit.ego", 1),
    sk("Impress", 1), combatChoice("gu-str-scr-combat", 1, true), sk("Sneak", 1),
    sk("Gambling", 1), sk("Inquiry", 1), sk("Knavery", 1),
    lang("Speak", "Scraver Cant", 2), sk("Streetwise", 2),
    bless("Lucky at Cards"), curse("Possessive")
  ]),
  guildStage("The Streets (Muster)", "The Streets",
    "No luck at the academies or guild halls, so the toughest school of all.", [
    ch("body.strength", 2), ch("body.dexterity", 2), ch("mind.tech", 1),
    combatChoice("gu-str-mus-combat", 1), sk("Impress", 1), sk("Shoot", 1),
    open("gu-str-mus-drive", "Drive (choose specialty) 1", "skill", 1, ["Drive"]),
    sk("Knavery", 1), sk("Remedy", 1), sk("Search", 1), sk("Streetwise", 2), sk("Tracking", 1),
    bless("Bold"), curse("Callous")
  ]),
  guildStage("The Streets (Reeves)", "The Streets",
    "No luck at the academies or guild halls, so the toughest school of all.", [
    ch("body.dexterity", 1), ch("mind.wits", 2), ch("mind.perception", 2),
    sk("Impress", 1), sk("Observe", 1), sk("Shoot", 1), sk("Sneak", 1),
    sk("Academia", 1), sk("Etiquette", 1), sk("Inquiry", 1), sp("Lore", "Law", 1),
    sp("Social", "Debate", 1), sk("Streetwise", 1),
    bless("Shrewd"), curse("Mammon")
  ])
];

/* -------------------------------------------- */
/*  Early Career — guilds (p.81–82)             */
/* -------------------------------------------- */

const guildCareer = (name, group, description, grants) => ({
  n: name, stage: "earlyCareer", faction: "", factions: GUILD_FACTIONS,
  path: "merchant", group, d: description, grants: [...grants, ben("Commissioned", 3)]
});

const GUILD_CAREER = [
  guildCareer("The Market", "Trade",
    "Most of her time in marketplaces across the Known Worlds, learning to sell to rubes and royals alike.", [
    ch("body.dexterity", 1), ch("body.endurance", 1), ch("mind.wits", 2),
    ch("mind.perception", 2), ch("spirit.extrovert", 2),
    orSpirit("gu-market-temper", "Passion", "Calm", 2),
    pickOne("gu-market-social", "Charm or Impress +2",
      opt("Charm", sk("Charm", 2)), opt("Impress", sk("Impress", 2))),
    combatChoice("gu-market-combat", 1, true),
    sk("Observe", 2), sk("Gambling", 1), sk("Inquiry", 2), sp("Lore", "Agora", 1),
    open("gu-market-speak", "Speak (dialect) 2 pts", "language", 2, ["Speak"]),
    sk("Streetwise", 1),
    // The trade plied on top of the common training (p.82).
    pickOne("gu-market-trade", "Choose a trade",
      opt("Merchant",
        sk("Sneak", 1), sk("Knavery", 1), sk("Streetwise", 1)),
      opt("Money-Lender — usually a Reeve",
        sk("Etiquette", 1), sp("Lore", "Finance", 2)))
  ]),
  guildCareer("Starship Duty", "Trade",
    "First jobs aboard starships: many new places, most of it seen from cramped quarters.", [
    ch("body.dexterity", 2), ch("body.endurance", 1), ch("mind.wits", 2),
    ch("mind.perception", 1), ch("mind.tech", 1),
    orSpirit("gu-ship-social", "Extrovert", "Introvert", 2),
    orSpirit("gu-ship-temper", "Passion", "Calm", 1),
    pickOne("gu-ship-charm", "Charm or Impress +1",
      opt("Charm", sk("Charm", 1)), opt("Impress", sk("Impress", 1))),
    combatChoice("gu-ship-combat", 2, true),
    sp("Drive", "Spacecraft", 1),
    pickOne("gu-ship-lore", "Lore (people and places seen, or jumproads) 1",
      opt("Lore (People and Places Seen)", sp("Lore", "People and Places Seen", 1)),
      opt("Lore (Jumproads)", sp("Lore", "Jumproads", 1))),
    sk("Remedy", 1), sp("Science", "Sensors", 1), sk("Spacesuit", 1),
    open("gu-ship-tech", "Tech Redemption (choose one) 1", "skill", 1, ["Tech Redemption"]),
    sk("Think Machine", 1), sp("Warfare", "Gunnery", 1),
    // The berth taken aboard adds to the common training (p.82).
    pickOne("gu-ship-post", "Choose a posting",
      opt("Pilot — usually a Charioteer",
        sp("Drive", "Spacecraft", 2), sp("Science", "Sensors", 1)),
      opt("Engineer — usually an Engineer",
        open("gu-ship-eng-tech", "Tech Redemption (Mech, Volt or High-Tech) 2", "skill", 2, ["Tech Redemption"]),
        sp("Science", "Engineering", 1)),
      opt("Gunner",
        sp("Warfare", "Gunnery", 2), sk("Gambling", 1)))
  ]),
  guildCareer("Mercenary — Soldier", "Contract Soldiering",
    "A contract soldier, usually Muster, occasionally a Scraver bully-boy hired out for war.", [
    ch("body.strength", 2), ch("body.dexterity", 3), ch("body.endurance", 2), ch("mind.tech", 1),
    orSpirit("gu-merc-temper", "Passion", "Calm", 2),
    sk("Dodge", 1), sk("Fight", 2), sk("Impress", 1), sk("Melee", 2), sk("Shoot", 3),
    sk("Vigor", 1),
    open("gu-merc-drive", "Drive (choose specialty) 1", "skill", 1, ["Drive"]),
    sp("Tech Redemption", "Mech", 1), sk("Remedy", 1), sk("Survival", 1), sk("Tracking", 1)
  ]),
  guildCareer("Mercenary — Combat Engineer", "Contract Soldiering",
    "Engineers hired out to the highest bidder, and expected to fight as well as build.", [
    ch("body.strength", 1), ch("body.dexterity", 2), ch("body.endurance", 2),
    ch("mind.wits", 1), ch("mind.perception", 1), ch("mind.tech", 2),
    orSpirit("gu-ceng-temper", "Passion", "Calm", 1),
    combatChoice("gu-ceng-combat", 1), sk("Observe", 1), sk("Shoot", 2),
    open("gu-ceng-drive", "Drive (choose specialty) 2", "skill", 2, ["Drive"]),
    sk("Remedy", 1),
    open("gu-ceng-t1", "Tech Redemption (choose primary) 3", "skill", 3, ["Tech Redemption"]),
    open("gu-ceng-t2", "Tech Redemption (choose secondary) 2", "skill", 2, ["Tech Redemption"]),
    sp("Science", "Engineering", 1),
    sp("Warfare", "Artillery", 1), sp("Warfare", "Demolitions", 1)
  ]),
  guildCareer("Scholar", "Learning",
    "Guild-trained erudition, hired by nobles who know the Church is not the only source.", [
    ch("mind.wits", 2), ch("mind.perception", 2), ch("mind.tech", 1),
    ch("spirit.extrovert", 2), ch("spirit.introvert", 2),
    orSpirit("gu-scholar-temper", "Passion", "Calm", 1),
    pickOne("gu-scholar-social", "Charm or Impress +1",
      opt("Charm", sk("Charm", 1)), opt("Impress", sk("Impress", 1))),
    sk("Observe", 1), sk("Academia", 1), sk("Etiquette", 1), sk("Focus", 1), sk("Inquiry", 1),
    open("gu-scholar-t1", "Lore or Science (primary topic) 3", "skill", 3, ["Lore", "Science"]),
    open("gu-scholar-t2", "Lore or Science (secondary topic) 2", "skill", 2, ["Lore", "Science"]),
    lang("Read", "Urthish", 2), sp("Social", "Debate", 1), sk("Think Machine", 1)
  ]),
  guildCareer("Scientist", "Learning",
    "The Engineers are the only ones to turn to on matters of science, and they know it.", [
    ch("mind.wits", 2), ch("mind.perception", 2), ch("mind.tech", 2),
    ch("spirit.introvert", 2),
    orSpirit("gu-scientist-temper", "Passion", "Calm", 1),
    orSpirit("gu-scientist-faith", "Faith", "Ego", 1),
    sk("Academia", 1), sk("Focus", 1), sk("Inquiry", 1),
    open("gu-scientist-t1", "Lore or Science (primary topic) 3", "skill", 3, ["Lore", "Science"]),
    open("gu-scientist-t2", "Lore or Science (secondary topic) 2", "skill", 2, ["Lore", "Science"]),
    lang("Read", "Urthtech", 2),
    open("gu-scientist-r1", "Tech Redemption (choose primary) 3", "skill", 3, ["Tech Redemption"]),
    open("gu-scientist-r2", "Tech Redemption (choose secondary) 2", "skill", 2, ["Tech Redemption"]),
    sk("Think Machine", 1)
  ]),
  guildCareer("Seedy/Illegal Activities", "The Other Jobs",
    "The jobs best left unmentioned on a resume. The best still rise to the top of the profession.", [
    ch("body.strength", 2), ch("body.dexterity", 2), ch("body.endurance", 2),
    ch("mind.perception", 2),
    combatChoice("gu-seedy-combat", 2, true), sk("Dodge", 1), sk("Gambling", 1),
    sk("Inquiry", 1), sk("Knavery", 2), sp("Lore", "Local Underworld", 1), sk("Streetwise", 2),
    // The base entry is two characteristic and five skill points short of the
    // budget on its own; the trade chosen supplies the rest (p.82).
    pickOne("gu-seedy-trade", "Choose a trade",
      opt("Thief",
        orSpirit("gu-seedy-thief-temper", "Passion", "Calm", 2),
        sk("Impress", 1), sk("Observe", 1), sk("Sneak", 1), sk("Sleight of Hand", 2)),
      opt("Spy",
        orSpirit("gu-seedy-spy-social", "Extrovert", "Introvert", 2),
        pickOne("gu-seedy-spy-social-skill", "Charm or Impress +2",
          opt("Charm", sk("Charm", 2)), opt("Impress", sk("Impress", 2))),
        sk("Observe", 2), sk("Sneak", 1)))
  ])
];


/* -------------------------------------------- */
/*  Character Histories — aliens (p.83)         */
/* -------------------------------------------- */

/**
 * The three alien races.
 *
 * Their Upbringings restate the racial bases and maxima the race itself already
 * carries — "Strength (max 9)", "Dexterity (base 4)" — so only the deltas are
 * granted here; module/dice/races.mjs owns the bases and ceilings.
 *
 * "Any of them can hold a Commission in the League or Rank in their own noble
 *  caste" (p.83), so the guild lifepath is open to every race — see
 *  GUILD_FACTIONS above. The Church is not: "An Obun may be Ordained in the
 *  Obun sect of the Church (Voavenlohjun)", and that sect alone, which is the
 *  Voavenlohjun Priest stage below. Neither the Ukari nor the Vorox may be
 *  ordained at all.
 *
 * These stages themselves belong to the races, and are not offered to humans.
 */
const alienStage = (race, name, type, group, description, grants, extra = {}) => ({
  n: name, stage: type, faction: "alien", path: "alien", group,
  d: description, grants, race, ...extra
});

const ALIEN_HISTORY = [
  /* ---- Ur-Obun ---- */
  alienStage("urObun", "Ur-Obun", "upbringing", "Ur-Obun",
    "Raised on Velisamil, or in one of the cosmopolitan colonies. Learning and philosophy above all.", [
    ch("body.dexterity", 1), ch("mind.wits", 1),
    orSpirit("al-obun-social", "Extrovert", "Introvert", 1),
    ch("spirit.calm", 1), ch("spirit.faith", 1),
    {
      ...pickOne("al-obun-occult", "Psi or Theurgy 1 (racial)",
        opt("Psi", ch("occult.psi", 1)),
        opt("Theurgy", ch("occult.theurgy", 1))),
      // Bought with Extra points as part of being Ur-Obun (p.88), so it is not
      // charged against the Upbringing's five characteristic points.
      racial: true
    },
    sk("Empathy", 1), sk("Etiquette", 1),
    pickOne("al-obun-focus", "Focus or Stoic Mind 1",
      opt("Focus", sk("Focus", 1)),
      opt("Stoic Mind", sk("Stoic Mind", 1))),
    lang("Read", "Urthish", 2),
    bless("Just"), curse("Condescending")
  ]),
  alienStage("urObun", "Umo'rin Counselor", "apprenticeship", "Ur-Obun",
    "Trained to stand between quarrelling parties and be trusted by both.", [
    ch("mind.wits", 2), ch("mind.perception", 1),
    orSpirit("al-obun-couns-social", "Extrovert", "Introvert", 2),
    sk("Charm", 2), sk("Observe", 1), sk("Empathy", 1), sk("Etiquette", 1),
    pickOne("al-obun-couns-focus", "Focus or Stoic Mind 1",
      opt("Focus", sk("Focus", 1)), opt("Stoic Mind", sk("Stoic Mind", 1))),
    sk("Inquiry", 1),
    open("al-obun-couns-lore", "Lore (choose topic) 1", "skill", 1, ["Lore"]),
    pickOne("al-obun-couns-social-skill", "Social (Debate or Oratory) 2",
      opt("Debate", sp("Social", "Debate", 2)), opt("Oratory", sp("Social", "Oratory", 2)))
  ]),
  alienStage("urObun", "Voavenlohjun Priest", "apprenticeship", "Ur-Obun",
    "Ordained into the Obun sect of the Church.", [
    ch("mind.wits", 2), ch("spirit.introvert", 1), ch("spirit.faith", 2),
    sk("Charm", 1), sk("Observe", 1), sk("Academia", 1), sk("Alchemy", 1),
    sk("Focus", 2), sp("Lore", "Metaphysics", 1), sk("Remedy", 1), sk("Stoic Mind", 2)
  ]),
  alienStage("urObun", "Vhem-saahen Champion", "apprenticeship", "Ur-Obun",
    "The Obun who fights, which the Obun would rather not discuss.", [
    ch("body.strength", 1), ch("body.dexterity", 2), ch("body.endurance", 1),
    orSpirit("al-obun-champ-temper", "Passion", "Calm", 1),
    pickOne("al-obun-champ-combat", "Combat skill (choose Fight or Melee) +2",
      opt("Fight", sk("Fight", 2)), opt("Melee", sk("Melee", 2))),
    sk("Shoot", 2), sk("Vigor", 1)
  ]),

  alienStage("urObun", "Umo'rin Counselor", "earlyCareer", "Ur-Obun",
    "Sent out to counsel, mediate and be listened to.", [
    ch("body.dexterity", 1), ch("mind.wits", 2), ch("mind.perception", 1),
    orSpirit("al-obun-c-career-social", "Extrovert", "Introvert", 2),
    orSpirit("al-obun-c-career-temper", "Passion", "Calm", 2),
    ch("spirit.faith", 2),
    sk("Charm", 2), sk("Observe", 1), sk("Empathy", 1), sk("Etiquette", 1),
    pickOne("al-obun-c-career-focus", "Focus or Stoic Mind 2",
      opt("Focus", sk("Focus", 2)), opt("Stoic Mind", sk("Stoic Mind", 2))),
    sk("Inquiry", 2),
    open("al-obun-c-career-lore", "Lore (choose topic) 2", "skill", 2, ["Lore"]),
    pickOne("al-obun-c-career-social-skill", "Social (Debate or Oratory) 2",
      opt("Debate", sp("Social", "Debate", 2)), opt("Oratory", sp("Social", "Oratory", 2))),
    pickOne("al-obun-c-career-read", "Read Obunish or Urthish (2 pts)",
      opt("Read (Obunish)", lang("Read", "Obunish", 2)),
      opt("Read (Urthish)", lang("Read", "Urthish", 2))),
    ben("Commissioned", 3)
  ]),
  alienStage("urObun", "Voavenlohjun Priest", "earlyCareer", "Ur-Obun",
    "Ordained in the Obun sect, and posted where the questions are hardest.", [
    ch("body.dexterity", 1), ch("mind.wits", 2), ch("mind.perception", 1),
    ch("spirit.introvert", 2),
    orSpirit("al-obun-p-career-temper", "Passion", "Calm", 2),
    ch("spirit.faith", 2),
    pickOne("al-obun-p-career-social", "Charm or Observe +1",
      opt("Charm", sk("Charm", 1)), opt("Observe", sk("Observe", 1))),
    pickOne("al-obun-p-career-study", "Academia or Alchemy 1",
      opt("Academia", sk("Academia", 1)), opt("Alchemy", sk("Alchemy", 1))),
    sk("Empathy", 1), sk("Focus", 3), sk("Inquiry", 1), sp("Lore", "Metaphysics", 1),
    sk("Physick", 1), sk("Remedy", 2), lang("Read", "Obunish", 2), sk("Stoic Mind", 2),
    ben("Ordained", 3)
  ]),
  alienStage("urObun", "Vhem-saahen Champion", "earlyCareer", "Ur-Obun",
    "The champion in the field, defending what the counsellors could not talk away.", [
    ch("body.strength", 2), ch("body.dexterity", 2), ch("body.endurance", 2),
    ch("mind.wits", 1), ch("mind.perception", 1),
    orSpirit("al-obun-v-career-temper", "Passion", "Calm", 2),
    pickOne("al-obun-v-career-combat", "Combat skill (choose Fight or Melee) +2",
      opt("Fight", sk("Fight", 2)), opt("Melee", sk("Melee", 2))),
    sk("Shoot", 2), sk("Vigor", 1),
    pickOne("al-obun-v-career-focus", "Focus or Stoic Mind 2",
      opt("Focus", sk("Focus", 2)), opt("Stoic Mind", sk("Stoic Mind", 2))),
    sk("Remedy", 2),
    pickOne("al-obun-v-career-style", "Choose a style",
      opt("Martial Arts", action("Martial Fist"), action("Martial Kick"), action("Martial Hold")),
      opt("Fencing", action("Parry"), action("Thrust"), action("Slash"))),
    ben("Ally", 3)
  ]),

  /* ---- Ur-Ukar ---- */
  alienStage("urUkar", "Ur-Ukar", "upbringing", "Ur-Ukar",
    "Raised in the caves of Kordeth, where the clans fight and the light rarely reaches.", [
    ch("body.strength", 1), ch("body.dexterity", 1), ch("mind.perception", 2),
    orSpirit("al-ukar-temper", "Passion", "Calm", 1),
    sk("Fight", 1), sk("Sneak", 1), sk("Knavery", 1), lang("Speak", "Urthish", 2),
    sk("Survival", 1),
    bless("Sensitive Touch"), curse("Bitter"), ben("Ostracized", 1)
  ]),
  alienStage("urUkar", "Chieftain", "apprenticeship", "Ur-Ukar",
    "Raised to lead a clan, which among the Ukari means outliving the alternatives.", [
    ch("body.dexterity", 1), ch("mind.wits", 1), ch("mind.perception", 1),
    ch("spirit.extrovert", 1),
    orSpirit("al-ukar-chief-temper", "Passion", "Calm", 1),
    sk("Dodge", 1),
    pickOne("al-ukar-chief-combat", "Combat skill (choose Fight or Melee) +2",
      opt("Fight", sk("Fight", 2)), opt("Melee", sk("Melee", 2))),
    sk("Impress", 1), sk("Shoot", 1), sk("Knavery", 2), sp("Lore", "Poisons", 1),
    sk("Stoic Mind", 1), sk("Survival", 1)
  ]),
  alienStage("urUkar", "Warrior/Outlaw", "apprenticeship", "Ur-Ukar",
    "The clan's blade, or the one who left and sells it elsewhere.", [
    ch("body.strength", 1), ch("body.dexterity", 2), ch("body.endurance", 1),
    orSpirit("al-ukar-warrior-temper", "Passion", "Calm", 1),
    sk("Dodge", 1),
    pickOne("al-ukar-warrior-combat", "Combat skill (choose Fight or Melee) +2",
      opt("Fight", sk("Fight", 2)), opt("Melee", sk("Melee", 2))),
    sk("Impress", 1), sk("Shoot", 1), sk("Knavery", 2), sp("Lore", "Poisons", 1),
    sk("Stoic Mind", 1), sk("Survival", 1)
  ]),

  alienStage("urUkar", "Chieftain", "earlyCareer", "Ur-Ukar",
    "Quan of the clan, with everything that entails.", [
    ch("body.strength", 1), ch("body.dexterity", 1), ch("body.endurance", 1),
    ch("mind.wits", 1), ch("mind.perception", 1), ch("spirit.extrovert", 2),
    orSpirit("al-ukar-cq-temper", "Passion", "Calm", 2),
    orSpirit("al-ukar-cq-faith", "Faith", "Ego", 1),
    sk("Dodge", 1),
    pickOne("al-ukar-cq-combat", "Combat skill (choose Fight or Melee) +2",
      opt("Fight", sk("Fight", 2)), opt("Melee", sk("Melee", 2))),
    sk("Impress", 1), sk("Shoot", 1), sk("Knavery", 1), sp("Lore", "Poisons", 1),
    sk("Stoic Mind", 1), sk("Survival", 1),
    pickOne("al-ukar-cq-style", "Choose a style",
      opt("Jox Kai Von Boxing", action("Martial Fist"), action("Martial Kick"), action("Martial Hold")),
      opt("Kraxi Knife Fencing", action("Parry"), action("Thrust"), action("Slash"))),
    ben("Nobility", 3)
  ]),
  alienStage("urUkar", "Warrior/Outlaw", "earlyCareer", "Ur-Ukar",
    "Hired out as assassin or mercenary, and rarely asked for references.", [
    ch("body.strength", 2), ch("body.dexterity", 1), ch("body.endurance", 2),
    ch("mind.perception", 1),
    orSpirit("al-ukar-wq-social", "Extrovert", "Introvert", 1),
    orSpirit("al-ukar-wq-temper", "Passion", "Calm", 2),
    orSpirit("al-ukar-wq-faith", "Faith", "Ego", 1),
    sk("Dodge", 1),
    pickOne("al-ukar-wq-combat", "Combat skill (choose Fight or Melee) +2",
      opt("Fight", sk("Fight", 2)), opt("Melee", sk("Melee", 2))),
    sk("Impress", 1), sk("Shoot", 1), sk("Knavery", 1), sp("Lore", "Poisons", 1),
    sk("Stoic Mind", 1), sk("Survival", 1),
    pickOne("al-ukar-wq-style", "Choose a style",
      opt("Jox Kai Von Boxing", action("Martial Fist"), action("Martial Kick"), action("Martial Hold")),
      opt("Kraxi Knife Fencing", action("Parry"), action("Thrust"), action("Slash"))),
    ben("Family Ties", 3)
  ]),

  /* ---- Vorox ---- */
  alienStage("vorox", "Chieftain", "upbringing", "Vorox",
    "Raised to lead a pack on Vorox, and civilised enough afterwards to leave it.", [
    ch("body.strength", 1), ch("body.dexterity", 2), ch("body.endurance", 1),
    ch("mind.wits", 1),
    sk("Impress", 1), sk("Fight", 1), sk("Vigor", 1),
    lang("Speak", "Urthish", 2), lang("Speak", "Voroxish", 2),
    sk("Survival", 1), sk("Tracking", 1),
    bless("Predatory"), bless("Giant"), bless("Sensitive Smell"), curse("Uncouth"),
    ben("Bite", 3), ben("Extra Limbs", 4), ben("Poison Claw", 6),
    ben("Ostracized", 1), ben("No Occult", 3)
  ]),
  alienStage("vorox", "Warrior", "upbringing", "Vorox",
    "Raised to hunt and to fight, and civilised only as far as necessary.", [
    ch("body.strength", 1), ch("body.dexterity", 2), ch("body.endurance", 1),
    ch("spirit.passion", 1),
    sk("Dodge", 1), sk("Fight", 2), sk("Melee", 2), sk("Observe", 1), sk("Sneak", 1),
    sk("Vigor", 1), sk("Remedy", 1), lang("Speak", "Voroxish", 2),
    sk("Survival", 2), sk("Tracking", 2),
    bless("Predatory"), bless("Giant"), bless("Sensitive Smell"), curse("Uncouth"),
    ben("Bite", 3), ben("Extra Limbs", 4),
    ben("Ostracized", 1), ben("No Occult", 3)
  ]),
  alienStage("vorox", "Civilised", "apprenticeship", "Vorox",
    "Taught by humans to move through their society in an acceptable manner.", [
    ch("body.strength", 1), ch("body.dexterity", 1), ch("body.endurance", 1),
    ch("mind.perception", 1), ch("spirit.passion", 1),
    sk("Dodge", 1), sk("Fight", 2), sk("Impress", 1), sk("Melee", 1), sk("Observe", 1),
    sk("Sneak", 1), sk("Vigor", 1), sk("Survival", 1), sk("Tracking", 1)
  ]),

  alienStage("vorox", "Chieftain", "earlyCareer", "Vorox",
    "Knighted, and expected to hold a pack together in human company.", [
    ch("body.strength", 1), ch("body.dexterity", 1), ch("body.endurance", 1),
    ch("mind.wits", 1), ch("mind.perception", 2),
    orSpirit("al-vorox-cq-social", "Extrovert", "Introvert", 1),
    ch("spirit.passion", 2),
    orSpirit("al-vorox-cq-faith", "Faith", "Ego", 1),
    sk("Dodge", 1), sk("Fight", 1), sk("Melee", 1), sk("Observe", 1), sk("Shoot", 1),
    sk("Vigor", 1), sk("Tracking", 1),
    action("Banga (Charge)"), action("Drox"),
    ben("Nobility", 3)
  ]),
  alienStage("vorox", "Warrior", "earlyCareer", "Vorox",
    "Sold as shock troops or guerrilla fighters, and worth every firebird.", [
    ch("body.strength", 1), ch("body.dexterity", 1), ch("body.endurance", 1),
    ch("mind.wits", 1), ch("mind.perception", 2),
    orSpirit("al-vorox-wq-social", "Extrovert", "Introvert", 1),
    ch("spirit.passion", 2),
    orSpirit("al-vorox-wq-faith", "Faith", "Ego", 1),
    sk("Dodge", 1), sk("Fight", 1), sk("Melee", 1), sk("Observe", 1), sk("Shoot", 1),
    sk("Vigor", 1), sk("Tracking", 1),
    action("Banga (Charge)"), action("Drox"),
    ben("Family Ties", 3)
  ])
];

/* -------------------------------------------- */
/*  Extra Stages (p.84–85)                      */
/* -------------------------------------------- */

/**
 * "A character may take TWO of the following options. (Exception: Characters who
 *  take the Loaded-for-Bear cybernetics can take only that option.)"
 *
 * Each stage costs 20 of the 40 Extra points, so taking two spends them all:
 * "Extra points are spent during the extra stages: Tour of Duty (two stages,
 *  20 pts per tour)..." (p.85)
 *
 * Rather than grant fixed traits, most Extra Stages hand the player an allowance
 * to distribute — "Skills (choose new ones or add to existing skills) +14" — so
 * they carry `allowance` rather than skill grants.
 */

/**
 * Worldly Benefits offered by a full Tour of Duty (p.84).
 *
 * Three stages offer the same list, and choice ids must be unique across the
 * pack, so the id is supplied by the stage that owns it.
 *
 * @param {string} owner
 * @returns {object}
 */
const worldlyBenefits = owner => pickOne(`${owner}-benefit`, "Worldly Benefits (choose one)",
  opt("Promotion and rewards — rise one rank, Well-Off Riches or 1,000 firebirds",
    note("Rise in rank one level"), ben("Cash", 5)),
  opt("High promotion — rise two ranks, Good Riches or 600 firebirds",
    note("Rise in rank two levels"), ben("Cash", 3)),
  opt("Rich rewards — Wealthy Riches or 2,000 firebirds",
    ben("Assets", 7)),
  opt("Friends — 100 firebirds and 6 points of connections",
    ben("Cash", 1), note("Choose 6 points from Ally, Contact, Gossip Network, Retinue, Passage Contracts or Refuge")),
  opt("Promotion and friends — rise one rank, 100 firebirds, 4 points of connections",
    note("Rise in rank one level"), ben("Cash", 1),
    note("Choose 4 points from Ally, Contact, Gossip Network, Retinue, Passage Contracts or Refuge")));

/**
 * The smaller list offered by a second Tour of Duty (p.84).
 * @param {string} owner
 * @returns {object}
 */
const moreWorldlyBenefits = owner => pickOne(`${owner}-benefit`, "More Worldly Benefits (choose one)",
  opt("Promotion and rewards — rise one rank, and Riches or Cash one level higher",
    note("Rise in rank one level"), note("Raise Riches or Cash by one level")),
  opt("High promotion — rise two ranks",
    note("Rise in rank two levels")),
  opt("Rich rewards — Riches or Cash two levels higher",
    note("Raise Riches or Cash by two levels")),
  opt("Friends — 4 points of connections",
    note("Choose 4 points from Ally, Contact, Gossip Network, Retinue, Passage Contracts or Refuge")));

const EXTRA_STAGES = [
  {
    n: "Tour of Duty", stage: "extra", faction: "", group: "Tours of Duty",
    d: "Another spell in the career already begun, or the start of a new one.",
    cost: 20, allowance: { skills: 14 },
    grants: [...tourCharacteristics("extra-tour"), worldlyBenefits("extra-tour")]
  },
  {
    n: "Another Tour of Duty", stage: "extra", faction: "", group: "Tours of Duty",
    d: "A second tour, taken only by those who served a first.",
    cost: 20, allowance: { skills: 10 },
    requires: "Tour of Duty",
    grants: [...tourCharacteristics("extra-another"), moreWorldlyBenefits("extra-another")]
  },
  {
    n: "Questing Knight Tour of Duty", stage: "extra", faction: "noble", group: "Imperial Tours",
    d: "Sworn to Emperor Alexius and serving in the Company of the Phoenix. Nobles who do so become Questing Knights.",
    cost: 20, allowance: { skills: 10 },
    grants: [...tourCharacteristics("extra-questing"), ben("Imperial Charter", 4),
      worldlyBenefits("extra-questing")]
  },
  {
    n: "Cohort Tour of Duty", stage: "extra", faction: "", group: "Imperial Tours",
    d: "Sworn to Emperor Alexius and serving in the Company of the Phoenix. Priests and guildsmembers who do so become Cohorts.",
    cost: 20, allowance: { skills: 11 },
    grants: [...tourCharacteristics("extra-cohort"), ben("Cohort Badge", 3),
      worldlyBenefits("extra-cohort")]
  },
  {
    n: "Tweaked", stage: "extra", faction: "", group: "Cybernetics",
    d: "Machinery under the skin — a level of intimacy the Church abhors, though noble and guild membership keeps the Inquisition at bay.",
    cost: 20, allowance: { free: 20 },
    grants: [note("Spend 20 Extra points on cybernetic devices, associated characteristics (3 per level) or skills (1 per level). See Chapter Seven, p.220.")]
  },
  {
    n: "Loaded-for-Bear", stage: "extra", faction: "", group: "Cybernetics",
    d: "So much machinery that there is little room for anything else.",
    cost: 40, exclusive: true, allowance: { free: 40 },
    grants: [note("Spend 40 Extra points on cybernetic devices, associated characteristics (3 per level) or skills (1 per level). See Chapter Seven, p.220.")]
  },

  {
    n: "Natal Psi", stage: "extra", faction: "", group: "Psychic Awakening",
    d: "The Wyrd stirs. Characters of any faction except the Vorox may awaken as psychics.",
    cost: 20, allowance: { skills: 1 },
    grants: [
      ch("occult.psi", 3),
      wyrd(2),
      open("extra-natal-1", "Primary path: Level 1 power", "psiPower", 1, [1]),
      open("extra-natal-2", "Primary path: Level 2 power", "psiPower", 1, [2]),
      open("extra-natal-3", "Primary path: Level 3 power", "psiPower", 1, [3]),
      open("extra-natal-skill", "A skill related to a Psi power +1", "skill", 1)
    ]
  },
  {
    n: "Savant Psi", stage: "extra", faction: "", group: "Psychic Awakening",
    d: "Deeper training in the paths already opened.",
    cost: 20, allowance: {},
    requires: "Natal Psi",
    grants: [
      ch("occult.psi", 2),
      wyrd(1),
      open("extra-savant-4", "Primary path: Level 4 power", "psiPower", 1, [4]),
      open("extra-savant-5", "Primary path: Level 5 power", "psiPower", 1, [5]),
      open("extra-savant-s1", "Secondary path: Level 1 power", "psiPower", 1, [1]),
      open("extra-savant-s2", "Secondary path: Level 2 power", "psiPower", 1, [2]),
      worldlyBenefits("extra-savant")
    ]
  },
  {
    n: "Neophyte Theurge", stage: "extra", faction: "", group: "Theurgic Calling",
    d: "The Pancreator answers. A calling to the rites of the Church.",
    cost: 20, allowance: { skills: 1 },
    grants: [
      ch("occult.theurgy", 3),
      wyrd(2),
      open("extra-neophyte-1", "Rite: Level 1", "rite", 1, [1]),
      open("extra-neophyte-2", "Rite: Level 2", "rite", 1, [2]),
      open("extra-neophyte-3", "Rite: Level 3", "rite", 1, [3]),
      open("extra-neophyte-skill", "A skill related to a rite +1", "skill", 1)
    ]
  },
  {
    n: "Adept Theurge", stage: "extra", faction: "", group: "Theurgic Calling",
    d: "Deeper study of the rites already learned.",
    cost: 20, allowance: {},
    requires: "Neophyte Theurge",
    grants: [
      ch("occult.theurgy", 2),
      wyrd(1),
      open("extra-adept-4", "Rite: Level 4", "rite", 1, [4]),
      open("extra-adept-5", "Rite: Level 5", "rite", 1, [5]),
      open("extra-adept-x1", "A further rite: Level 1", "rite", 1, [1]),
      open("extra-adept-x2", "A further rite: Level 2", "rite", 1, [2]),
      worldlyBenefits("extra-adept")
    ]
  }
];

/** The noble Character Histories, and the Extra Stages open to anyone (p.72–p.85). */
export const CHARACTER_HISTORIES = [
  ...UPBRINGING, ...FREEMAN_UPBRINGING,
  ...APPRENTICESHIP, ...PRIEST_APPRENTICESHIP, ...GUILD_APPRENTICESHIP,
  ...EARLY_CAREER, ...PRIEST_CAREER, ...GUILD_CAREER,
  ...ALIEN_HISTORY,
  ...EXTRA_STAGES
];
