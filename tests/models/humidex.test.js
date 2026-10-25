import { describe, expect, test } from "vitest";
import { humidex } from "../../src/models/humidex";
import { testDataUrls } from "./comftest";
import { loadTestData, validateResult } from "./testUtils"; // Import shared utilities

// Validated against pythermalcomfort 3.9.3.

let returnArray = false;

// use top-level await to load test data before tests are defined.
let { testData, tolerances } = await loadTestData(
  testDataUrls.humidex,
  returnArray,
);

describe("humidex", () => {
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { tdb, rh, options } = inputs;
    const modelResult = humidex(tdb, rh, options);

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });
});

// ---------------------------------------------------------------------------
// Input validation tests
// ---------------------------------------------------------------------------
describe("humidex input validation", () => {
  test.each([
    ["tdb", "25", 50],
    ["rh", 25, "50"],
  ])("throws TypeError if %s is not a number", (_, ...args) => {
    expect(() => humidex(...args)).toThrow(TypeError);
  });

  test("throws TypeError if round is not a boolean", () => {
    expect(() => humidex(25, 50, { round: "true" })).toThrow(TypeError);
  });
});

// ---------------------------------------------------------------------------
// Relative humidity outside [0, 100] is physically invalid and throws
// RangeError, matching pythermalcomfort 3.9.3 (which raises ValueError).
// ---------------------------------------------------------------------------
describe("humidex out-of-range relative humidity", () => {
  test.each([
    ["rh below 0", 25, -0.1],
    ["rh well below 0", 25, -25],
    ["rh just above 100", 25, 100.1],
    ["rh well above 100", 25, 150],
  ])("throws RangeError when %s", (_, tdb, rh) => {
    expect(() => humidex(tdb, rh)).toThrow(RangeError);
  });

  test.each([
    ["rh at lower bound", 25, 0],
    ["rh at upper bound", 25, 100],
  ])("returns a finite humidex when %s", (_, tdb, rh) => {
    const result = humidex(tdb, rh);
    expect(Number.isFinite(result.humidex)).toBe(true);
    expect(typeof result.discomfort).toBe("string");
  });
});
