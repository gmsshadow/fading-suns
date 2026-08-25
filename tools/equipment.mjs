/**
 * Source data for the Weapons and Armour compendium (Core Rules Chapter Seven,
 * charted at p.296–p.300).
 *
 * Weapons Key (p.296): "Damage: Number of d6s rolled. STR: Strength required to
 * wield the weapon (otherwise -2 goal roll). RNG: Range in meters (Short/Long
 * Range; any distance past long is Extreme). Shots: The amount of ammunition the
 * weapon holds. Rate: The maximum number of actions allowed with this weapon per
 * turn. Cost: In firebirds."
 *
 * Ranged weapons take -2 to the goal roll at Long range and -4 at Extreme.
 *
 * Fields — weapons:
 *   n    name
 *   t    weapon category: melee | fight | ranged | thrown
 *   sk   attack skill
 *   ini  initiative modifier
 *   goal goal modifier
 *   d    damage dice
 *   str  Strength required; below it the wielder takes -2 to the goal roll
 *   rng  [short, long] in metres
 *   sh   shots held
 *   rate maximum actions per turn
 *   sz   size: XS, S, M, L, XL
 *   c    cost in firebirds
 *   cn   cost note, where the chart gives more than a number
 *   auto capable of autofire
 *   e    anything else the chart footnotes
 *
 * Fields — armour:
 *   n    name
 *   def  defence dice
 *   str/dex/vig  penalties to those characteristics
 *   c    cost in firebirds
 *   cn   cost note
 *   es   may be worn with an energy shield
 *   e    footnote
 */

/* -------------------------------------------- */
/*  Melee weapons (p.297)                       */
/* -------------------------------------------- */

const MELEE = [
  { n: "Knife", d: 3, str: 1, sz: "S", c: 2 },
  { n: "Dirk", d: 4, str: 2, sz: "M", c: 4 },
  { n: "Main Gauche", d: 3, str: 2, sz: "M", c: 4, e: "When parrying, armour value is 5 plus victory points." },
  { n: "Rapier", d: 5, str: 3, sz: "L", c: 10 },
  { n: "Broadsword", d: 6, str: 4, sz: "L", c: 15 },
  { n: "Scimitar/Katana", d: 6, str: 3, sz: "L", c: 20 },
  { n: "Two-handed Sword", ini: 1, d: 8, str: 6, sz: "XL", c: 30 },
  { n: "Glankesh Vorox Sword", d: 6, str: 4, sz: "L", c: 25, cn: "15 for a Vorox" },
  { n: "Axe", d: 7, str: 5, sz: "L", c: 5 },
  { n: "Spear", ini: 1, d: 5, str: 3, sz: "XL", c: 1 },
  { n: "Staff", ini: 1, d: 4, str: 3, sz: "XL", c: 1, cn: "1 crest" },
  { n: "Club", d: 4, str: 2, sz: "L", c: 1, cn: "1 wing" },
  { n: "Mace", d: 5, str: 3, sz: "L", c: 10 },
  { n: "Flail", d: 4, str: 4, sz: "L", c: 4 },
  { n: "Whip", ini: 1, goal: -1, d: 3, str: 4, sz: "XL", c: 3 },
  { n: "Suresnake Whip", ini: 1, goal: 3, d: 3, str: 4, sz: "XL", c: 100, e: "The bonus applies against one chosen target, who must not leave sight for more than three turns." },
  { n: "Garrote", ini: -1, goal: -1, d: 3, str: 3, sz: "XS", c: 5, e: "Requires a successful grapple first, at -6 to the goal unless the target is unaware. Damage plus victory dice is then rolled each turn." },

  // Energy melee weapons (p.297)
  { n: "Shocker", d: 0, sz: "", c: 30, e: "An electrified melee weapon; use the weapon's own traits, with three extra damage dice." },
  { n: "Vibrating Blade", d: 0, sz: "", c: 100, e: "Use the blade's own traits." },
  { n: "Frap Stick", ini: -1, d: 6, str: 5, sz: "L", c: 15, e: "Inflicts three dice if used as a club." },

  // Artifact melee weapons (p.297)
  { n: "Wireblade", d: 8, str: 2, sz: "L", c: 10000, cn: "Tech level 10", e: "Ignores physical armour, though not energy shields." },
  { n: "Flux Sword", goal: 1, d: 7, str: 3, sz: "L", c: 15000, cn: "Tech level 10", e: "Leaks through energy shields: damage dice rolling 1 or 2 ignore shields." },
  { n: "Mist Sword", goal: 1, d: 7, str: 3, sz: "L", c: 30000, cn: "Tech level 10", e: "Psychically attuned. Leaks through energy shields: damage dice rolling 1 or 2 ignore shields." }
];

