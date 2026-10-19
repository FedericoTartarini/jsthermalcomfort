import { describe, expect, test } from "@jest/globals";
import { net } from "../../src/models/net";
import { testDataUrls } from "./comftest";
import { loadTestData, validateResult } from "./testUtils"; // Import shared utilities

const returnArray = false;

// use top-level await to load test data before tests are defined.
const { testData, tolerances } = await loadTestData(
  testDataUrls.net,
  returnArray,
);

describe("net", () => {
  test.each(testData.data)("test_net case %#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { tdb, rh, v, round_output } = inputs;
    const modelResult = net(tdb, rh, v, round_output);

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });

  test("test_round_output_defaults_to_true", () => {
    expect(net(30, 60, 0.5).net).toBe(26.4);
  });

  test("test_round_output_false_returns_unrounded_value", () => {
    expect(net(30, 60, 0.5, false).net).toBeCloseTo(26.389775345409905, 12);
  });

  test("test_rounding_uses_numpy_ties_to_even", () => {
    const tdb = 19.617348997110277;

    expect(net(tdb, 100, 0.1, false).net).toBeCloseTo(20.25, 12);
    expect(net(tdb, 100, 0.1).net).toBe(20.2);
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

  test("throws TypeError if round_output is not a boolean", () => {
    expect(() => net(37, 100, 0.1, "true")).toThrow(TypeError);
  });
});
