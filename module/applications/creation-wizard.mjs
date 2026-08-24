import {
  applyStages, createState, resolveChoices, findOverages, clampToCap,
  beneficeSpend, extraPointBudget, extraPointSpend, applyExtraPurchases,
  STAGE_BUDGET, CUSTOM_BUDGET, STARTING_CAP, EXTRA_COSTS
} from "../lifepath/grants.mjs";
import { applyLifepathToActor, parseSkillLabel } from "../lifepath/apply.mjs";

const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;

/** The stages a guided lifepath walks through, in order (p.70). */
const STAGE_ORDER = ["upbringing", "apprenticeship", "earlyCareer"];

/** The wizard's steps, in order. */
const STEPS = ["mode", "upbringing", "apprenticeship", "earlyCareer", "choices", "benefices", "extras", "review"];

/**
 * The character creation wizard (p.70–p.89).
 *
 * Nothing is written to the actor until the final step. Everything before that
 * lives in this application's own state, so the wizard can be abandoned at any
 * point without leaving a half-built character behind.
 */
export class FadingSunsCreationWizard extends HandlebarsApplicationMixin(ApplicationV2) {

  /**
   * @param {Actor} actor
   * @param {object} [options]
   */
  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;

    // Named `draft` rather than `state`: ApplicationV2 exposes `state` as a
    // getter for its own render state, and a subclass cannot shadow it.
    this.draft = {
      mode: "guided",
      step: "mode",
      faction: "noble",
      group: "",
      stages: {},      // stageType -> Item
      choices: {},     // choice id -> option index, list of indices, or grant
      picked: {},      // choice id -> the pool value chosen, for redisplay
      benefices: [],   // Step Five: [{uuid, name, value, polarity, ranks}]
      extras: {        // Step Six purchases
        characteristics: {},
        skills: {},
        wyrd: 0,
        blessings: [],
        benefices: [],
        combatActions: []
      }
    };
  }

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    id: "fading-suns-creation-{id}",
    classes: ["fading-suns", "creation-wizard"],
    position: { width: 680, height: 720 },
    window: { title: "FADINGSUNS.Creation.Title", icon: "fa-solid fa-wand-sparkles", resizable: true },
    actions: {
      setMode: FadingSunsCreationWizard.#onSetMode,
      setFaction: FadingSunsCreationWizard.#onSetFaction,
      chooseStage: FadingSunsCreationWizard.#onChooseStage,
      clearStage: FadingSunsCreationWizard.#onClearStage,
      back: FadingSunsCreationWizard.#onBack,
      next: FadingSunsCreationWizard.#onNext,
      apply: FadingSunsCreationWizard.#onApply,
      addBenefice: FadingSunsCreationWizard.#onAddBenefice,
      addSuggested: FadingSunsCreationWizard.#onAddSuggested,
      removeBenefice: FadingSunsCreationWizard.#onRemoveBenefice,
      buyExtra: FadingSunsCreationWizard.#onBuyExtra,
      removeExtra: FadingSunsCreationWizard.#onRemoveExtra
    }
  };

  /** @inheritDoc */
  static PARTS = {
    body: { template: "systems/fading-suns/templates/creation/wizard.hbs", scrollable: [".wizard-body"] }
  };

  /* -------------------------------------------- */
  /*  Context                                     */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const step = this.draft.step;

    Object.assign(context, {
      actor: this.actor,
      config: CONFIG.FADING_SUNS,
      draft: this.draft,
      step,
      steps: this.#stepList(),
      isCustom: this.draft.mode === "custom",
      customBudget: CUSTOM_BUDGET,
      cap: STARTING_CAP,
      canGoBack: STEPS.indexOf(step) > 0,
      canGoNext: this.#canAdvance()
    });

    if (STAGE_ORDER.includes(step)) {
      context.stageType = step;
      context.stageLabel = game.i18n.localize(CONFIG.FADING_SUNS.stageTypes[step]);
      context.budget = STAGE_BUDGET[step];
      context.groups = await this.#availableStages(step);
      context.selected = this.draft.stages[step] ?? null;
    }

    if (step === "choices") context.choices = await this.#allChoices();
    if (step === "benefices") Object.assign(context, await this.#beneficeContext());
    if (step === "extras") Object.assign(context, await this.#extraContext());
    if (step === "review") context.review = this.#review();

    return context;
  }

  /**
   * The step list for the progress rail, with the stage steps hidden in custom mode.
   * @returns {Array<{id: string, label: string, done: boolean, current: boolean}>}
   */
  #stepList() {
    const current = STEPS.indexOf(this.draft.step);
    return STEPS
      .filter(id => this.draft.mode !== "custom" || (!STAGE_ORDER.includes(id) && id !== "choices"))
      .map(id => ({
        id,
        label: game.i18n.localize(`FADINGSUNS.Creation.Step.${id}`),
        done: STEPS.indexOf(id) < current,
        current: id === this.draft.step
      }));
  }

  /**
   * Stages of a given type matching the chosen faction, gathered under their
   * grouping — house for Upbringings, pastime for Apprenticeships — because a
   * flat list of fifteen is more than anyone wants to scan.
   *
   * @param {string} stageType
   * @returns {Promise<Array<{name: string, stages: Item[]}>>}
   */
  async #availableStages(stageType) {
    const pack = game.packs.get("fading-suns.character-histories");
    if (!pack) return [];

    const documents = (await pack.getDocuments())
      .filter(d => d.system.stageType === stageType && d.system.faction === this.draft.faction);

    const groups = new Map();
    for (const stage of documents) {
      const key = stage.system.group || "";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(stage);
    }

    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, stages]) => ({
        name,
        stages: stages
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(stage => ({
            id: stage.id,
            uuid: stage.uuid,
            description: stage.system.description,
            // Documents are named "Upbringing: High-Court (Hawkwood)" so the
            // compendium sidebar reads well. Under a house heading both the
            // stage type and the house are redundant, so they come off.
            label: stage.name
              .replace(/^[^:]+:\s*/, "")
              .replace(name ? ` (${name})` : "", "")
              .trim()
          }))
      }));
  }

  /* -------------------------------------------- */
  /*  Step Five: Benefices (p.88)                 */
  /* -------------------------------------------- */

  /**
   * Everything the Benefices step needs: the catalogue to choose from, what has
   * been chosen, and the running budget.
   * @returns {Promise<object>}
   */
  async #beneficeContext() {
    const pack = game.packs.get("fading-suns.benefices-afflictions");
    const catalogue = pack ? await pack.getDocuments() : [];

    const groups = new Map();
    for (const entry of catalogue.sort((a, b) => a.name.localeCompare(b.name))) {
      const key = entry.system.category;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({
        uuid: entry.uuid,
        name: entry.name,
        polarity: entry.system.polarity,
        value: entry.system.value,
        ranks: entry.system.ranks
      });
    }

    const budget = CONFIG.FADING_SUNS.startingBeneficePoints;
    const spent = beneficeSpend(this.draft.benefices);

    return {
      beneficeGroups: [...groups.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entries]) => ({
          key,
          label: game.i18n.localize(CONFIG.FADING_SUNS.beneficeCategories[key] ?? key),
          entries
        })),
      chosenBenefices: this.draft.benefices,
      suggestions: this.#suggestedBenefices(),
      beneficeRestrictions: this.chosenStages
        .map(stage => stage.system.beneficeRestriction)
        .filter(Boolean),
      beneficeBudget: budget,
      beneficeSpent: spent,
      beneficeRemaining: budget - spent,
      beneficeOver: spent > budget
    };
  }

  /**
   * The Suggested Benefices from every chosen stage, merged.
   *
   * The rulebook offers these against the faction and house write-ups (p.72–76).
   * Two stages may suggest the same entry — every noble Upbringing suggests
   * Nobility — so duplicates collapse, keeping the highest suggested rank and
   * recording which stages proposed it.
   *
   * @returns {Array<{label: string, uuid: string, value: number, note: string,
   *                  from: string[], taken: boolean}>}
   */
  #suggestedBenefices() {
    const merged = new Map();

    for (const stage of this.chosenStages) {
      for (const entry of stage.system.suggestedBenefices ?? []) {
        const existing = merged.get(entry.uuid);
        if (existing) {
          existing.value = Math.max(existing.value, entry.value);
          if (!existing.from.includes(stage.name)) existing.from.push(stage.name);
          continue;
        }
        merged.set(entry.uuid, {
          label: entry.label,
          uuid: entry.uuid,
          value: entry.value,
          note: entry.note,
          from: [stage.name]
        });
      }
    }

    // Mark what has already been taken, so the list reads as advice not a to-do.
    for (const suggestion of merged.values()) {
      suggestion.taken = this.draft.benefices.some(b => b.uuid === suggestion.uuid);
    }

    return [...merged.values()]
      .map(entry => ({
        ...entry,
        // Stage names carry their type as a prefix, which is noise in a chip.
        from: entry.from.map(name => name.replace(/^[^:]+:\s*/, "")).join(", ")
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  /* -------------------------------------------- */
  /*  Step Six: Extra points (p.88)               */
  /* -------------------------------------------- */

  /**
   * The Extra point pool, what it has been spent on, and what is left.
   * @returns {Promise<object>}
   */
  async #extraContext() {
    const state = this.#lifepathState();

    // Curses come from the chosen stages; Afflictions from Step Five. Both add
    // to the pool (p.88, p.117).
    const curses = [];
    for (const uuid of state.curses) {
      const document = await fromUuid(uuid);
      if (document) curses.push({ cost: document.system.cost });
    }
    const afflictions = this.draft.benefices.filter(b => b.polarity === "affliction");

    const budget = extraPointBudget({
      curses,
      afflictions,
      base: CONFIG.FADING_SUNS.startingExtraPoints
    });
    const spent = extraPointSpend(this.draft.extras);

    return {
      extraBudget: budget,
      extraSpent: spent,
      extraRemaining: budget - spent,
      extraOver: spent > budget,
      extraFromCurses: curses.reduce((n, c) => n + Math.abs(c.cost ?? 0), 0),
      extraFromAfflictions: afflictions.reduce((n, a) => n + a.value, 0),
      extraCosts: EXTRA_COSTS,
      characteristicOptions: Object.entries(CONFIG.FADING_SUNS.rollableCharacteristics)
        .map(([path, label]) => ({ value: path, label: game.i18n.localize(label) })),
      skillOptions: (await this.#skillPool()).map(label => ({ value: label, label })),
      blessingOptions: await this.#blessingOptions(),
      combatActionOptions: await this.#combatActionOptions(),
      purchases: this.#purchaseRows()
    };
  }

  /**
   * Blessings that can be bought with Extra points (p.88). Curses are excluded:
   * they are taken to gain points, not spent on.
   * @returns {Promise<Array<{value: string, label: string}>>}
   */
  async #blessingOptions() {
    const pack = game.packs.get("fading-suns.blessings-curses");
    if (!pack) return [];
    const documents = await pack.getDocuments();
    return documents
      .filter(d => d.system.polarity === "blessing")
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(d => ({ value: d.uuid, label: `${d.name} (${d.system.cost})` }));
  }

  /**
   * Combat Actions that can be bought with Extra points, at one point per level
   * (p.88). Unrated actions are excluded — anyone may attempt those.
   * @returns {Promise<Array<{value: string, label: string}>>}
   */
  async #combatActionOptions() {
    const pack = game.packs.get("fading-suns.combat-actions");
    if (!pack) return [];
    const documents = await pack.getDocuments();
    return documents
      .filter(d => d.system.level > 0)
      .sort((a, b) => (a.system.level - b.system.level) || a.name.localeCompare(b.name))
      .map(d => ({
        value: d.uuid,
        label: `${d.name} — ${game.i18n.localize(CONFIG.FADING_SUNS.combatActionCategories[d.system.category])} (${d.system.level})`
      }));
  }

  /** The Extra point purchases so far, as display rows. */
  #purchaseRows() {
    const rows = [];
    for (const [path, levels] of Object.entries(this.draft.extras.characteristics)) {
      if (!levels) continue;
      rows.push({
        kind: "characteristic", key: path, levels,
        label: game.i18n.localize(CONFIG.FADING_SUNS.rollableCharacteristics[path] ?? path),
        cost: levels * EXTRA_COSTS.characteristic
      });
    }
    for (const [label, levels] of Object.entries(this.draft.extras.skills)) {
      if (!levels) continue;
      rows.push({ kind: "skill", key: label, levels, label, cost: levels * EXTRA_COSTS.skill });
    }
    if (this.draft.extras.wyrd) {
      rows.push({
        kind: "wyrd", key: "wyrd", levels: this.draft.extras.wyrd,
        label: game.i18n.localize("FADINGSUNS.Wyrd"),
        cost: this.draft.extras.wyrd * EXTRA_COSTS.wyrd
      });
    }
    for (const blessing of this.draft.extras.blessings) {
      rows.push({ kind: "blessing", key: blessing.uuid, levels: 1, label: blessing.name, cost: blessing.cost });
    }
    for (const action of this.draft.extras.combatActions) {
      rows.push({ kind: "combatAction", key: action.uuid, levels: 1, label: action.name, cost: action.level });
    }
    return rows;
  }

  /* -------------------------------------------- */
  /*  Lifepath resolution                         */
  /* -------------------------------------------- */

  /** The chosen stages, in lifepath order. */
  get chosenStages() {
    return STAGE_ORDER.map(type => this.draft.stages[type]).filter(Boolean);
  }

  /**
   * A fresh character before any stage is applied: Body and Mind at 3, one Spirit
   * trait of each pair primary at 3 and its opposite at 1, and the nine natural
   * skills at 3 (p.87, p.93, p.97).
   * @returns {import("../lifepath/grants.mjs").LifepathState}
   */
  #baseline() {
    const characteristics = {};
    const primary = {};
    for (const group of ["body", "mind"]) {
      for (const key of Object.keys(CONFIG.FADING_SUNS[group])) {
        characteristics[`${group}.${key}`] = 3;
      }
    }
    for (const pair of CONFIG.FADING_SUNS.spiritPairs) {
      characteristics[`spirit.${pair.primary}`] = 3;
      characteristics[`spirit.${pair.opposed}`] = 1;
      primary[`spirit.${pair.primary}`] = true;
      primary[`spirit.${pair.opposed}`] = false;
    }
    for (const key of Object.keys(CONFIG.FADING_SUNS.occult)) characteristics[`occult.${key}`] = 0;

    const skills = {};
    for (const name of Object.keys(CONFIG.FADING_SUNS.naturalSkills)) skills[name] = 3;

    return createState({ characteristics, primary, skills });
  }

  /**
   * The lifepath applied to a fresh character, without Step Five or Six.
   * @returns {import("../lifepath/grants.mjs").LifepathState}
   */
  #lifepathState() {
    const state = this.#baseline();
    applyStages(state, this.chosenStages.map(s => s.system), this.draft.choices);
    return state;
  }

  /** Every choice across the chosen stages that still needs a decision. */
  #pendingChoices() {
    const pending = [];
    for (const stage of this.chosenStages) {
      const result = resolveChoices(stage.system.grants, this.draft.choices);
      for (const choice of result.pending) pending.push({ stage: stage.name, choice });
    }
    return pending;
  }

  /**
   * Every skill the system knows about, as display labels: the nine natural
   * skills plus everything stocked in the Learned Skills compendium (p.97, p.99).
   * @returns {Promise<string[]>}
   */
  async #skillPool() {
    if (this.#skillCache) return this.#skillCache;

    const labels = new Set(Object.keys(CONFIG.FADING_SUNS.naturalSkills));
    const pack = game.packs.get("fading-suns.learned-skills");
    if (pack) {
      const index = await pack.getIndex();
      for (const entry of index) labels.add(entry.name);
    }
    this.#skillCache = [...labels].sort((a, b) => a.localeCompare(b));
    return this.#skillCache;
  }

  #skillCache = null;

  /**
   * The options an open choice offers, narrowed by its filter where it has one.
   * @param {object} choice
   * @returns {Promise<Array<{value: string, label: string}>>}
   */
  async #poolOptions(choice) {
    if (choice.pool === "spirit") {
      return Object.entries(CONFIG.FADING_SUNS.spirit)
        .map(([key, label]) => ({ value: `spirit.${key}`, label: game.i18n.localize(label) }));
    }

    let labels = await this.#skillPool();
    if (choice.filter?.length) {
      labels = labels.filter(label => choice.filter.some(prefix => label.startsWith(prefix)));
    }
    if (choice.pool === "language") {
      labels = labels.filter(label => /^(Speak|Read)\b/.test(label));
    }
    return labels.map(label => ({ value: label, label }));
  }

  /**
   * Turn a picked pool option into the grant the engine will apply.
   * @param {object} choice
   * @param {string} value
   * @returns {object}
   */
  #grantFromPool(choice, value) {
    if (choice.pool === "spirit") {
      return { kind: "characteristic", key: value, value: choice.value ?? 1 };
    }
    const { name, specialty } = parseSkillLabel(value);
    if (choice.pool === "language") {
      return { kind: "language", key: name, specialty, value: 1, points: choice.value ?? 2 };
    }
    return { kind: "skill", key: name, specialty, value: choice.value ?? 1 };
  }

  /**
   * Every choice across the chosen stages, each carrying whatever has been
   * selected so far so that the step can be revisited and revised.
   * @returns {Array<{stage: string, choice: object, selected: number[], pick: number, complete: boolean}>}
   */
  async #allChoices() {
    const rows = [];
    for (const stage of this.chosenStages) {
      for (const choice of stage.system.grants.filter(g => g.kind === "choice")) {
        const raw = this.draft.choices[choice.id];
        const selected = raw === undefined ? [] : (Array.isArray(raw) ? raw : [raw]);
        const pick = choice.pick ?? 1;

        if (choice.pool) {
          const options = await this.#poolOptions(choice);
          const picked = this.draft.picked?.[choice.id] ?? "";
          rows.push({
            stage: stage.name,
            choice,
            pick,
            isOpen: true,
            poolOptions: options.map(o => ({ ...o, selected: o.value === picked })),
            complete: selected.length === pick
          });
          continue;
        }

        rows.push({
          stage: stage.name,
          choice,
          pick,
          selected,
          options: (choice.options ?? []).map((option, index) => ({
            index,
            label: option.label,
            checked: selected.includes(index)
          })),
          complete: selected.length === pick
        });
      }
    }
    return rows;
  }

  /**
   * Run the lifepath and summarise the result for the review step.
   * @returns {object}
   */
  #review() {
    const state = this.#lifepathState();
    applyExtraPurchases(state, this.draft.extras);
    for (const benefice of this.draft.benefices) {
      state.benefices.push({ key: benefice.uuid, value: benefice.value });
    }

    const { overages } = findOverages(state);
    const freed = clampToCap(state);

    return {
      state,
      overages,
      freed,
      characteristics: Object.entries(state.characteristics)
        .filter(([, v]) => v > 0)
        .map(([path, value]) => ({
          path,
          label: game.i18n.localize(CONFIG.FADING_SUNS.rollableCharacteristics[path] ?? path),
          value,
          primary: state.primary[path] === true,
          overCap: overages.some(o => o.key === path)
        })),
      skills: Object.entries(state.skills)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([label, value]) => ({
          label,
          value,
          overCap: overages.some(o => o.key === label)
        })),
      traitCount: state.blessings.length + state.curses.length,
      beneficeCount: state.benefices.length,
      notes: state.notes,
      sparePoints: state.sparePoints
    };
  }

  /** Whether the current step is complete enough to move on. */
  #canAdvance() {
    const step = this.draft.step;
    if (STAGE_ORDER.includes(step)) return !!this.draft.stages[step];
    if (step === "choices") return this.#pendingChoices().length === 0;
    return true;   // Under-spending Benefices or Extras is the player's business.
  }

  /**
   * The next step. Custom Creation has no stages, so it skips both the stage
   * steps and the choices step that exists only to resolve them.
   * @param {number} direction  1 to advance, -1 to go back.
   * @returns {string}
   */
  #adjacentStep(direction) {
    const skipped = [...STAGE_ORDER, "choices"];
    let index = STEPS.indexOf(this.draft.step) + direction;
    while (index > 0 && index < STEPS.length - 1) {
      if (this.draft.mode === "custom" && skipped.includes(STEPS[index])) index += direction;
      else break;
    }
    return STEPS[Math.max(0, Math.min(STEPS.length - 1, index))];
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _onRender(context, options) {
    super._onRender(context, options);
    for (const input of this.element.querySelectorAll("[data-choice-id]")) {
      input.addEventListener("change", this.#onChoiceChange.bind(this));
    }
    this.#refreshChoiceState();
  }

  /**
   * Record a selection as it is made.
   *
   * A multi-pick choice caps itself: ticking a third option in a "choose two"
   * releases the option ticked earliest, rather than refusing the click.
   * @param {Event} event
   */
  #onChoiceChange(event) {
    const input = event.currentTarget;
    const id = input.dataset.choiceId;
    const pick = Number(input.dataset.pick) || 1;

    // An open choice picks from a pool, and resolves to a grant rather than an
    // option index.
    if (input.dataset.pool) {
      const choice = this.#choiceById(id);
      if (!input.value) {
        delete this.draft.choices[id];
        delete this.draft.picked[id];
      } else {
        this.draft.picked[id] = input.value;
        this.draft.choices[id] = [this.#grantFromPool(choice, input.value)];
      }
      this.#refreshChoiceState();
      return;
    }

    if (input.type !== "checkbox") {
      this.draft.choices[id] = Number(input.value);
      this.#refreshChoiceState();
      return;
    }

    const group = input.closest("[data-choice-group]");
    const boxes = [...group.querySelectorAll("input[type=checkbox]")];
    let checked = boxes.filter(b => b.checked);

    if (checked.length > pick) {
      const released = checked.find(b => b !== input);
      if (released) released.checked = false;
      checked = boxes.filter(b => b.checked);
    }

    this.draft.choices[id] = checked.map(b => Number(b.value));
    this.#refreshChoiceState();
  }

  /**
   * Find a choice by id across the chosen stages.
   * @param {string} id
   * @returns {object|null}
   */
  #choiceById(id) {
    for (const stage of this.chosenStages) {
      const found = stage.system.grants.find(g => g.kind === "choice" && g.id === id);
      if (found) return found;
    }
    return null;
  }

  /** Update each choice's counter and enable Next once every choice is settled. */
  #refreshChoiceState() {
    if (this.draft.step !== "choices") return;

    for (const group of this.element.querySelectorAll("[data-choice-group]")) {
      const pick = Number(group.dataset.pick) || 1;
      const chosen = group.dataset.pool
        ? (group.querySelector("select")?.value ? 1 : 0)
        : group.querySelectorAll("input:checked").length;
      group.classList.toggle("is-complete", chosen === pick);

      const counter = group.querySelector(".choice-count");
      if (counter) counter.textContent = `${chosen} / ${pick}`;
    }

    const outstanding = this.#pendingChoices().length;
    const next = this.element.querySelector('[data-action="next"]');
    if (next) {
      next.disabled = outstanding > 0;
      next.dataset.tooltip = outstanding
        ? game.i18n.format("FADINGSUNS.Creation.Outstanding", { count: outstanding })
        : "";
    }
  }

  /* -------------------------------------------- */
  /*  Actions                                     */
  /* -------------------------------------------- */

  /** @this {FadingSunsCreationWizard} */
  static async #onSetMode(event, target) {
    this.draft.mode = target.dataset.mode;
    this.render();
  }

  /** @this {FadingSunsCreationWizard} */
  static async #onSetFaction(event, target) {
    this.draft.faction = target.dataset.faction;
    // Stages are faction-specific, so changing faction invalidates the choices.
    this.draft.stages = {};
    this.draft.choices = {};
    this.draft.picked = {};
    this.render();
  }

  /** @this {FadingSunsCreationWizard} */
  static async #onChooseStage(event, target) {
    const { stageType, uuid } = target.dataset;
    const stage = await fromUuid(uuid);
    if (!stage) return;
    this.draft.stages[stageType] = stage;
    this.render();
  }

  /** @this {FadingSunsCreationWizard} */
  static async #onClearStage(event, target) {
    delete this.draft.stages[target.dataset.stageType];
    this.render();
  }

  /** @this {FadingSunsCreationWizard} */
  static async #onBack() {
    this.draft.step = this.#adjacentStep(-1);
    this.render();
  }

  /** @this {FadingSunsCreationWizard} */
  static async #onNext() {
    if (!this.#canAdvance()) {
      ui.notifications.warn(game.i18n.localize("FADINGSUNS.Creation.Incomplete"));
      return;
    }
    this.draft.step = this.#adjacentStep(1);
    this.render();
  }

  /**
   * Add the Benefice currently selected, at the rank chosen beside it.
   * @this {FadingSunsCreationWizard}
   */
  static async #onAddBenefice() {
    const uuid = this.element.querySelector("[name=beneficePick]")?.value;
    if (!uuid) return;

    const document = await fromUuid(uuid);
    if (!document) return;

    const rankField = this.element.querySelector("[name=beneficeRank]");
    const value = Number(rankField?.value) || document.system.value;

    this.draft.benefices.push({
      uuid,
      name: document.name,
      polarity: document.system.polarity,
      value
    });
    this.render();
  }

  /**
   * Take one of the book's suggested Benefices, at the points it suggests.
   * @this {FadingSunsCreationWizard}
   */
  static async #onAddSuggested(event, target) {
    const { uuid, value } = target.dataset;
    if (!uuid) return;

    const document = await fromUuid(uuid);
    if (!document) return;
    if (this.draft.benefices.some(b => b.uuid === uuid)) return;

    this.draft.benefices.push({
      uuid,
      name: document.name,
      polarity: document.system.polarity,
      value: Number(value) || document.system.value
    });
    this.render();
  }

  /** @this {FadingSunsCreationWizard} */
  static async #onRemoveBenefice(event, target) {
    this.draft.benefices.splice(Number(target.dataset.index), 1);
    this.render();
  }

  /**
   * Buy a level of something with Extra points (p.88).
   * @this {FadingSunsCreationWizard}
   */
  static async #onBuyExtra(event, target) {
    const kind = target.dataset.kind;
    const extras = this.draft.extras;

    // Levels are bought in one go rather than by clicking repeatedly.
    const quantity = Math.max(1, Number(
      this.element.querySelector(`[name=extra-${kind}-qty]`)?.value
    ) || 1);

    if (kind === "wyrd") {
      extras.wyrd += quantity;
    } else if (kind === "characteristic" || kind === "skill") {
      const field = this.element.querySelector(`[name=extra-${kind}]`);
      const key = field?.value;
      if (!key) return;
      const bucket = kind === "characteristic" ? extras.characteristics : extras.skills;
      bucket[key] = (bucket[key] ?? 0) + quantity;
    } else if (kind === "blessing") {
      const uuid = this.element.querySelector("[name=extra-blessing]")?.value;
      if (!uuid) return;
      const document = await fromUuid(uuid);
      if (!document) return;
      if (extras.blessings.some(b => b.uuid === uuid)) return;
      extras.blessings.push({ uuid, name: document.name, cost: document.system.cost });
    } else if (kind === "combatAction") {
      const uuid = this.element.querySelector("[name=extra-combat-action]")?.value;
      if (!uuid) return;
      const document = await fromUuid(uuid);
      if (!document) return;
      if (extras.combatActions.some(a => a.uuid === uuid)) return;
      extras.combatActions.push({ uuid, name: document.name, level: document.system.level });
    }

    this.render();
  }

  /** @this {FadingSunsCreationWizard} */
  static async #onRemoveExtra(event, target) {
    const { kind, key } = target.dataset;
    const extras = this.draft.extras;

    // A purchase line is removed whole. Buying fewer levels means removing the
    // line and buying again, which is less fiddly than clicking one off at a time.
    if (kind === "wyrd") extras.wyrd = 0;
    else if (kind === "characteristic") delete extras.characteristics[key];
    else if (kind === "skill") delete extras.skills[key];
    else if (kind === "blessing") {
      extras.blessings = extras.blessings.filter(b => b.uuid !== key);
    } else if (kind === "combatAction") {
      extras.combatActions = extras.combatActions.filter(a => a.uuid !== key);
    }

    this.render();
  }

  /** @this {FadingSunsCreationWizard} */
  static async #onApply() {
    const review = this.#review();

    const confirmed = await DialogV2.confirm({
      window: { title: game.i18n.localize("FADINGSUNS.Creation.ApplyTitle") },
      content: `<p>${game.i18n.format("FADINGSUNS.Creation.ApplyConfirm", { name: this.actor.name })}</p>`
    });
    if (!confirmed) return;

    await applyLifepathToActor(this.actor, review.state, { stages: this.chosenStages });

    if (review.freed) {
      ui.notifications.info(
        game.i18n.format("FADINGSUNS.Creation.Freed", { points: review.freed })
      );
    }
    // Mark the character as made, so the wizard is not run over the top of an
    // existing character by accident. A gamemaster can still override.
    await this.actor.setFlag("fading-suns", "creation", {
      completed: true,
      at: Date.now(),
      by: game.user.id
    });

    ui.notifications.info(game.i18n.localize("FADINGSUNS.Creation.Applied"));

    await this.close();
    this.actor.sheet.render(true);
  }
}
