/**
 * Source data for the Character Histories compendium (Core Rules p.72–p.85).
 *
 * This is the Hawkwood vertical slice: three Hawkwood Upbringings, the six noble
 * Apprenticeships and the five noble Early Careers. The Apprenticeship and Early
 * Career stages are shared across all five royal houses, so transcribing the
 * remaining houses means adding Upbringings only.
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

const opt = (label, ...grants) => ({ label, grants });
const pickOne = (id, label, ...options) => ({ kind: "choice", id, label, pick: 1, options });
const pickN = (id, label, pick, ...options) => ({ kind: "choice", id, label, pick, options });
const open = (id, label, pool, value, filter) => ({ kind: "choice", id, label, pick: 1, pool, value, filter });

/** "Extrovert or Introvert +1" and friends, which recur across many stages. */
const orSpirit = (id, a, b, value) => pickOne(
  id, `${a} or ${b} +${value}`,
  opt(a, ch(`spirit.${a.toLowerCase()}`, value)),
  opt(b, ch(`spirit.${b.toLowerCase()}`, value))
);

/* -------------------------------------------- */
/*  Upbringing — Hawkwood (p.73–74)             */
/* -------------------------------------------- */

const UPBRINGING = [
  {
    n: "High-Court (Hawkwood)", stage: "upbringing", faction: "noble", group: "Hawkwood",
    d: "Raised in a palace among servants and tutors, watched closely and held to high expectations — but present when foreign visitors call and famous things happen.",
    grants: [
      ch("body.strength", 1), ch("body.dexterity", 1), ch("mind.wits", 1),
      pri("spirit.extrovert", 2),
      sk("Melee", 1), sk("Etiquette", 1), sp("Lore", "Heraldry", 1),
      lang("Read", "Urthish", 2),
      bless("Unyielding"), curse("Prideful")
    ]
  },
  {
    n: "Rural Estate (Hawkwood)", stage: "upbringing", faction: "noble", group: "Hawkwood",
    d: "Raised in a manor or castle, far from high-court but well above the lot of freemen. Tutors divide their time, leaving the child to find her own way.",
    grants: [
      ch("body.strength", 2), ch("body.dexterity", 1), ch("mind.wits", 1),
      pri("spirit.extrovert", 1),
      sk("Etiquette", 1), sp("Lore", "Fief", 1), lang("Read", "Urthish", 2), sk("Ride", 1),
      bless("Unyielding"), curse("Prideful")
    ]
  },
  {
    n: "Landless (Hawkwood)", stage: "upbringing", faction: "noble", group: "Hawkwood",
    d: "The family is landless and lives on the charity of other nobles. Many homes in one childhood, and the insults of higher-born children to answer.",
    grants: [
      ch("body.strength", 1), ch("body.dexterity", 2), ch("mind.wits", 1),
      pri("spirit.extrovert", 1),
      sk("Impress", 1), sk("Vigor", 1), sk("Melee", 2), sk("Ride", 1),
      bless("Unyielding"), curse("Prideful")
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
      note("Fencing Actions: Parry, Thrust, Slash")
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
          note("Fencing Actions: Parry, Thrust, Slash, Draw & Strike")),
        opt("Advanced — only with the Duelist Apprenticeship",
          note("Fencing Actions: Draw & Strike, and either Parry/Riposte or Disarm and Feint"))),
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

/** The Hawkwood vertical slice of the Character Histories (p.72–p.85). */
export const CHARACTER_HISTORIES = [...UPBRINGING, ...APPRENTICESHIP, ...EARLY_CAREER];
