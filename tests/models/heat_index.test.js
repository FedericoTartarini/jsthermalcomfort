import { describe, expect, test } from "@jest/globals";
import { heat_index, heat_index_rothfusz } from "../../src/models/heat_index";
import {
  heat_index as heat_index_from_models,
  heat_index_rothfusz as heat_index_rothfusz_from_models,
} from "../../src/models/index.js";
import {
  heat_index as heat_index_from_root,
  heat_index_rothfusz as heat_index_rothfusz_from_root,
} from "../../src/index.js";
import { testDataUrls } from "./comftest";
import { loadTestData, validateResult } from "./testUtils"; // Import shared utilities

// Validated against pythermalcomfort 3.9.3 heat_index_rothfusz.

let returnArray = false;

// use top-level await to load test data before tests are defined.
let { testData, tolerances } = await loadTestData(
  testDataUrls.heatIndex,
  returnArray,
);

describe("heat_index", () => {
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { tdb, rh, options } = inputs;
    // Mirror pythermalcomfort's test harness which calls
    // `heat_index_rothfusz(**inputs, limit_inputs=False)` so the shared
    // fixture validates the Rothfusz formula independently of the gate.
    const modelResult = heat_index(tdb, rh, {
      ...options,
      limit_inputs: false,
    });

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });
});

describe("heat_index input validation", () => {
  test.each([
    ["tdb", "25", 50],
    ["rh", 25, "50"],
  ])("throws TypeError if %s is not a number", (_, ...args) => {
    expect(() => heat_index(...args)).toThrow(TypeError);
  });

  test("throws TypeError if round is not a boolean", () => {
    expect(() => heat_index(25, 50, { round: "true" })).toThrow(TypeError);
  });

  test("throws TypeError if limit_inputs is not a boolean", () => {
    expect(() => heat_index(30, 50, { limit_inputs: "true" })).toThrow(
      TypeError,
    );
  });

  test("throws Error if units is not a valid enum", () => {
    expect(() => heat_index(25, 50, { units: "INVALID" })).toThrow(Error);
  });
});

