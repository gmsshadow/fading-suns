import {
  applyStages, createState, resolveChoices, findOverages, clampToCap,
  STAGE_BUDGET, CUSTOM_BUDGET, STARTING_CAP
} from "../lifepath/grants.mjs";
import { applyLifepathToActor } from "../lifepath/apply.mjs";

const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;

/** The stages a guided lifepath walks through, in order (p.70). */
const STAGE_ORDER = ["upbringing", "apprenticeship", "earlyCareer"];

/** The wizard's steps, in order. */
const STEPS = ["mode", "upbringing", "apprenticeship", "earlyCareer", "choices", "review"];

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
      choices: {}      // choice id -> selection
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
      apply: FadingSunsCreationWizard.#onApply
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
      context.available = await this.#availableStages(step);
      context.selected = this.draft.stages[step] ?? null;
    }

    if (step === "choices") context.choices = this.#allChoices();
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
      .filter(id => this.draft.mode !== "custom" || !STAGE_ORDER.includes(id) && id !== "choices")
      .map(id => ({
        id,
        label: game.i18n.localize(`FADINGSUNS.Creation.Step.${id}`),
        done: STEPS.indexOf(id) < current,
        current: id === this.draft.step
      }));
  }

  /**
   * Stages of a given type that match the chosen faction, from the compendium.
   * @param {string} stageType
   * @returns {Promise<Item[]>}
   */
  async #availableStages(stageType) {
    const pack = game.packs.get("fading-suns.character-histories");
    if (!pack) return [];
    const documents = await pack.getDocuments();
    return documents
      .filter(d => d.system.stageType === stageType && d.system.faction === this.draft.faction)
      .sort((a, b) => a.name.localeCompare(b.name));
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
   * Every choice across the chosen stages, each carrying whatever has been
   * selected so far so that the step can be revisited and revised.
   * @returns {Array<{stage: string, choice: object, selected: number[], pick: number, complete: boolean}>}
   */
  #allChoices() {
    const rows = [];
    for (const stage of this.chosenStages) {
      for (const choice of stage.system.grants.filter(g => g.kind === "choice")) {
        const raw = this.draft.choices[choice.id];
        const selected = raw === undefined ? [] : (Array.isArray(raw) ? raw : [raw]);
        const pick = choice.pick ?? 1;
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
          complete: !choice.pool && selected.length === pick
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
    const state = this.#baseline();
    applyStages(state, this.chosenStages.map(s => s.system), this.draft.choices);

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
    return true;
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

  /** Update each choice's counter and enable Next once every choice is settled. */
  #refreshChoiceState() {
    if (this.draft.step !== "choices") return;

    for (const group of this.element.querySelectorAll("[data-choice-group]")) {
      const pick = Number(group.dataset.pick) || 1;
      const chosen = group.querySelectorAll("input:checked").length;
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
    ui.notifications.info(game.i18n.localize("FADINGSUNS.Creation.Applied"));

    await this.close();
    this.actor.sheet.render(true);
  }
}
