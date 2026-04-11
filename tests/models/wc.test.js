import { describe } from "@jest/globals";
import { wc } from "../../src/models/wc.js";
import { testDataUrls } from "./comftest"; // Import all test URLs from comftest.js
import { loadTestData, validateResult } from "./testUtils"; // Import utility functions

let returnArray = false;

// use top-level await to load test data before tests are defined.
let { testData, tolerances } = await loadTestData(testDataUrls.wc, returnArray);

describe("test_wc", () => {
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { tdb, v, round } = inputs;
    const kwargs = { round };
    const modelResult = wc(tdb, v, kwargs);

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });
});

// ---------------------------------------------------------------------------
// Input validation tests
// ---------------------------------------------------------------------------
describe("wc input validation", () => {
  test.each([
    ["tdb", "0", 5],
    ["v", 0, "5"],
  ])("throws TypeError if %s is not a number", (_, ...args) => {
    expect(() => wc(...args)).toThrow(TypeError);
  });

  test("throws TypeError if round is not a boolean", () => {
    expect(() => wc(0, 5, { round: "true" })).toThrow(TypeError);
  });
});
