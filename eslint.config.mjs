/**
 * Lint rules aimed at the failures that syntax checking cannot see.
 *
 * `no-undef` is the one that earns its keep: a reference to a variable that was
 * removed in an edit is valid JavaScript and only throws when that code path
 * runs — which, for a wizard step, means the step silently fails to render and
 * appears to be skipped.
 */
export default [
  {
    files: ["module/**/*.mjs", "tools/**/*.mjs", "tests/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: {
        // Foundry VTT
        game: "readonly", ui: "readonly", canvas: "readonly", CONFIG: "readonly",
        CONST: "readonly", foundry: "readonly", Hooks: "readonly", Roll: "readonly",
        ChatMessage: "readonly", Actor: "readonly", Item: "readonly",
        Combatant: "readonly", Combat: "readonly", Handlebars: "readonly",
        fromUuid: "readonly", renderTemplate: "readonly",
        // Browser
        window: "readonly", document: "readonly", console: "readonly",
        setTimeout: "readonly", clearTimeout: "readonly", FormData: "readonly",
        HTMLElement: "readonly", Event: "readonly",
        // Node, for the build tooling
        process: "readonly", URL: "readonly"
      }
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["warn", { args: "none", varsIgnorePattern: "^_" }],
      "no-dupe-class-members": "error",
      "no-dupe-keys": "error",
      "no-unreachable": "error",
      "no-const-assign": "error"
    }
  }
];
