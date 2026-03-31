import { describe, test } from "@jest/globals";
import { adaptive_ashrae } from "../../src/models/adaptive_ashrae";
import { testDataUrls } from "./comftest";
import { loadTestData, validateResult } from "./testUtils";

let returnArray = false;

let { testData, tolerances } = await loadTestData(
  testDataUrls.adaptiveAshrae,
  returnArray,
);

describe("adaptive_ashrae", () => {
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { tdb, tr, t_running_mean, v, units } = inputs;
    const modelResult = adaptive_ashrae(tdb, tr, t_running_mean, v, units);

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });
});

// ---------------------------------------------------------------------------
// Scalar hardcoded tests
// Expected values obtained from pythermalcomfort reference implementation.
//
// Scenarios covered:
//   SC-1  Neutral comfort, t_running_mean within range → comfort predicted
//   SC-2  Warm indoor exceeds comfort zone → not acceptable
//   SC-3  Cool indoor below comfort zone → not acceptable
//   SC-4  Out-of-range t_running_mean → tmp_cmf is NaN
//   SC-5  IP units conversion
// ---------------------------------------------------------------------------
describe("adaptive_ashrae scalar tests (hardcoded)", () => {
  test("SC-1 Neutral comfort, t_running_mean within range → comfort predicted", () => {
    const result = adaptive_ashrae(25, 25, 20, 0.1);
    validateResult(result, { tmp_cmf: 24.0 }, tolerances, {});
    expect(result.acceptability_80).toBe(true);
    expect(result.acceptability_90).toBe(true);
  });

  test("SC-2 Warm indoor exceeds comfort zone → not acceptable", () => {
    const result = adaptive_ashrae(32, 32, 20, 0.1);
    validateResult(result, { tmp_cmf: 24.0 }, tolerances, {});
    expect(result.acceptability_80).toBe(false);
    expect(result.acceptability_90).toBe(false);
  });

  test("SC-3 Cool indoor below comfort zone → not acceptable", () => {
    const result = adaptive_ashrae(15, 15, 12, 0.1);
    validateResult(result, { tmp_cmf: 21.5 }, tolerances, {});
    expect(result.acceptability_80).toBe(false);
    expect(result.acceptability_90).toBe(false);
  });

  test("SC-4 Out-of-range t_running_mean → tmp_cmf is NaN", () => {
    const result = adaptive_ashrae(25, 25, 5, 0.1, "SI", true);
    expect(result.tmp_cmf).toBeNaN();
    expect(result.acceptability_80).toBe(false);
    expect(result.acceptability_90).toBe(false);
  });

  test("SC-5 IP units conversion", () => {
    const result = adaptive_ashrae(77, 77, 68, 0.3, "IP");
    validateResult(result, { tmp_cmf: 75.2 }, tolerances, {});
    expect(result.acceptability_80).toBe(true);
    expect(result.acceptability_90).toBe(true);
  });
});
