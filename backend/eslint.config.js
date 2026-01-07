// eslint.config.js
import js from "@eslint/js"; // Core ESLint rules for JavaScript
import globals from "globals"; // Predefined global variables (Node, browser, jest, etc.)
import { defineConfig } from "eslint/config"; // ESLint flat config helper

export default defineConfig([
  // 1) Base config applied to all JS/CommonJS/ESM files
  {
    files: ["**/*.{js,mjs,cjs}"], // Match all .js, .mjs, .cjs files
    languageOptions: {
      ecmaVersion: "latest", // Use newest ECMAScript syntax
      sourceType: "module", // Interpret files as ES modules
      globals: {
        ...globals.node, // Include Node globals (process, module, require, etc.)
        ...globals.es2021, // ES2021 (console, Promise, etc.)
      },
    },
    extends: [js.configs.recommended], // Use ESLint's recommended rules
    rules: {
      // Warn about unused vars, but ignore ones prefixed with "_" (common practice)
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },

  // 2) Special handling for test files (Jest)
  {
    files: ["**/*.test.js", "**/*.spec.js", "tests/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021,
        ...globals.jest,
      },
    },
    rules: {
      "no-undef": "off", // Jest defines `describe`, `it`, etc.
    },
  },
  // 3) Ignore generated folders
  {
    ignores: ["coverage/**", "node_modules/**", "tmp/**"],
  },
]);
