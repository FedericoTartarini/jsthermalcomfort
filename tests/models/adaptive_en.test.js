import { describe, test } from "@jest/globals";
import { adaptive_en } from "../../src/models/adaptive_en";
import { testDataUrls } from "./comftest";
import { loadTestData, validateResult } from "./testUtils"; // use the utils

let returnArray = false;

let { testData, tolerances } = await loadTestData(
  testDataUrls.adaptiveEn,
  returnArray,
);

describe("adaptive_en", () => {
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { tdb, tr, t_running_mean, v, units } = inputs;
    const modelResult = adaptive_en(tdb, tr, t_running_mean, v, units);

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });
});

// ---------------------------------------------------------------------------
// Scalar hardcoded tests
// Expected values obtained from pythermalcomfort reference implementation.
//
// Scenarios covered:
//   SC-1  Neutral comfort, t_running_mean within range → all categories acceptable
//   SC-2  Warm indoor exceeds comfort zone → not acceptable in any category
//   SC-3  Cool indoor below comfort zone → not acceptable in any category
//   SC-4  Out-of-range t_running_mean → tmp_cmf is NaN
//   SC-5  Higher air speed → wider comfort range
// ---------------------------------------------------------------------------
describe("adaptive_en scalar tests (hardcoded)", () => {
  test("SC-1 Neutral comfort, t_running_mean within range → all categories acceptable", () => {
    const result = adaptive_en(25, 25, 20, 0.1);
    validateResult(result, { tmp_cmf: 25.4 }, tolerances, {});
    expect(result.acceptability_cat_i).toBe(true);
    expect(result.acceptability_cat_ii).toBe(true);
    expect(result.acceptability_cat_iii).toBe(true);
  });

  test("SC-2 Warm indoor exceeds comfort zone → not acceptable in any category", () => {
    const result = adaptive_en(30, 30, 20, 0.1);
    validateResult(result, { tmp_cmf: 25.4 }, tolerances, {});
    expect(result.acceptability_cat_i).toBe(false);
    expect(result.acceptability_cat_ii).toBe(false);
    expect(result.acceptability_cat_iii).toBe(false);
  });

  test("SC-3 Cool indoor below comfort zone → not acceptable in any category", () => {
    const result = adaptive_en(17, 17, 12, 0.1);
    validateResult(result, { tmp_cmf: 22.8 }, tolerances, {});
    expect(result.acceptability_cat_i).toBe(false);
    expect(result.acceptability_cat_ii).toBe(false);
    expect(result.acceptability_cat_iii).toBe(false);
  });

  test("SC-4 Out-of-range t_running_mean → tmp_cmf is NaN", () => {
    const result = adaptive_en(25, 25, 8, 0.1, "SI", true);
    expect(result.tmp_cmf).toBeNaN();
    expect(result.acceptability_cat_i).toBe(false);
    expect(result.acceptability_cat_ii).toBe(false);
    expect(result.acceptability_cat_iii).toBe(false);
  });

  test("SC-5 Higher air speed → wider comfort range", () => {
    const result = adaptive_en(27, 27, 22, 0.6);
    validateResult(result, { tmp_cmf: 26.1 }, tolerances, {});
    expect(result.acceptability_cat_i).toBe(true);
    expect(result.acceptability_cat_ii).toBe(true);
    expect(result.acceptability_cat_iii).toBe(true);
  });
});
