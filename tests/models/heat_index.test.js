import { describe, expect, test } from "@jest/globals";
import { heat_index } from "../../src/models/heat_index";
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
    expect(result.stress_category).toBeNaN();
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
      expect(typeof result.stress_category).toBe("string");
    },
  );

  test("limit_inputs=false bypasses the gate and computes for tdb < 27 °C", () => {
    const result = heat_index(25, 50, { limit_inputs: false });
    expect(result.hi).toBe(25.9);
    expect(result.stress_category).toBe("no risk");
  });

  test("limit_inputs=false bypasses the gate in IP mode", () => {
    const result = heat_index(70, 50, { units: "IP", limit_inputs: false });
    expect(Number.isFinite(result.hi)).toBe(true);
  });
});

describe("heat_index.mapping Rothfusz categories", () => {
  test.each([
    [27, "no risk"],
    [26.9, "no risk"],
    [0, "no risk"],
    [32, "caution"],
    [27.001, "caution"],
    [41, "extreme caution"],
    [32.001, "extreme caution"],
    [54, "danger"],
    [41.001, "danger"],
    [54.001, "extreme danger"],
    [1000, "extreme danger"],
  ])("HI %p maps to %p", (hi, expected) => {
    expect(heat_index.mapping(hi)).toBe(expected);
  });

  test.each([[NaN], [Infinity], [-Infinity], [1000.001]])(
    "HI %p maps to NaN",
    (hi) => {
      expect(heat_index.mapping(hi)).toBeNaN();
    },
  );
});
