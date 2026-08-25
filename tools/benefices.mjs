/**
 * Source data for the Benefices and Afflictions compendium (Core Rules p.117–p.124).
 *
 * "While Blessings and Curses represent features inherent to an individual
 *  (directly modifying characteristics or skills), Benefices and Afflictions are
 *  based on the individual's place in society." (p.117)
 *
 * They therefore carry no die modifiers. What they do carry is a point cost, and
 * most of them are *ranked* — the cost varies with how much of the benefice the
 * character wants, and each rank means something specific:
 *
 *   Refuge          2 = small farm … 10 = military base
 *   Cash            1 = 100 firebirds … 11 = 4000 firebirds
 *   Nobility        3 = knight … 13 = duke
 *
 * Modelling those ranks as data rather than prose is the point of this pack: a
 * character sheet can then show "Refuge 6 (Monastery)" and a creation wizard can
 * total the spend correctly.
 *
 * Characters begin with 5 points of Benefices (p.118). Afflictions are negative
 * Benefices and grant further points to spend.
 *
 * Fields:
 *   n      name
 *   p      "benefice" | "affliction"
 *   cat    category
 *   c      cost in points; for ranked entries this is the lowest rank
 *   ranks  [{ value, label }] where the entry is bought at varying cost
 *   fb     starting firebirds this entry grants, where it grants any
 *   inc    yearly income in firebirds, for Assets
 *   req    prerequisite, in the character's own terms
 *   excl   entry this one cannot be combined with
 *   d      short summary, in original words
 */

/* -------------------------------------------- */
/*  Background (p.118)                          */
/* -------------------------------------------- */

const BACKGROUND = [
  {
    n: "Alien Upbringing", p: "benefice", c: 2,
    d: "Raised by another race. Begins with that species' Speak skill in place of their own, and is distrusted by nearly everyone.",
    excl: "Orphan"
  },
  {
    n: "Heir", p: "benefice", c: 3,
    d: "Next in line for a position of importance, though when it falls due is anyone's guess. A noble heir still needs the Nobility Benefice."
  },
  {
    n: "Secrets", p: "benefice", c: 1,
    d: "The character knows something worth knowing. What it is should be settled with the gamemaster.",
    ranks: [
      { value: 1, label: "Blackmail on a minor noble" },
      { value: 2, label: "A secret coven of psychics" },
      { value: 3, label: "The Imperial Eye on your homeworld" },
      { value: 4, label: "A cache of Second Republic goods" },
      { value: 5, label: "The location of a forgotten planet" }
    ]
  },
  {
    n: "Well-Travelled", p: "benefice", c: 3,
    d: "Counts as Folk Lore 1 for every major planet within the travel radius.",
    ranks: [
      { value: 3, label: "A Royal House's fiefs" },
      { value: 5, label: "The Known Worlds" }
    ]
  },
  {
    n: "Addiction", p: "affliction", c: 2,
    d: "Dependent on some substance. Withdrawal symptoms are for the gamemaster to shape.",
    ranks: [
      { value: 2, label: "Basic — one dose weekly, cheap and easily got" },
      { value: 3, label: "Stronger — twice weekly" },
      { value: 4, label: "Stronger, and the substance is rare or illegal" }
    ]
  },
  {
    n: "Cloistered", p: "affliction", c: 1,
    d: "Raised apart from other people and never quite over it. Awkward with others, and others find them odd."
  },
  {
    n: "Dark Secret", p: "affliction", c: 1,
    d: "Something the character will do almost anything to keep buried.",
    ranks: [
      { value: 1, label: "Embarrassing" },
      { value: 2, label: "Dangerous" },
      { value: 3, label: "Life-threatening" }
    ]
  },
  {
    n: "Infamous Family", p: "affliction", c: 1,
    d: "The family has a reputation, and it is not a good one. Can be taken alongside Nobility."
  },
  {
    n: "Lost Worlder", p: "affliction", c: 1,
    d: "From a world only recently rediscovered. Fitting in is a struggle and most people are wary."
  },
  {
    n: "Oath of Fealty", p: "affliction", c: 1,
    d: "An oath owed above and beyond the character's ordinary obligations, usually with something given in return.",
    ranks: [
      { value: 1, label: "Serious — will aid in major dealings, in exchange for the same" },
      { value: 2, label: "Martial — will risk life for a great boon" },
      { value: 3, label: "Extreme — will undertake a suicide mission" }
    ]
  },
  {
    n: "Obligation", p: "affliction", c: 1,
    d: "A duty that cannot be avoided, and unlike an Oath of Fealty nothing comes back in return.",
    ranks: [
      { value: 1, label: "Hindrance — must be somewhere particular at set times" },
      { value: 2, label: "Hazardous — puts the character's life at risk" },
      { value: 3, label: "Extreme" }
    ]
  },
  {
    n: "Orphan", p: "affliction", c: 1,
    d: "Lost their family young and nothing replaced it. Cannot be taken with Nobility or Alien Upbringing.",
    excl: "Nobility"
  },
  {
    n: "Stigma", p: "affliction", c: 1,
    d: "Something that would unnerve a superstitious peasant. Occultists and the cybernetically altered have a mild Stigma already and gain no points for it.",
    ranks: [
      { value: 1, label: "Mild — a wandering eye, hair on the palms" },
      { value: 2, label: "Severe — dwarfism, a hunched back" },
      { value: 3, label: "Fearsome — pointed fangs" },
      { value: 4, label: "Unholy — red eyes, a forked tongue" }
    ]
  },
  {
    n: "Vow", p: "affliction", c: 1,
    d: "Something the character has sworn to give up. The gamemaster sets the value by its weight in play.",
    ranks: [
      { value: 1, label: "Celibacy" },
      { value: 2, label: "Poverty" },
      { value: 3, label: "Silence" }
    ]
  }
];

