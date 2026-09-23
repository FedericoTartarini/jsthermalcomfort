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

// ---------------------------------------------------------------------------
// Deviation from upstream's unasserted test_at_q value (jsthermalcomfort#219)
// ---------------------------------------------------------------------------
describe("Deviation from upstream's unasserted test_at_q value (jsthermalcomfort#219)", () => {
  // Mirrors pythermalcomfort's test_at_q, but with the correct expected
  // value. Upstream's test_at_q calls is_equal(...) without asserting the
  // result, so its hardcoded 25.3 was never actually checked. The real value
  // for these inputs is 30.9 on both sides.
  test("calculates AT correctly when q is provided", () => {
    const result = at(25, 30, 0.1, 100);
    expect(result.at).toBeCloseTo(30.9, 1);
  });
});
