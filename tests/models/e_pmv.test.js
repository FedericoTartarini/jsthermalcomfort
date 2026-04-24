import { describe, test } from "@jest/globals";
import { e_pmv } from "../../src/models/e_pmv";
import { testDataUrls } from "./comftest";
import { loadTestData, validateResult } from "./testUtils"; // Import shared utilities

let returnArray = false;

// use top-level await to load test data before tests are defined.
let { testData, tolerances } = await loadTestData(
  testDataUrls.ePmv,
  returnArray,
);

describe("e_pmv", () => {
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { tdb, tr, vr, rh, met, clo, e_coefficient } = inputs;
    const modelResult = e_pmv(tdb, tr, vr, rh, met, clo, e_coefficient);

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });
});

// ---------------------------------------------------------------------------
// Input validation tests
// ---------------------------------------------------------------------------
describe("e_pmv input validation", () => {
  test.each([
    ["tdb", "25", 25, 0.1, 50, 1.4, 0.5, 0.6],
    ["tr", 25, "25", 0.1, 50, 1.4, 0.5, 0.6],
    ["vr", 25, 25, "0.1", 50, 1.4, 0.5, 0.6],
    ["rh", 25, 25, 0.1, "50", 1.4, 0.5, 0.6],
    ["met", 25, 25, 0.1, 50, "1.4", 0.5, 0.6],
    ["clo", 25, 25, 0.1, 50, 1.4, "0.5", 0.6],
    ["e_coefficient", 25, 25, 0.1, 50, 1.4, 0.5, "0.6"],
    ["wme", 25, 25, 0.1, 50, 1.4, 0.5, 0.6, "0"],
  ])("throws TypeError if %s is not a number", (_, ...args) => {
    expect(() => e_pmv(...args)).toThrow(TypeError);
  });

  test("throws Error if kwargs.units is not a valid enum", () => {
    expect(() =>
      e_pmv(25, 25, 0.1, 50, 1.4, 0.5, 0.6, 0, { units: "INVALID" }),
    ).toThrow(Error);
  });

  test("throws TypeError if kwargs.limit_inputs is not a boolean", () => {
    expect(() =>
      e_pmv(25, 25, 0.1, 50, 1.4, 0.5, 0.6, 0, { limit_inputs: "true" }),
    ).toThrow(TypeError);
  });
});