/* -------------------------------------------- */
/*  Community (p.119)                           */
/* -------------------------------------------- */

const COMMUNITY = [
  {
    n: "Ally", p: "benefice", c: 1,
    d: "Someone in a position of power who will go out of their way to help. Costs two points less than buying that rank of Status outright — a Hawkwood duke as an ally is 11 points against the 13 the title itself would cost."
  },
  {
    n: "Contact", p: "benefice", c: 1,
    d: "An acquaintance who helps in small ways — information, a fair price, a place to stay."
  },
  {
    n: "Family Ties", p: "benefice", c: 3,
    d: "Exceptionally loyal relations of similar standing. It cuts both ways: kin killed must be avenged."
  },
  {
    n: "Gossip Network", p: "benefice", c: 1,
    d: "Informants who keep the character current. The wider the net, the less reliable each strand.",
    ranks: [
      { value: 1, label: "A city or community" },
      { value: 2, label: "Planetwide" },
      { value: 3, label: "An entire Royal House's holdings" },
      { value: 4, label: "The Known Worlds" }
    ]
  },
  {
    n: "Protection", p: "benefice", c: 3,
    d: "Someone is looking out for the character. Something is usually owed in return."
  },
  {
    n: "Retinue", p: "benefice", c: 1,
    d: "Servants whose loyalty is bought with points rather than wages.",
    ranks: [
      { value: 1, label: "Unskilled — butler, handmaiden" },
      { value: 2, label: "Noncombat specialist — cook, chauffeur" },
      { value: 3, label: "Combat able or multitalented — bodyguard, seneschal" },
      { value: 4, label: "Fanatically loyal" }
    ]
  },
  {
    n: "Dependent", p: "affliction", c: 1,
    d: "Somebody relies on the character heavily — an ageing relative, a child, a friend forever in trouble."
  },
  {
    n: "Vendetta", p: "affliction", c: 1,
    d: "An unyielding enemy earned by the character, their family or their friends.",
    ranks: [
      { value: 1, label: "Content to make the character's life miserable" },
      { value: 2, label: "Wants the character dead" },
      { value: 3, label: "A group" },
      { value: 4, label: "Multiple groups" }
    ]
  }
];

