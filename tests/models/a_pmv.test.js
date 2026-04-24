import { describe, test } from "@jest/globals";
import { a_pmv } from "../../src/models/a_pmv.js";
import { testDataUrls } from "./comftest";
import { loadTestData, validateResult } from "./testUtils"; // Use the utils

let returnArray = false;

// use top-level await to load test data before tests are defined.
let { testData, tolerances } = await loadTestData(
  testDataUrls.aPmv,
  returnArray,
);

describe("a_pmv", () => {
  // automatically number each test case
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { tdb, tr, vr, rh, met, clo, a_coefficient, wme } = inputs;

    const modelResult = a_pmv(tdb, tr, vr, rh, met, clo, a_coefficient, wme);

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });
});

// ---------------------------------------------------------------------------
// Input validation tests
// ---------------------------------------------------------------------------
describe("a_pmv input validation", () => {
  test.each([
    ["tdb", "25", 25, 0.1, 50, 1.2, 0.5, 0.293],
    ["tr", 25, "25", 0.1, 50, 1.2, 0.5, 0.293],
    ["vr", 25, 25, "0.1", 50, 1.2, 0.5, 0.293],
    ["rh", 25, 25, 0.1, "50", 1.2, 0.5, 0.293],
    ["met", 25, 25, 0.1, 50, "1.2", 0.5, 0.293],
    ["clo", 25, 25, 0.1, 50, 1.2, "0.5", 0.293],
    ["a_coefficient", 25, 25, 0.1, 50, 1.2, 0.5, "0.293"],
    ["wme", 25, 25, 0.1, 50, 1.2, 0.5, 0.293, "0"],
  ])("throws TypeError if %s is not a number", (_, ...args) => {
    expect(() => a_pmv(...args)).toThrow(TypeError);
  });

  test("throws Error if units is invalid", () => {
    expect(() =>
      a_pmv(25, 25, 0.1, 50, 1.2, 0.5, 0.293, 0, { units: "wrong" }),
    ).toThrow(Error);
  });

  test("throws TypeError if limit_inputs is not a boolean", () => {
    expect(() =>
      a_pmv(25, 25, 0.1, 50, 1.2, 0.5, 0.293, 0, { limit_inputs: "true" }),
    ).toThrow(TypeError);
  });
});
