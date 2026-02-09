# Fading Suns 2nd Edition Revised - Foundry VTT System

A game system implementation for Fading Suns 2nd Edition Revised in Foundry Virtual Tabletop.

## Installation

### Manual Installation

1. Locate your Foundry VTT data folder:
   - **Windows**: `%localappdata%/FoundryVTT/Data/systems`
   - **Mac**: `~/Library/Application Support/FoundryVTT/Data/systems`
   - **Linux**: `~/.local/share/FoundryVTT/Data/systems`

2. Copy the `fading-suns` folder into the `systems` directory

3. Restart Foundry VTT

4. Create a new world and select "Fading Suns 2nd Edition Revised" as the game system

## Features

### Core Mechanics
- **d20 Roll-Under System**: Roll equal to or under your Goal Number (Characteristic + Skill + Modifiers)
- **Victory Points**: Automatically calculated based on your roll result
- **Critical Success/Failure**: Natural 1 always succeeds, natural 20 always fails critically
- **Victory Chart**: Translates successes into accomplishment levels

### Character Sheet
- **Characteristics**: Body (Strength, Dexterity, Endurance), Mind (Wits, Perception, Tech), Spirit (Extrovert/Introvert, Passion/Calm, Faith/Ego), and Occult (Psi, Theurgy)
- **Skills**: Add skills as items with associated characteristics
- **Items**: Weapons, Armor, Equipment
- **Vitality Tracking**: Automatically calculated (5 + Endurance)
- **Wyrd Points**: Track occult energy

### Rolling Dice
1. Click any dice icon next to a characteristic or skill
2. Enter a modifier when prompted (positive or negative)
3. The system rolls 1d20 and compares it to your Goal Number
4. Chat displays the result with victory points and accomplishment level

## Current Status

This is version 0.1.0 - A minimal working implementation with:
- ✅ Character and NPC sheets
- ✅ Characteristic and skill rolling
- ✅ Victory point calculation
- ✅ Item system (weapons, armor, equipment, skills, psychic powers, theurgic rites)
- ⏳ Combat system (coming soon)
- ⏳ Damage and armor rolls (coming soon)
- ⏳ Psychic powers and theurgy mechanics (coming soon)

## How to Use

### Creating a Character

1. Create a new Actor and select "Character"
2. Fill in characteristics (default is 3 for Body/Mind, paired values for Spirit)
3. Add skills by clicking "Add Skill" in the Skills tab
4. Edit each skill to set its value and associated characteristic
5. Add weapons, armor, and equipment in the Items tab

### Making a Roll

**Characteristic Only:**
- Click the dice icon next to any characteristic
- Enter a modifier (if any)
- The system calculates: Goal = Characteristic + Modifier

**Characteristic + Skill:**
- Click the dice icon next to a skill in the Skills tab
- The system uses the skill's associated characteristic
- Goal = Characteristic + Skill + Modifier

### Understanding Results

The chat message shows:
- **Goal Number**: What you needed to roll equal to or under
- **Dice Result**: What you actually rolled
- **Success/Failure**: Whether you succeeded
- **Victory Points**: How well you succeeded (if applicable)
- **Accomplishment**: Descriptive level of success

Victory Points:
- 1 VP: Barely satisfactory
- 2 VP: Mediocre
- 3 VP: Pretty good
- 4 VP: Good job
- 5 VP: Excellent
- 6 VP: Brilliant
- 7+ VP: Virtuoso performance

## Roadmap

### Phase 2 - Combat
- Combat rolls with victory dice
- Damage rolling (weapon dice + victory dice)
- Armor protection rolls
- Initiative system

### Phase 3 - Advanced Features
- Psychic powers implementation
- Theurgic rites implementation
- Wyrd point expenditure
- Sustained actions
- Contested rolls

### Phase 4 - Polish
- Compendiums with pre-made skills
- Weapon and armor compendiums
- House and faction templates
- Improved styling and layouts

## Development

The system uses:
- **JavaScript (ES6 modules)**: Core logic
- **Handlebars**: Templating
- **CSS**: Styling

Key files:
- `system.json`: System manifest
- `template.json`: Data models
- `module/fading-suns.mjs`: Main initialization
- `module/actor/actor.mjs`: Actor document class with roll mechanics
- `module/actor/actor-sheet.mjs`: Character sheet logic
- `templates/`: Handlebars templates for sheets

## Credits

- **Game System**: Fading Suns 2nd Edition Revised by Holistic Design Inc. & RedBrick Limited
- **Foundry System**: Created for Foundry Virtual Tabletop

## License

This system implementation is unofficial and not affiliated with Holistic Design Inc. or RedBrick Limited.

The Fading Suns game system and setting are copyrighted by Holistic Design Inc.
