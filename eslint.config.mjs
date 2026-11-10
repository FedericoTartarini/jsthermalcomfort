import { existsSync } from "node:fs";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

// Strict lint covers every file under src/ and tests/ (and the Vitest config),
// apart from these, each named. CI and the pre-commit hook both run
// `npm run lint`, so they cover the same files (ADR 0020).
export const UNLINTED = [
  // Deferred and still JavaScript (ADR 0018): JOS3, jos3_functions, and
  // supa.js, which only jos3_functions imports, with their tests.
  "src/models/JOS3.js",
  "src/jos3_functions/",
  "src/supa.js",
  "tests/models/JOS3.test.js",
  "tests/jos3_functions/",
  // Hold only functions no model calls, so they stay JavaScript with JSDoc
  // (decision 103), with their tests.
  "src/environment/f_svv.js",
  "src/environment/mean_radiant_tmp.js",
  "src/environment/running_mean_outdoor_temperature.js",
  "src/environment/v_relative.js",
  "src/utilities/utilities.js",
  "tests/environment/f_svv.test.js",
  "tests/environment/mean_radiant_tmp.test.js",
  "tests/environment/running_mean_outdoor_temperature.test.js",
  "tests/environment/v_relative.test.js",
  "tests/utilities/utilities.test.js",
  // Meant to be reported: tests/eslint.test.ts lints it with the list lifted.
  "tests/eslint/fixture.ts",
  // A CommonJS consumer of the packed package, which CI runs outside the
  // repository.
  "tests/package/require.cjs",
];

for (const file of UNLINTED) {
  if (!existsSync(new URL(file, import.meta.url))) {
    throw new Error(`eslint.config.mjs lists ${file}, which does not exist`);
  }
}

export default defineConfig(
  // src/, tests/ and the Vitest config, less the named files. Everything else
  // stays ignored, .scratch/ among it, which holds evidence with its own
  // eslint.config.mjs that ESLint 10 would otherwise apply to the files beside
  // it.
  globalIgnores([
    "**/*",
    "!src/",
    "!src/**",
    "!tests/",
    "!tests/**",
    "!vitest.config.ts",
    ...UNLINTED,
  ]),
  {
    files: ["**/*.ts"],
    extends: [
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        project: [
          "configs/tsconfig.json",
          "tests/tsconfig.json",
          "tests/types/tsconfig.json",
        ],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Upstream's messages embed numbers. The other options repeat
      // strictTypeChecked's, since the rule's own defaults allow more.
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        {
          allowAny: false,
          allowBoolean: false,
          allowNever: false,
          allowNullish: false,
          allowNumber: true,
          allowRegExp: false,
        },
      ],
      // Names copied from upstream keep its spelling: snake_case, the `_`
      // prefix, and its class names. Names the library adds follow TS
      // conventions: camelCase functions, UPPER_CASE constants, PascalCase
      // types (ADR 0021). A mixed name matches no format.
      "@typescript-eslint/naming-convention": [
        "error",
        {
          selector: "default",
          format: ["snake_case"],
          leadingUnderscore: "allow",
        },
        {
          selector: "variable",
          types: ["function"],
          format: ["snake_case", "camelCase"],
          leadingUnderscore: "allow",
        },
        {
          selector: "function",
          format: ["snake_case", "camelCase"],
          leadingUnderscore: "allow",
        },
        {
          selector: "variable",
          modifiers: ["const"],
          format: ["snake_case", "UPPER_CASE"],
          leadingUnderscore: "allow",
        },
        // Upstream's enum classes become `as const` objects (`Units`).
        {
          selector: "variable",
          modifiers: ["const", "global"],
          format: ["snake_case", "UPPER_CASE", "PascalCase"],
          leadingUnderscore: "allow",
        },
        { selector: "typeLike", format: ["PascalCase", "UPPER_CASE"] },
        // A class keeps upstream's private name (`_SportsValues`).
        {
          selector: "class",
          format: ["PascalCase"],
          leadingUnderscore: "allow",
        },
        // A default or namespace import takes the name its module uses.
        {
          selector: "import",
          format: ["snake_case", "camelCase", "PascalCase"],
        },
        // Properties also take the camelCase of the APIs the code calls.
        {
          selector: "memberLike",
          format: ["snake_case", "camelCase", "UPPER_CASE"],
          leadingUnderscore: "allow",
        },
        // An object literal's key may be PascalCase, so an index's default
        // export keeps the names it re-exports, upstream's class names among
        // them (`Units`, `_SportsValues`).
        {
          selector: "objectLiteralProperty",
          format: ["snake_case", "camelCase", "UPPER_CASE", "PascalCase"],
          leadingUnderscore: "allow",
        },
        // A quoted key is upstream's check name verbatim ("tr - tdb").
        { selector: "memberLike", modifiers: ["requiresQuotes"], format: null },
        // objectLiteralProperty outranks memberLike, so it repeats the
        // quoted-key exception.
        {
          selector: "objectLiteralProperty",
          modifiers: ["requiresQuotes"],
          format: null,
        },
      ],
      // A model destructures every input from one parse, and upstream
      // reassigns some of them (`tout = units_converter(tmp=tout)[0]`, `models/clo_tout.py:73`), so a
      // destructuring is `let` when any of its names is reassigned.
      "prefer-const": ["error", { destructuring: "all" }],
    },
  },
  // A type check of the built package: its bindings exist so the compiler
  // checks their types.
  {
    files: ["tests/types/consumer-check.ts"],
    rules: { "@typescript-eslint/no-unused-vars": "off" },
  },
);
