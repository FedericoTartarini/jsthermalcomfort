import { describe, test } from "@jest/globals";
import { net } from "../../src/models/net";
import { testDataUrls } from "./comftest";
import { loadTestData, validateResult } from "./testUtils"; // Import shared utilities

let returnArray = false;

// use top-level await to load test data before tests are defined.
let { testData, tolerances } = await loadTestData(
  testDataUrls.net,
  returnArray,
);

describe("net", () => {
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { tdb, rh, v, options } = inputs;
    const modelResult = net(tdb, rh, v, options);

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });
});

// ---------------------------------------------------------------------------
// Input validation tests
// ---------------------------------------------------------------------------
describe("net input validation", () => {
  test.each([
    ["tdb", "37", 100, 0.1],
    ["rh", 37, "100", 0.1],
    ["v", 37, 100, "0.1"],
  ])("throws TypeError if %s is not a number", (_, ...args) => {
    expect(() => net(...args)).toThrow(TypeError);
  });

  test("throws TypeError if round is not a boolean", () => {
    expect(() => net(37, 100, 0.1, { round: "true" })).toThrow(TypeError);
  });
});
