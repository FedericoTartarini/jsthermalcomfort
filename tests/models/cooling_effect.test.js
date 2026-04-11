import { describe } from "@jest/globals";
import { cooling_effect } from "../../src/models/cooling_effect";
import { testDataUrls } from "./comftest"; // Import all test URLs from comftest.js
import { loadTestData, validateResult } from "./testUtils"; // Import utility functions

let returnArray = false;

// use top-level await to load test data before tests are defined.
let { testData, tolerances } = await loadTestData(
  testDataUrls.coolingEffect,
  returnArray,
);

describe("cooling_effect", () => {
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { tdb, tr, vr, rh, met, clo, wme, units } = inputs;
    const modelResult = cooling_effect(tdb, tr, vr, rh, met, clo, wme, units);

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });
});

// ---------------------------------------------------------------------------
// Input validation tests
// ---------------------------------------------------------------------------
describe("cooling_effect input validation", () => {
  test.each([
    ["tdb", "25", 25, 0.3, 50, 1.2, 0.5],
    ["tr", 25, "25", 0.3, 50, 1.2, 0.5],
    ["vr", 25, 25, "0.3", 50, 1.2, 0.5],
    ["rh", 25, 25, 0.3, "50", 1.2, 0.5],
    ["met", 25, 25, 0.3, 50, "1.2", 0.5],
    ["clo", 25, 25, 0.3, 50, 1.2, "0.5"],
  ])("throws TypeError if %s is not a number", (_, ...args) => {
    expect(() => cooling_effect(...args)).toThrow(TypeError);
  });

  test("throws TypeError if wme is not a number", () => {
    expect(() => cooling_effect(25, 25, 0.3, 50, 1.2, 0.5, "0")).toThrow(
      TypeError,
    );
  });

  test("throws Error if units is not a valid enum", () => {
    expect(() =>
      cooling_effect(25, 25, 0.3, 50, 1.2, 0.5, 0, "INVALID"),
    ).toThrow(Error);
  });
});