/* -------------------------------------------- */
/*  Possessions (p.120)                         */
/* -------------------------------------------- */

const POSSESSIONS = [
  {
    n: "Jumpkey", p: "benefice", c: 2,
    d: "Holds the coordinates of one jumproute, working both ways between two worlds. The Charioteers take a dim view of others carrying them."
  },
  {
    n: "Passage Contracts", p: "benefice", c: 2,
    d: "A standing arrangement with a guild for starship passage. The accommodation varies considerably.",
    ranks: [
      { value: 2, label: "Tramp freighter — you ride with the cargo" },
      { value: 4, label: "Transport — a room shared with nine others" },
      { value: 6, label: "Stateroom — built for two, known to hold eight" },
      { value: 8, label: "Luxury liner" },
      { value: 10, label: "The ship is at your command" }
    ]
  },
  {
    n: "Refuge", p: "benefice", c: 2,
    d: "Somewhere the character can go and feel safe, almost always open to them.",
    ranks: [
      { value: 2, label: "Small farm" },
      { value: 4, label: "Guild safe house" },
      { value: 6, label: "Monastery" },
      { value: 8, label: "Castle" },
      { value: 10, label: "Military base" }
    ]
  }
];

/* -------------------------------------------- */
/*  Artifacts and Relics (p.120–121)            */
/* -------------------------------------------- */

const ARTIFACTS = [
  { n: "Advisor", p: "benefice", c: 5, d: "A hand-held think machine with an artificial intelligence. Crude, and more annoying than helpful at times." },
  { n: "Flux Sword", p: "benefice", c: 11, d: "An energy sword built on advanced blaster and shield technology. Rare, though still occasionally made." },
  { n: "Mist Sword", p: "benefice", c: 13, d: "A flux sword psychically attuned to its wielder. Sought after by psychic covens." },
  { n: "Neural Disrupter", p: "benefice", c: 10, d: "A banned weapon that attacks the victim's brain cells." },
  { n: "Psi Cloak", p: "benefice", c: 10, d: "Second Republic technology that shields the wearer against psychic attack and neural disrupters." },
  { n: "Wireblade", p: "benefice", c: 12, d: "A monomolecular blade that parts ceramsteel, and clumsy wielders with it. No longer manufactured." },
  { n: "Adept Robes", p: "benefice", c: 20, d: "Fusion-powered ceramsteel armour of the Brother Battle order. Only a Brother Battle character may begin with them.", req: "Brother Battle" },
  { n: "Article of Faith", p: "benefice", c: 1, d: "An item that aids a theurge in one particular rite. One point per +1 bonus." },
  { n: "Saint's Lore", p: "benefice", c: 2, d: "A relic esteemed by the faithful. Two points per rite, plus one per level of that rite." },
  { n: "Vestments", p: "benefice", c: 1, d: "Properly blessed Church equipment. Earned through service, never bought with money." },
  { n: "Wyrd Tabernacle", p: "benefice", c: 2, d: "A holy vessel of spiritual energy. Two points per point of Wyrd it holds." }
];

/* -------------------------------------------- */
/*  Riches (p.121–122)                          */
/* -------------------------------------------- */

