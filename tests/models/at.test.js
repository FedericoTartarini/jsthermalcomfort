import { describe } from "@jest/globals";
import { at } from "../../src/models/at.js";
import { testDataUrls } from "./comftest";
import { loadTestData, validateResult } from "./testUtils"; // Import shared utilities

let returnArray = false;

// use top-level await to load test data before tests are defined.
let { testData, tolerances } = await loadTestData(testDataUrls.at, returnArray);

describe("at", () => {
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { tdb, rh, v, q } = inputs;
    const modelResult = at(tdb, rh, v, q);

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });
});

// ---------------------------------------------------------------------------
// Input validation tests
// ---------------------------------------------------------------------------
describe("at input validation", () => {
  test.each([
    ["tdb", "25", 50, 0.5],
    ["rh", 25, "50", 0.5],
    ["v", 25, 50, "0.5"],
  ])("throws TypeError if %s is not a number", (_, ...args) => {
    expect(() => at(...args)).toThrow(TypeError);
  });

  test("throws TypeError if q is provided but not a number", () => {
    expect(() => at(25, 50, 0.5, "200")).toThrow(TypeError);
  });

  test("throws TypeError if round is not a boolean", () => {
    expect(() => at(25, 50, 0.5, undefined, { round: "true" })).toThrow(
      TypeError,
    );
  });
});
