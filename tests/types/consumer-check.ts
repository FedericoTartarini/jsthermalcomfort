/**
 * Consumer TypeScript fixture to verify that the published .d.ts files
 * have correct syntax and that model metadata types are accessible.
 *
 * This fixture is compiled during CI to catch regressions in type definitions,
 * especially syntax errors that break every TypeScript consumer of this package.
 *
 * See: npm run check:types
 */

import type {
  ModelInfo,
  Bound,
  VariableInfo,
} from "../../lib/esm/types/index.d.ts";

// Verify that types can be assigned with proper structure
// This tests that the .d.ts syntax is correct and types resolve
const exampleInfo: ModelInfo = {
  label: "Example Model",
  description: "An example for type checking",
  inputs: {
    temp: { unit: "°C", applicability: { min: 0, max: 40 } },
  },
  outputs: {
    result: { unit: "dimensionless" },
  },
};

// Verify that Bound and VariableInfo types are available
const bound: Bound = { min: 10, max: 30 };
const varInfo: VariableInfo = {
  unit: "°C",
  applicability: bound,
};

console.log("TypeScript consumer check passed: all types resolve correctly");