const RICHES = [
  {
    n: "Cash", p: "benefice", c: 1, cat: "riches",
    d: "Ready money, freely accessible and spendable on starting equipment. Unlike Assets, once it is gone it is gone.",
    ranks: [
      { value: 1, label: "100 firebirds", fb: 100 },
      { value: 2, label: "300 firebirds", fb: 300 },
      { value: 3, label: "600 firebirds", fb: 600 },
      { value: 5, label: "1,000 firebirds", fb: 1000 },
      { value: 7, label: "2,000 firebirds", fb: 2000 },
      { value: 9, label: "3,000 firebirds", fb: 3000 },
      { value: 11, label: "4,000 firebirds", fb: 4000 }
    ]
  },
  {
    n: "Assets", p: "benefice", c: 3, cat: "riches",
    d: "Land, a business or loans producing regular income. The character controls it rather than owning it, and begins play with a tenth of the yearly figure in hand.",
    ranks: [
      { value: 3, label: "Good — 3,000 a year", fb: 300, inc: 3000 },
      { value: 5, label: "Well-off — 5,000 a year", fb: 500, inc: 5000 },
      { value: 7, label: "Wealthy — 10,000 a year", fb: 1000, inc: 10000 },
      { value: 9, label: "Rich — 15,000 a year", fb: 1500, inc: 15000 },
      { value: 11, label: "Filthy Rich — 20,000 a year", fb: 2000, inc: 20000 }
    ]
  },
  {
    n: "Fief", p: "benefice", c: 3, cat: "riches",
    d: "A form of Assets: land and the serfs who work it. Resources matter more than size — a single gold mine may be worth a province of farmland.",
    ranks: [
      { value: 3, label: "Shire or village (baronet), tenant farms" },
      { value: 5, label: "Borough or town (baron) with a silver mine" },
      { value: 7, label: "Province or city (earl or marquis), prime farmland" },
      { value: 9, label: "County or capital city (count), living on taxation" },
      { value: 11, label: "Continent or moon (duke), raw or refined resources" }
    ]
  },
  {
    n: "Business", p: "benefice", c: 3, cat: "riches",
    d: "A form of Assets: an enterprise producing wealth, run by the character or by a trusted partner.",
    ranks: [
      { value: 3, label: "A hospital for those who can pay" },
      { value: 5, label: "Crafting or manufacture of luxury goods" },
      { value: 7, label: "A weaponscrafter mill" },
      { value: 9, label: "High-tech manufacturing — ceramsteel, think machines, fusion" },
      { value: 11, label: "A starport, shipyard or starbase" }
    ]
  },
  {
    n: "Tariffs/Loans", p: "benefice", c: 3, cat: "riches",
    d: "A form of Assets, and the most volatile: taxation on trade, or money lent at a fee. Debtors default and merchants refuse to pay.",
    ranks: [
      { value: 3, label: "An agora, taxing the stallholders" },
      { value: 5, label: "Small loans to prominent locals" },
      { value: 7, label: "Agora taxation continent- or planetwide" },
      { value: 9, label: "An interstellar trade route monopoly" },
      { value: 11, label: "An interstellar banking institution" }
    ]
  },
  {
    n: "Debt", p: "affliction", c: 2, cat: "riches",
    d: "Money owed, and someone impatient to have it back.",
    ranks: [
      { value: 2, label: "Modest debt" },
      { value: 4, label: "Major debt — must work hard to pay it off" },
      { value: 6, label: "Catastrophic — risks losing fief and rank" },
      { value: 7, label: "Catastrophic, with life at risk" }
    ]
  }
];

/* -------------------------------------------- */
/*  Racial (p.83)                               */
/* -------------------------------------------- */

/**
 * Traits belonging to the alien races. These are not chosen freely — a Vorox
 * pays for the ones its Character History grants, and no one else may take them.
 */
const RACIAL = [
  {
    n: "Bite", p: "benefice", c: 3, race: "vorox",
    d: "A Vorox's jaws. Rolled on Dexterity + Fight at -1 initiative, for three dice of damage."
  },
  {
    n: "Extra Limbs", p: "benefice", c: 4, race: "vorox",
    d: "Six limbs in total, usable as arms or legs."
  },
  {
    n: "Poison Claw", p: "benefice", c: 6, race: "vorox",
    d: "The mark of a royal Vorox. Rolled on Dexterity + Fight for three dice of damage. The poison is a slow paralytic: a target that takes damage suffers a cumulative -1 per turn on all physical actions, and once the turns equal its Vitality rating it can take no physical action for the rest of the span."
  },
  {
    n: "Ostracized", p: "affliction", c: 1,
    d: "Shunned by Known Worlds society. Most aliens carry this simply for being alien.",
    ranks: [
      { value: 1, label: "Mild — treated with suspicion" },
      { value: 2, label: "Moderate — refused service and shelter" },
      { value: 3, label: "Severe — driven out, or worse" }
    ]
  },
  {
    n: "No Occult", p: "affliction", c: 3, race: "vorox",
    d: "Cannot awaken Psi or Theurgy, ever. The Vorox mind has no door for it."
  }
];