/* -------------------------------------------- */
/*  Thrown weapons (p.297)                      */
/* -------------------------------------------- */

const THROWN = [
  { n: "Throwing Knife", d: 3, str: 3, rng: [5, 10], rate: 2, sz: "S", c: 2 },
  { n: "Throwing Star", d: 2, str: 2, rng: [5, 10], rate: 2, sz: "XS", c: 2, e: "Up to three may be thrown in one action, at -1 to the goal per extra star." },
  { n: "Dart", d: 2, str: 2, rng: [5, 10], rate: 2, sz: "XS", c: 2, e: "Up to three may be thrown in one action, at -1 to the goal per extra dart." },
  { n: "Rock", d: 2, str: 2, rng: [5, 10], rate: 2, sz: "S", c: 0, e: "Thrown on Dexterity + Vigor, or Dexterity + Throwing at +1 to the goal." }
];

/* -------------------------------------------- */
/*  Bows and crossbows (p.298)                  */
/* -------------------------------------------- */

const BOWS = [
  { n: "Hunting Bow", sk: "Archery", d: 4, str: 4, rng: [20, 30], rate: 3, sz: "M", c: 5, cn: "1 wing per arrow" },
  { n: "Long Bow", sk: "Archery", d: 6, str: 6, rng: [40, 60], rate: 2, sz: "L", c: 10, cn: "1 wing per arrow" },
  { n: "Target Bow", sk: "Archery", d: 3, str: 3, rng: [30, 40], rate: 2, sz: "M", c: 7, cn: "1 wing per arrow" },
  { n: "Hand Crossbow", d: 3, str: 2, rng: [10, 20], rate: 1, sz: "S", c: 7, cn: "3 wings per bolt", e: "Strength 3 is needed to recock it. Reloading takes two actions." },
  { n: "Medium Crossbow", d: 6, str: 3, rng: [20, 30], rate: 1, sz: "M", c: 10, cn: "1 crest per bolt", e: "Strength 6 is needed to recock it. Reloading takes two actions." },
  { n: "Heavy Crossbow", d: 8, str: 3, rng: [20, 30], rate: 1, sz: "L", c: 15, cn: "1 crest per bolt", e: "Strength 8 is needed to recock it. Reloading takes two actions." }
];

/* -------------------------------------------- */
/*  Slug guns (p.298)                           */
/* -------------------------------------------- */

const SLUG = [
  { n: "Derringer (.32)", goal: -1, d: 3, rng: [5, 10], sh: 4, rate: 2, sz: "XS", c: 50, cn: "5 slugs per firebird" },
  { n: "Light Revolver (.32)", d: 4, rng: [10, 20], sh: 6, rate: 3, sz: "S", c: 100, cn: "5 slugs per firebird" },
  { n: "Light Autofeed (.32)", d: 4, rng: [10, 20], sh: 13, rate: 3, sz: "S", c: 150, cn: "5 slugs per firebird" },
  { n: "Medium Revolver (.40)", d: 5, rng: [20, 30], sh: 6, rate: 3, sz: "S", c: 200, cn: "3 slugs per firebird" },
  { n: "Medium Autofeed (.40)", d: 5, rng: [20, 30], sh: 10, rate: 3, sz: "S", c: 250, cn: "3 slugs per firebird" },
  { n: "Heavy Revolver (.47)", d: 6, rng: [30, 40], sh: 6, rate: 3, sz: "M", c: 250, cn: "1 slug per firebird" },
  { n: "Heavy Autofeed (.47)", d: 6, rng: [30, 40], sh: 8, rate: 3, sz: "M", c: 300, cn: "1 slug per firebird" },
  { n: "Imperial Rifle (.40)", d: 6, rng: [40, 60], sh: 10, rate: 2, sz: "XL", c: 200, cn: "3 slugs per firebird" },
  { n: "Assault Rifle (10mm)", d: 7, rng: [40, 60], sh: 30, rate: 3, sz: "XL", c: 500, cn: "2 firebirds per slug", auto: true },
  { n: "Sniper Rifle (13mm)", d: 8, rng: [50, 70], sh: 5, rate: 2, sz: "XL", c: 700, cn: "3 firebirds per slug" },
  { n: "SMG (.40)", d: 5, rng: [30, 40], sh: 20, rate: 3, sz: "L", c: 350, cn: "3 slugs per firebird", auto: true },
  { n: "Shotgun (shot)", d: 8, rng: [20, 30], sh: 7, rate: 2, sz: "L", c: 300, cn: "2 loads per firebird", e: "One damage die fewer per five metres from the target." },
  { n: "Shotgun (slug, .47)", d: 7, rng: [30, 40], sh: 7, rate: 2, sz: "L", c: 300, cn: "1 slug per firebird" }
];

