import { existsSync } from "node:fs";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

// The files strict lint covers. Lint grows with the migration: each model
// ticket adds its own files, and the contract ticket replaces this list with
// every file. CI and the pre-commit hook both run `npm run lint`, so they
// cover the same list (ADR 0020).
export const LINTED = [
  "vitest.config.ts",
  "src/_internal/adaptive_cooling_effect.ts",
  "src/_internal/ashrae55.ts",
  "src/_internal/brentq.ts",
  "src/_internal/classifierBins.ts",
  "src/_internal/define.ts",
  "src/_internal/errors.ts",
  "src/_internal/modelInfo.ts",
  "src/_internal/round.ts",
  "src/_internal/validation.ts",
  "src/environment/index.ts",
  "src/environment/operative_tmp.ts",
  "src/environment/transpose_sharp_altitude.ts",
  "src/psychrometrics/p_sat.ts",
  "src/psychrometrics/p_sat_torr.ts",
  "src/utilities/met_to_w_m2.ts",
  "src/utilities/options.ts",
  "src/utilities/units_converter.ts",
  "src/models/_pmv_ppd_optimized.ts",
  "src/models/adaptive_ashrae.ts",
  "src/models/clo_tout.ts",
  "src/models/cooling_effect.ts",
  "src/models/heat_index_rothfusz.ts",
  "src/models/phs.ts",
  "src/models/pmv_ppd_ashrae.ts",
  "src/models/pmv_ppd_iso.ts",
  "src/models/solar_gain.ts",
  "src/models/two_nodes_gagge.ts",
  "src/models/use_fans_heatwaves.ts",
  "src/models/utci.ts",
  "tests/call_sites.test.ts",
  "tests/check_mirrored.test.ts",
  "tests/environment/operative_tmp.test.ts",
  "tests/environment/transpose_sharp_altitude.test.ts",
  "tests/internal.test.ts",
  "tests/internal/brentq.test.ts",
  "tests/models/adaptive_ashrae.test.ts",
  "tests/models/clo_tout.test.ts",
  "tests/models/cooling_effect.test.ts",
  "tests/models/heat_index_rothfusz.test.ts",
  "tests/models/modelContract.ts",
  "tests/models/phs.test.ts",
  "tests/models/pmv_ppd_ashrae.test.ts",
  "tests/models/pmv_ppd_iso.test.ts",
  "tests/models/pmv_ppd_optimised.test.ts",
  "tests/models/returnsList.test.ts",
  "tests/models/solar_gain.test.ts",
  "tests/models/two_nodes_gagge.test.ts",
  "tests/models/use_fans_heatwaves.test.ts",
  "tests/models/utci.test.ts",
  "tests/psychrometrics/p_sat.test.ts",
  "tests/psychrometrics/p_sat_torr.test.ts",
  "tests/utilities/units_converter.test.ts",
];

for (const file of LINTED) {
  if (!existsSync(new URL(file, import.meta.url))) {
    throw new Error(`eslint.config.mjs lists ${file}, which does not exist`);
  }
}

export default defineConfig(
  // Everything except the listed files, while keeping directories traversable.
  // Unignoring every directory also unignores node_modules/ and .git/, so they
  // are ignored again. .scratch/ holds evidence with its own eslint.config.mjs,
  // which ESLint 10 would otherwise apply to the files beside it.
  globalIgnores([
    "**/*",
    "!**/*/",
    "**/node_modules/",
    "**/.git/",
    ".scratch/",
    ...LINTED.map((file) => `!${file}`),
  ]),
  {
    files: ["**/*.ts"],
    extends: [
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        project: ["configs/tsconfig.json", "tests/tsconfig.json"],
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
        // A quoted key is upstream's check name verbatim ("tr - tdb").
        { selector: "memberLike", modifiers: ["requiresQuotes"], format: null },
      ],
      // A model destructures every input from one parse, and upstream
      // reassigns some of them (`tout = units_converter(tmp=tout)[0]`, `models/clo_tout.py:73`), so a
      // destructuring is `let` when any of its names is reassigned.
      "prefer-const": ["error", { destructuring: "all" }],
    },
  },
);
