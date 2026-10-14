import { describe, expect, test } from "@jest/globals";
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

// Reference values from pythermalcomfort 3.9.3 tests/test_humidex.py.
describe("humidex masterson model", () => {
  test.each([
    [21, 100, 29.3, "Little or no discomfort", 0.1],
    [34, 100, 58.9, "Heat stroke probable", 0.01],
    [43, 20, 47.1, "Dangerous discomfort", 0.01],
    [30, 30, 31.5, "Noticeable discomfort", 0.01],
    [31, 55, 39.3, "Evident discomfort", 0.01],
  ])(
    "returns the reference result for tdb=%s, rh=%s",
    (tdb, rh, expectedHumidex, expectedDiscomfort, tolerance) => {
      const result = humidex(tdb, rh, { model: "masterson" });

      expect(Math.abs(result.humidex - expectedHumidex)).toBeLessThanOrEqual(
        tolerance,
      );
      expect(result.discomfort).toBe(expectedDiscomfort);
    },
  );
});

describe("humidex model options", () => {
  test("uses rana by default", () => {
    expect(humidex(25, 50)).toEqual(humidex(25, 50, { model: "rana" }));
  });

  test("keeps default rounding when options is empty", () => {
    expect(humidex(25, 50, {})).toEqual({
      humidex: 28.2,
      discomfort: "Little or no discomfort",
    });
  });

  test.each([
    ["rana", 25, 50, 28.2],
    ["masterson", 31, 55, 39.3],
  ])(
    "supports disabling rounding for %s",
    (model, tdb, rh, expectedRounded) => {
      const result = humidex(tdb, rh, { model, round: false });

      expect(result.humidex).toBeCloseTo(expectedRounded, 1);
      expect(result.humidex).not.toBe(expectedRounded);
    },
  );

  test.each(["invalid", "RANA", "", 123, null])(
    "rejects an invalid model: %s",
    (model) => {
      expect(() => humidex(25, 50, { model })).toThrow(RangeError);
    },
  );

  test.each([-0.1, 100.1])("rejects out-of-range rh=%s for masterson", (rh) => {
    expect(() => humidex(25, rh, { model: "masterson" })).toThrow(RangeError);
  });
});
