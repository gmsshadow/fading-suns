/**
 * Extend the basic ActorSheet
 */
export class FadingSunsActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["fading-suns", "sheet", "actor"],
      width: 720,
      height: 800,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "characteristics" }]
    });
  }

  /** @override */
  get template() {
    return `systems/fading-suns/templates/actor/actor-${this.actor.type}-sheet.hbs`;
  }

  /** @override */
  async getData() {
    const context = super.getData();
    
    // Get the Actor's data
    const actorData = this.actor.toObject(false);
    context.system = actorData.system;
    context.flags = actorData.flags;

    // Prepare items by type
    context.items = {};
    context.skills = [];
    context.weapons = [];
    context.armor = [];
    context.equipment = [];
    context.psychicPowers = [];
    context.theurgicRites = [];

    // Categorize items
    for (let i of this.actor.items) {
      const item = i.toObject(false);
      if (item.type === 'skill') {
        context.skills.push(item);
      } else if (item.type === 'weapon') {
        context.weapons.push(item);
      } else if (item.type === 'armor') {
        context.armor.push(item);
      } else if (item.type === 'equipment') {
        context.equipment.push(item);
      } else if (item.type === 'psychic-power') {
        context.psychicPowers.push(item);
      } else if (item.type === 'theurgic-rite') {
        context.theurgicRites.push(item);
      }
    }

    // Sort skills alphabetically
    context.skills.sort((a, b) => a.name.localeCompare(b.name));

    // Add roll data for TinyMCE editors
    context.enrichedBiography = await TextEditor.enrichHTML(
      this.actor.system.biography,
      {
        secrets: this.actor.isOwner,
        async: true
      }
    );

    return context;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Rollable abilities
    html.find('.rollable').click(this._onRoll.bind(this));

    // Item management
    html.find('.item-create').click(this._onItemCreate.bind(this));
    html.find('.item-edit').click(this._onItemEdit.bind(this));
    html.find('.item-delete').click(this._onItemDelete.bind(this));
  }

  /**
   * Handle clickable rolls
   */
  async _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;

    // Handle characteristic rolls
    if (dataset.rollType === 'characteristic') {
      const characteristic = dataset.characteristic;
      const skillName = dataset.skill || null;
      
      // Ask for modifier
      const modifier = await this._getModifierDialog();
      if (modifier !== null) {
        this.actor.rollCheck(characteristic, skillName, modifier);
      }
    }

    // Handle skill rolls
    if (dataset.rollType === 'skill') {
      const skillName = dataset.skillName;
      const characteristic = dataset.characteristic;
      
      // Ask for modifier
      const modifier = await this._getModifierDialog();
      if (modifier !== null) {
        this.actor.rollCheck(characteristic, skillName, modifier);
      }
    }
  }

  /**
   * Show dialog to get roll modifier
   */
  async _getModifierDialog() {
    return new Promise((resolve) => {
      new Dialog({
        title: "Roll Modifier",
        content: `
          <form>
            <div class="form-group">
              <label>Modifier:</label>
              <input type="number" name="modifier" value="0" autofocus />
            </div>
          </form>
        `,
        buttons: {
          roll: {
            label: "Roll",
            callback: (html) => {
              const modifier = parseInt(html.find('[name="modifier"]').val()) || 0;
              resolve(modifier);
            }
          },
          cancel: {
            label: "Cancel",
            callback: () => resolve(null)
          }
        },
        default: "roll"
      }).render(true);
    });
  }

  /**
   * Handle creating a new item
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    const type = header.dataset.type;
    
    const itemData = {
      name: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      type: type,
      system: {}
    };

    return await Item.create(itemData, {parent: this.actor});
  }

  /**
   * Handle editing an item
   */
  _onItemEdit(event) {
    event.preventDefault();
    const li = $(event.currentTarget).parents(".item");
    const item = this.actor.items.get(li.data("itemId"));
    item.sheet.render(true);
  }

  /**
   * Handle deleting an item
   */
  async _onItemDelete(event) {
    event.preventDefault();
    const li = $(event.currentTarget).parents(".item");
    const item = this.actor.items.get(li.data("itemId"));
    
    // Confirm deletion
    const confirmed = await Dialog.confirm({
      title: `Delete ${item.name}?`,
      content: `<p>Are you sure you want to delete ${item.name}?</p>`
    });
    
    if (confirmed) {
      await item.delete();
      li.slideUp(200, () => this.render(false));
    }
  }
}