/* -------------------------------------------- */
/*  Energy guns (p.298)                         */
/* -------------------------------------------- */

const ENERGY = [
  { n: "Palm Laser", d: 3, rng: [5, 10], sh: 7, rate: 2, sz: "XS", c: 200, cn: "10 per cell" },
  { n: "Laser Pistol", goal: 1, d: 5, rng: [10, 20], sh: 15, rate: 2, sz: "S", c: 300, cn: "10 per cell" },
  { n: "Laser Rifle", goal: 1, d: 7, rng: [30, 40], sh: 23, rate: 2, sz: "XL", c: 500, cn: "10 per cell" },
  { n: "Assault Laser", goal: 1, d: 8, rng: [20, 30], sh: 20, rate: 2, sz: "XL", c: 700, cn: "10 per cell" },
  { n: "Blaster Pistol", d: 7, rng: [10, 20], sh: 10, rate: 1, sz: "S", c: 700, cn: "10 per cell", e: "Leaks through energy shields: damage dice rolling 1 or 2 ignore shields." },
  { n: "Blaster Rifle", d: 9, rng: [20, 30], sh: 15, rate: 1, sz: "XL", c: 1000, cn: "10 per cell", e: "Leaks through energy shields: damage dice rolling 1 or 2 ignore shields." },
  { n: "Blaster Shotgun", goal: 2, d: 9, rng: [10, 20], sh: 8, rate: 1, sz: "L", c: 1200, cn: "10 per cell", e: "Leaks through energy shields. One damage die fewer per five metres from the target." },
  { n: "Screecher (Sonic)", goal: 1, d: 5, rng: [10, 20], sh: 15, rate: 1, sz: "S", c: 300, cn: "10 per cell", e: "Halve damage against targets with hearing protection." },
  { n: "Flamegun", goal: 2, d: 5, rng: [10, 20], sh: 10, rate: 1, sz: "L", c: 150, cn: "5 per canister", e: "Heat damage: dice rolling 1 ignore all armour, including shields. Three further dice of burning damage each turn after the first, without victory dice, until a turn rolls no damage." },
  { n: "Stunner", goal: 1, d: 4, rng: [10, 20], sh: 15, rate: 2, sz: "S", c: 300, cn: "10 per cell", dmgType: "stun", e: "Any damage forces an Endurance + Vigor roll or the target is stunned for that turn and the next; a critical failure knocks them out. Damage exceeding Endurance knocks them out on a failure. Heals completely after one span." },
  { n: "Neural Disruptor", goal: -3, d: 5, rng: [10, 20], sh: 6, rate: 1, sz: "S", c: 3000, cn: "10 per cell", dmgType: "energy", e: "Damage exceeding the target's Endurance or Psi, whichever is higher, renders them unconscious. Armour does not protect, except a Psi Cloak. Psychics may roll Psi + Stoic Mind against the attacker's successes." }
];

/* -------------------------------------------- */
/*  Heavy weapons (p.299)                       */
/* -------------------------------------------- */

const HEAVY = [
  { n: "Light Machinegun (10mm)", d: 7, rng: [50, 70], sh: 50, rate: 3, sz: "XL", c: 750, cn: "2 firebirds per slug", auto: true },
  { n: "Grenade Launcher", goal: 1, d: 0, rng: [15, 25], sh: 1, rate: 1, sz: "L", c: 500, cn: "65 per grenade", e: "Damage varies with the grenade used." },
  { n: "Rocketeer", goal: -2, d: 9, rng: [20, 30], sh: 5, rate: 1, sz: "XL", c: 400, cn: "25 per grenade" },
  { n: "Missile Launcher", goal: 1, d: 0, rng: [75, 100], sh: 1, rate: 1, sz: "XL", c: 800, cn: "100 per missile", e: "Damage varies with the missile. High explosive inflicts 18 dice as a grenade; armour piercing inflicts 13 dice against one target, and armour rolls only half its protection dice." }
];

