/**
 * Source data for the Learned Skills compendium (Core Rules p.99–p.115).
 *
 * Each entry becomes one skill Item. The `characteristic` is the pairing the
 * rulebook gives in that skill's "Roll:" line; where a skill is rolled against
 * several characteristics depending on the situation, the most common one is
 * used as the sheet default and can be changed per character.
 *
 * Descriptions are original summaries, not rulebook text.
 *
 * Flags: g = guild skill (restricted to Merchant League professions, p.99)
 *        f = faction skill (tied to a specific house, sect or guild)
 */

/** @type {Array<{name: string, specialty?: string, char: string, g?: boolean, f?: string, desc: string}>} */
export const LEARNED_SKILLS = [
  // ---- A ----
  { name: "Academia", char: "mind.wits", desc: "Finding written information in libraries, guild records and Second Republic archives." },
  { name: "Acrobatics", char: "body.dexterity", desc: "Tumbling, balance and complex bodily movement, including work on apparatus." },
  { name: "Alchemy", char: "spirit.faith", desc: "The occult study of substances, their purity and the correspondences between them." },
  { name: "Archery", char: "body.dexterity", desc: "Use of bows. Primitive but silent, and legal on worlds that forbid firearms." },
  { name: "Artisan", char: "body.dexterity", desc: "Skilled handcraft — smithing, carpentry, tailoring and similar trades." },

  // Arts and Performance both cover creative work; Arts is the making, Performance the doing.
  { name: "Arts", char: "spirit.introvert", desc: "Creating works of art. Take a specialty for each medium practised." },
  { name: "Arts", specialty: "Painting", char: "spirit.introvert", desc: "Composition, pigment and technique in two dimensions." },
  { name: "Arts", specialty: "Sculpture", char: "spirit.introvert", desc: "Working stone, metal or clay into three-dimensional form." },
  { name: "Arts", specialty: "Writing", char: "spirit.introvert", desc: "Poetry, prose and dramatic composition." },

  // ---- B ----
  { name: "Beast Lore", char: "mind.wits", desc: "Knowledge of animals — habits, husbandry, tracking sign and handling." },
  { name: "Bureaucracy", char: "mind.wits", desc: "Navigating Imperial, Church and guild officialdom, and the paperwork that binds them." },

  // ---- C ----
  { name: "Combat Actions", specialty: "Fencing", char: "body.dexterity", desc: "Formal blade techniques: parry, thrust, slash and the advanced duelling actions." },
  { name: "Combat Actions", specialty: "Martial Arts", char: "body.dexterity", desc: "Formal unarmed techniques and their advanced actions." },
  { name: "Crossbow", char: "body.dexterity", desc: "Use of crossbows, common on low-tech and firearm-restricted worlds." },

  // ---- D ----
  { name: "Disguise", char: "mind.perception", desc: "Altering appearance and bearing to pass as someone else." },
  { name: "Drive", specialty: "Aircraft", char: "mind.tech", desc: "Piloting atmospheric craft." },
  { name: "Drive", specialty: "Beastcraft", char: "body.dexterity", desc: "Driving beast-drawn carts, carriages and sledges." },
  { name: "Drive", specialty: "Landcraft", char: "body.dexterity", desc: "Operating ground vehicles, from groundcars to treaded haulers." },
  { name: "Drive", specialty: "Spacecraft", char: "mind.tech", g: true, desc: "Piloting starships. A Charioteer monopoly." },
  { name: "Drive", specialty: "Watercraft", char: "body.dexterity", desc: "Handling boats and ships on water." },

  // ---- E ----
  { name: "Empathy", char: "mind.perception", desc: "Reading the emotions and sincerity of others." },
  { name: "Etiquette", char: "mind.wits", desc: "Correct conduct in court, church and guildhall, and knowing whose toes not to tread on." },

  // ---- F ----
  { name: "Focus", char: "spirit.calm", desc: "Concentrating the will. Underpins most psychic powers and theurgic rites." },

  // ---- G ----
  { name: "Gambling", char: "mind.wits", desc: "Games of chance and skill, along with the arithmetic and the cheating." },

  // ---- I ----
  { name: "Inquiry", char: "mind.wits", desc: "Getting information out of people through questioning, charm or persistence." },

  // ---- K ----
  { name: "Knavery", char: "spirit.extrovert", desc: "Deception, misdirection and the confidence trick." },

  // ---- L ----
  { name: "Lockpicking", char: "body.dexterity", desc: "Defeating mechanical locks, and the simpler electronic ones." },
  { name: "Lore", specialty: "Folk", char: "mind.wits", desc: "Common belief, custom and superstition among the peasantry." },
  { name: "Lore", specialty: "Jumproads", char: "mind.tech", desc: "The jumpweb — routes, gate keys and which lanes are closed." },
  { name: "Lore", specialty: "Object", char: "mind.wits", desc: "Deep knowledge of a single class of object or subject. Name it in the specialty." },
  { name: "Lore", specialty: "Regional", char: "mind.wits", desc: "The geography, politics and personalities of one world or region." },
  { name: "Lore", specialty: "Xeno", char: "mind.wits", desc: "The culture, history and habits of one alien race." },

  // ---- P ----
  { name: "Performance", char: "spirit.extrovert", desc: "Performing before an audience. Take a specialty for each art practised." },
  { name: "Performance", specialty: "Dance", char: "spirit.extrovert", desc: "Formal and folk dance." },
  { name: "Performance", specialty: "Music", char: "spirit.extrovert", desc: "Playing an instrument or singing." },
  { name: "Physick", char: "mind.tech", desc: "Serious medicine: anatomy, surgery, disease and its prevention." },

  // ---- R ----
  { name: "Read", specialty: "Barbarian", char: "mind.wits", desc: "Reading a barbarian script. Name the tongue in the specialty." },
  { name: "Read", specialty: "Latin", char: "mind.wits", desc: "Reading Church Latin, the language of scripture and canon law." },
  { name: "Read", specialty: "Urthish", char: "mind.wits", desc: "Reading Urthish, the common written tongue of the Known Worlds." },
  { name: "Read", specialty: "Urthtech", char: "mind.wits", desc: "Reading technical Urthtech — manuals, schematics and Second Republic records." },
  { name: "Read", specialty: "Xeno", char: "mind.wits", desc: "Reading an alien script. Name the tongue in the specialty." },
  { name: "Remedy", char: "mind.wits", desc: "First aid: stopping bleeding, setting bones and keeping the wounded alive." },
  { name: "Ride", char: "body.dexterity", desc: "Riding beasts, and staying on them when things go wrong." },

  // ---- S ----
  { name: "Science", specialty: "Anthropology", char: "mind.wits", g: true, desc: "The study of human cultures and their development." },
  { name: "Science", specialty: "Archaeology", char: "mind.wits", g: true, desc: "Recovering and interpreting the material remains of the past." },
  { name: "Science", specialty: "Astronomy", char: "mind.wits", g: true, desc: "Stellar cartography, orbital mechanics and the reading of the sky." },
  { name: "Science", specialty: "Biology", char: "mind.wits", g: true, desc: "The study of living organisms and their systems." },
  { name: "Science", specialty: "Chemistry", char: "mind.wits", g: true, desc: "Reactions, compounds and analysis of substances." },
  { name: "Science", specialty: "Cybernetics", char: "mind.tech", g: true, desc: "The theory behind machine augmentation of the body." },
  { name: "Science", specialty: "Engineering", char: "mind.tech", g: true, desc: "Design and analysis of structures, engines and power systems." },
  { name: "Science", specialty: "Genetics", char: "mind.wits", g: true, desc: "Heredity and the manipulation of the genome — deeply suspect to the Church." },
  { name: "Science", specialty: "Geology", char: "mind.wits", g: true, desc: "Rock, strata and the mineral wealth of a world." },
  { name: "Science", specialty: "Meteorology", char: "mind.wits", g: true, desc: "Weather patterns and their prediction." },
  { name: "Science", specialty: "Physics", char: "mind.wits", g: true, desc: "Matter, energy and the laws governing them." },
  { name: "Science", specialty: "Terraforming", char: "mind.tech", g: true, desc: "Reshaping a world's climate and biosphere. Largely a lost art." },
  { name: "Science", specialty: "Xeno-Biology", char: "mind.wits", g: true, desc: "The biology of non-Urth lifeforms." },
  { name: "Search", char: "mind.perception", desc: "Systematically examining a place or person for what has been hidden." },
  { name: "Sleight of Hand", char: "body.dexterity", desc: "Palming, planting and picking pockets." },
  { name: "Social", specialty: "Acting", char: "spirit.extrovert", desc: "Sustaining a false persona convincingly and at length." },
  { name: "Social", specialty: "Debate", char: "mind.wits", desc: "Formal argument, and winning it in front of witnesses." },
  { name: "Social", specialty: "Leadership", char: "spirit.extrovert", desc: "Commanding others and holding them together under pressure." },
  { name: "Social", specialty: "Oratory", char: "spirit.passion", desc: "Moving a crowd with a speech." },
  { name: "Spacesuit", char: "mind.tech", g: true, desc: "Working in vacuum: seals, tethers, air management and emergency drill." },
  { name: "Speak", specialty: "Barbarian", char: "mind.wits", desc: "Speaking a barbarian tongue. Name it in the specialty." },
  { name: "Speak", specialty: "Dialects", char: "mind.wits", desc: "Regional variants and the ability to place a speaker by their accent." },
  { name: "Speak", specialty: "Graceful Tongue", char: "mind.wits", f: "al-Malik", desc: "The poetic court language of House al-Malik." },
  { name: "Speak", specialty: "Latin", char: "mind.wits", desc: "Spoken Church Latin, used in liturgy and among the clergy." },
  { name: "Speak", specialty: "Scraver Cant", char: "mind.wits", f: "Scravers", desc: "The cryptolect of the Scravers guild." },
  { name: "Speak", specialty: "Urthish", char: "mind.wits", desc: "The common spoken tongue of the Known Worlds." },
  { name: "Speak", specialty: "Xeno", char: "mind.wits", desc: "Speaking an alien tongue. Name it in the specialty." },
  { name: "Stoic Body", char: "spirit.calm", desc: "Enduring physical pain, hardship and deprivation without breaking." },
  { name: "Stoic Mind", char: "spirit.calm", desc: "Resisting fear, coercion and mental intrusion." },
  { name: "Streetwise", char: "mind.wits", desc: "Reading the underside of a city and knowing who to ask and who to avoid." },
  { name: "Survival", char: "mind.wits", desc: "Staying alive in the wild: shelter, water, forage and direction." },

  // ---- T ----
  { name: "Tech Redemption", specialty: "Craft", char: "mind.tech", g: true, desc: "Coaxing pre-industrial machinery back into service." },
  { name: "Tech Redemption", specialty: "High-Tech", char: "mind.tech", g: true, desc: "Repairing Second Republic and better technology. Rare and jealously guarded." },
  { name: "Tech Redemption", specialty: "Mech", char: "mind.tech", g: true, desc: "Repairing engines, drives and mechanical systems." },
  { name: "Tech Redemption", specialty: "Volt", char: "mind.tech", g: true, desc: "Repairing electrical and electronic systems." },
  { name: "Think Machine", char: "mind.tech", g: true, desc: "Operating and coaxing results from thinking machines — a Church-watched art." },
  { name: "Throwing", char: "body.dexterity", desc: "Throwing weapons and grenades accurately." },
  { name: "Torture", char: "mind.wits", desc: "Inflicting pain to extract information, and knowing when it stops working." },
  { name: "Tracking", char: "mind.perception", desc: "Following sign left by people and beasts, and covering your own." },

  // ---- W ----
  { name: "Warfare", specialty: "Artillery", char: "mind.tech", desc: "Crewing and directing indirect-fire weapons." },
  { name: "Warfare", specialty: "Demolitions", char: "mind.tech", desc: "Placing and defusing explosive charges." },
  { name: "Warfare", specialty: "Gunnery", char: "body.dexterity", desc: "Operating vehicle- and ship-mounted weapons." },
  { name: "Warfare", specialty: "Military Tactics", char: "mind.wits", desc: "Manoeuvring bodies of troops and reading a battlefield." },

  // ---- X ----
  { name: "Xeno-Empathy", char: "mind.perception", desc: "Reading the intent of an alien whose expressions are not human." }
];