/* -------------------------------------------- */
/*  Status (p.123–124)                          */
/* -------------------------------------------- */

const STATUS = [
  {
    n: "Nobility", p: "benefice", c: 3,
    d: "Membership of a noble house. A minor house title carries less power than the same title in a royal house.",
    ranks: [
      { value: 3, label: "Knight" },
      { value: 5, label: "Baronet" },
      { value: 7, label: "Baron" },
      { value: 9, label: "Marquis or Earl" },
      { value: 11, label: "Count" },
      { value: 13, label: "Duke" }
    ]
  },
  {
    n: "Ordained", p: "benefice", c: 3,
    d: "An ordained minister of the Church.",
    ranks: [
      { value: 3, label: "Novice" },
      { value: 5, label: "Deacon" },
      { value: 7, label: "Fellow" },
      { value: 9, label: "Crafter" },
      { value: 11, label: "Engineer" },
      { value: 13, label: "Master" }
    ]
  },
  {
    n: "Commissioned", p: "benefice", c: 3,
    d: "Rank within a Merchant League guild.",
    ranks: [
      { value: 3, label: "Associate" },
      { value: 5, label: "Manager" },
      { value: 7, label: "Boss" },
      { value: 9, label: "Jonin" },
      { value: 11, label: "Consul" },
      { value: 13, label: "Dean" }
    ]
  },
  {
    n: "Cohort Badge", p: "benefice", c: 3,
    d: "An Imperial Cohort — aide to a Questing Knight. Carries 100 firebirds a year, free Imperial Navy transport, freedom from feudal tolls and free counsel at law. Also a 3 point Oath of Fealty.",
    req: "Ordained or Commissioned at 3 points or better", fb: 100
  },
  {
    n: "Imperial Charter", p: "benefice", c: 4,
    d: "Granted to Questing Knights. Carries 300 firebirds a year, free Imperial Navy transport, the right to inspect public Church and League records, freedom from feudal tolls and immunity from outside prosecution. Also a 3 point Oath of Fealty.",
    req: "Nobility at 3 points or better", fb: 300
  },
  {
    n: "Coven", p: "benefice", c: 2,
    d: "Membership of a psychic coven. Non-psychics may join by pledging service. Membership is illegal in the eyes of the Church."
  },
  {
    n: "Householder", p: "benefice", c: 1,
    d: "Employed by a noble house, guild or sect without holding rank in it. A guardsman, groundskeeper or cook, with the small courtesies that brings."
  },
  {
    n: "Bastard", p: "affliction", c: 1,
    d: "The bastard child of a noble. May still buy a title, but will inherit nothing."
  },
  {
    n: "Black Sheep", p: "affliction", c: 1,
    d: "Ostracised by their own family. Requires the Nobility Benefice.",
    req: "Nobility",
    ranks: [
      { value: 1, label: "Ostracised — never at court, nor where the family goes" },
      { value: 2, label: "Actively opposed by the family" },
      { value: 3, label: "Hunted by the family" }
    ]
  },
  {
    n: "Outlander", p: "affliction", c: 1,
    d: "An outsider to Known Worlds society, looked at askance by every class. May begin with no more than three points in Etiquette."
  }
];

/* -------------------------------------------- */

const tag = (entries, category) => entries.map(e => ({ ...e, cat: e.cat ?? category }));

/** Every Benefice and Affliction sampled in the core rules, p.117–p.124. */
export const BENEFICES_AND_AFFLICTIONS = [
  ...tag(RACIAL, "racial"),
  ...tag(BACKGROUND, "background"),
  ...tag(COMMUNITY, "community"),
  ...tag(POSSESSIONS, "possessions"),
  ...tag(ARTIFACTS, "artifacts"),
  ...tag(RICHES, "riches"),
  ...tag(STATUS, "status")
];

/** Points of Benefices every character begins with (p.118). */
export const STARTING_BENEFICE_POINTS = 5;