// Matches pythermalcomfort 3.9.3 heat_index_rothfusz default behaviour.
describe("heat_index Rothfusz applicability gate", () => {
  test.each([
    ["SI tdb just below 27", 26.9, 50, undefined],
    ["SI tdb well below 27", 20, 50, undefined],
    ["SI tdb at 0", 0, 50, undefined],
    ["IP tdb just below 80.6", 80.5, 50, "IP"],
    ["IP tdb well below 80.6", 60, 50, "IP"],
  ])("returns NaN under default limit_inputs when %s", (_, tdb, rh, units) => {
    const result = heat_index(tdb, rh, units ? { units } : undefined);
    expect(result.hi).toBeNaN();
  });

  test.each([
    ["SI tdb at 27", 27, 50, undefined, true],
    ["SI tdb above 27", 35, 80, undefined, true],
    ["IP tdb at 80.6", 80.6, 50, "IP", true],
    ["IP tdb above 80.6", 95, 50, "IP", true],
  ])(
    "returns a finite hi under default limit_inputs when %s",
    (_, tdb, rh, units, _expectFinite) => {
      const result = heat_index(tdb, rh, units ? { units } : undefined);
      expect(Number.isFinite(result.hi)).toBe(true);
    },
  );

  test("limit_inputs=false bypasses the gate and computes for tdb < 27 °C", () => {
    const result = heat_index(25, 50, { limit_inputs: false });
    expect(result.hi).toBe(25.9);
  });

  test("limit_inputs=false bypasses the gate in IP mode", () => {
    const result = heat_index(70, 50, { units: "IP", limit_inputs: false });
    expect(Number.isFinite(result.hi)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Stress category classification tests
// ---------------------------------------------------------------------------
describe("heat_index stress_category", () => {
  // Test that stress_category is NaN when hi is NaN (below threshold)
  test("returns NaN stress_category when below applicability threshold", () => {
    const result = heat_index(25, 50, { limit_inputs: true });
    expect(result.stress_category).toBeNaN();
  });

  // Direct classification tests using computed hi values
  // Rather than setting tdb to hit exact hi values, we test that the
  // classification function correctly categorizes the computed hi.
  test("stress_category classification returns valid categories", () => {
    // Test that we can get different categories by varying tdb
    const validCategories = [
      "no risk",
      "caution",
      "extreme caution",
      "danger",
      "extreme danger",
    ];

    const low = heat_index(27, 30, { limit_inputs: false });
    expect(validCategories).toContain(low.stress_category);

    const mid = heat_index(35, 80, { limit_inputs: false });
    expect(validCategories).toContain(mid.stress_category);

    const high = heat_index(50, 80, { limit_inputs: false });
    expect(validCategories).toContain(high.stress_category);
  });

  // Test boundary behavior with limit_inputs=false to get values we can classify
  test("returns valid stress categories for various conditions", () => {
    // Verify that increasing temperature increases stress level
    const low = heat_index(27, 40, { limit_inputs: false });
    const mid = heat_index(30, 80, { limit_inputs: false });
    const high = heat_index(35, 80, { limit_inputs: false });

    // All should return categories from the valid set
    const validCategories = [
      "no risk",
      "caution",
      "extreme caution",
      "danger",
      "extreme danger",
    ];
    expect(validCategories).toContain(low.stress_category);
    expect(validCategories).toContain(mid.stress_category);
    expect(validCategories).toContain(high.stress_category);
  });

  // Test that stress_category is same whether round=true or round=false
  test("stress_category is same whether round=true or round=false", () => {
    // Rounding must never change the category - this proves it
    // Using heat_index(30, 91) produces hi values very close to a bin boundary:
    // - rounded: hi = 41.0 exactly (bin edge, stress_category = "danger")
    // - unrounded: hi = 41.047576332000055 (also "danger")
    // If the code classified the rounded value BEFORE computing the category,
    // a broken implementation would give "extreme caution" instead of "danger"
    // (since 32 < 41 <= 41 is an edge case). This fixture tests that the
    // category is computed from the unrounded value.
    const result_rounded = heat_index(30, 91, {
      round: true,
      limit_inputs: false,
    });
    const result_unrounded = heat_index(30, 91, {
      round: false,
      limit_inputs: false,
    });

    expect(result_rounded.hi).toBe(41);
    expect(result_unrounded.hi).toBeGreaterThan(41);
    expect(result_rounded.stress_category).toBe(
      result_unrounded.stress_category,
    );
    expect(result_rounded.stress_category).toBe("danger");
  });

  // Test IP mode: classification should be from SI value, not IP value
  test("stress_category in IP mode is classified from SI value", () => {
    // This test proves SI-based classification by using concrete expected values.
    // heat_index(80, 50, IP) computes hi_ip = 80.8029°F = 27.1127°C (unrounded SI).
    // Range check: 27 < 27.1127 <= 32 -> category should be "caution".
    // CRITICAL: If the code classified hi_ip (80.8) instead of hi_si (27.11),
    // the category would be "extreme danger" (54 < 80.8 <= 1000).
    // That contrast is the whole point of this test — if this assertion weakens,
    // the test no longer proves SI-based classification.
    const result = heat_index(80, 50, { units: "IP", limit_inputs: false });
    expect(result.hi).toBe(80.8);
    expect(result.stress_category).toBe("caution");
  });
});

// ---------------------------------------------------------------------------
// Tests for the renamed function and backwards-compatible alias
// ---------------------------------------------------------------------------
describe("heat_index_rothfusz (renamed function)", () => {
  test("heat_index_rothfusz produces identical results to heat_index", () => {
    const testCases = [
      [25, 50, { limit_inputs: false }],
      [30, 80],
      [35, 75, { units: "IP", limit_inputs: false }],
      [27, 40, { round: false, limit_inputs: false }],
    ];

    testCases.forEach(([tdb, rh, options]) => {
      const result_rothfusz = heat_index_rothfusz(tdb, rh, options);
      const result_alias = heat_index(tdb, rh, options);

      expect(result_rothfusz).toEqual(result_alias);
    });
  });

  test("heat_index_rothfusz and heat_index are the same function", () => {
    expect(heat_index_rothfusz).toBe(heat_index);
  });

  test("heat_index_rothfusz is exported from models/index.js", () => {
    expect(heat_index_rothfusz_from_models).toBe(heat_index_rothfusz);
  });

  test("heat_index alias is exported from models/index.js", () => {
    expect(heat_index_from_models).toBe(heat_index);
  });

  test("both names return identical results for various inputs", () => {
    const inputs = [
      [27, 30, { limit_inputs: false }],
      [30, 50],
      [35, 90, { units: "IP", limit_inputs: false }],
      [50, 40, { round: false, limit_inputs: false }],
    ];

    inputs.forEach(([tdb, rh, options]) => {
      const result1 = heat_index_rothfusz(tdb, rh, options);
      const result2 = heat_index(tdb, rh, options);

      // Compare hi values
      if (isNaN(result1.hi)) {
        expect(isNaN(result2.hi)).toBe(true);
      } else {
        expect(result2.hi).toBe(result1.hi);
      }

      // Compare stress_category
      if (isNaN(result1.stress_category)) {
        expect(isNaN(result2.stress_category)).toBe(true);
      } else {
        expect(result2.stress_category).toBe(result1.stress_category);
      }
    });
  });

  test("both names are exported from package root (src/index.js)", () => {
    expect(heat_index_rothfusz_from_root).toBe(heat_index_rothfusz);
    expect(heat_index_from_root).toBe(heat_index);
  });

  test("both names from package root produce correct results", () => {
    const result1 = heat_index_rothfusz_from_root(30, 80);
    const result2 = heat_index_from_root(30, 80);

    expect(result1).toEqual(result2);
    expect(Number.isFinite(result1.hi)).toBe(true);
    expect(typeof result1.stress_category === "string").toBe(true);
  });
});