/* -------------------------------------------- */
/*  Armour (p.299)                              */
/* -------------------------------------------- */

const ARMOUR = [
  { n: "Padded Clothing", def: 1, c: 0, cn: "Varies", es: true },
  { n: "Heavy Cloth", def: 2, c: 0, cn: "Varies", es: true },
  { n: "Polymer Knit", def: 2, c: 200, es: true, e: "Six dice against slug weapons." },
  { n: "Spacesuit", def: 3, c: 100 },
  { n: "Leather Jerkin", def: 4, c: 5 },
  { n: "Synthsilk", def: 4, c: 300, es: true },
  { n: "Studded Leather", def: 5, c: 8, cn: "15 for plastic studs" },
  { n: "Half Plate", def: 6, dex: -1, c: 30 },
  { n: "Half Plate (Plastic)", def: 6, c: 60 },
  { n: "Scale Mail", def: 7, dex: -1, vig: -1, c: 13 },
  { n: "Scale Mail (Plastic)", def: 7, dex: -1, c: 20 },
  { n: "Stiffsynth", def: 7, dex: -1, c: 500 },
  { n: "Chain Mail", def: 8, dex: -1, vig: -2, c: 20 },
  { n: "Plastic Mesh", def: 8, dex: -1, c: 50 },
  { n: "Armour Mesh Spacesuit", def: 8, dex: -1, c: 500 },
  { n: "Plate", def: 10, dex: -2, vig: -2, c: 40 },
  { n: "Plate (Plastic)", def: 10, dex: -1, vig: -1, c: 80 },
  { n: "Ceramsteel", def: 14, dex: -5, vig: -5, c: 1000, e: "The penalties do not apply if the suit is powered." },
  { n: "Adept Robes", def: 14, str: 2, dex: 1, c: 0, cn: "Not for sale", e: "Brother Battle only. Use the ceramsteel penalties if unpowered." },
  { n: "Flame Retardant", def: 3, c: 50, e: "Three dice against fire only. An addition to other armour." },
  { n: "Frictionless Gel", def: 6, dex: -2, c: 500, e: "Worn over any other armour; modifiers are cumulative. Defence is halved against energy weapons." },
  { n: "Psi Cloak", def: 10, c: 3000, e: "Shields the wearer against psychic attack and neural disruptors." }
];

/* -------------------------------------------- */
/*  Shields and energy shields (p.300)          */
/* -------------------------------------------- */

const SHIELDS = [
  { n: "Buckler", def: 4, shieldDamage: 3, c: 7, cn: "12 for plastic", sz: "M" },
  { n: "Large Shield", def: 8, shieldDamage: 6, c: 15, cn: "20 for plastic", sz: "L" }
];

const ENERGY_SHIELDS = [
  { n: "Standard Energy Shield", min: 5, max: 10, hits: 10, c: 500 },
  { n: "Duelling Energy Shield", min: 5, max: 10, hits: 15, c: 700, e: "Concealable." },
  { n: "Assault Energy Shield", min: 5, max: 15, hits: 20, c: 3000, e: "Very rare. Its wider field allows it to be worn with leather, plastic or most metal armour, though not plate." },
  { n: "Battle Energy Shield", min: 5, max: 20, hits: 30, c: 5000 }
];

/* -------------------------------------------- */

const tagWeapons = (entries, type, skill, category) =>
  entries.map(e => ({ ...e, t: e.t ?? type, sk: e.sk ?? skill, cat: category }));

/** Every weapon charted in the core rules (p.296–p.299). */
export const WEAPONS = [
  ...tagWeapons(MELEE, "melee", "Melee", "melee"),
  ...tagWeapons(THROWN, "thrown", "Throwing", "thrown"),
  ...tagWeapons(BOWS, "ranged", "Shoot", "bows"),
  ...tagWeapons(SLUG, "ranged", "Shoot", "slug"),
  ...tagWeapons(ENERGY, "ranged", "Shoot", "energy"),
  ...tagWeapons(HEAVY, "ranged", "Shoot", "heavy")
];

/** Armour, shields and energy shields (p.299–p.300). */
export const ARMOURS = [
  ...ARMOUR.map(e => ({ ...e, cat: "armour" })),
  ...SHIELDS.map(e => ({ ...e, cat: "shield" })),
  ...ENERGY_SHIELDS.map(e => ({ ...e, cat: "energyShield" }))
];
