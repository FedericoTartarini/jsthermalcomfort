import { describe, expect, test } from "@jest/globals";
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

// ---------------------------------------------------------------------------
// round_output unrounded path
// Reference value is derived analytically from the model equation
// t_cmf = 0.33 * t_running_mean + 18.8, giving 26.06 at t_running_mean = 22.
// Default round_output = true yields 26.1.
// ---------------------------------------------------------------------------
describe("adaptive_en unrounded path", () => {
  test("round_output:false returns the unrounded comfort temperature and bounds", () => {
    const rounded = adaptive_en(25, 25, 22, 0.1);
    const unrounded = adaptive_en(25, 25, 22, 0.1, "SI", true, false);
    expect(rounded.tmp_cmf).toBe(26.1);
    expect(Math.abs(unrounded.tmp_cmf - 26.06)).toBeLessThan(1e-10);
    expect(unrounded.tmp_cmf).not.toBe(rounded.tmp_cmf);
    // tmp_cmf_cat_ii_low = t_cmf - 4.0: 26.06 - 4.0 = 22.06 unrounded; 22.1 rounded.
    expect(rounded.tmp_cmf_cat_ii_low).toBe(22.1);
    expect(Math.abs(unrounded.tmp_cmf_cat_ii_low - 22.06)).toBeLessThan(1e-10);
    expect(unrounded.tmp_cmf_cat_ii_low).not.toBe(rounded.tmp_cmf_cat_ii_low);
  });
});

describe("adaptive_en round_output default", () => {
  test("omitting round_output keeps the default true", () => {
    expect(adaptive_en(25, 25, 22, 0.1).tmp_cmf).toBe(26.1);
  });
});

// ---------------------------------------------------------------------------
// Cooling-effect acceptability boundary
// Locks the cooling-effect gate (get_ce) inside adaptive_en. At
// v >= 0.6 and to >= 25, ce = 1.2 widens the category I upper bound
// from t_cmf + 2.0 to t_cmf + 2.0 + 1.2, which flips
// acceptability_cat_i from false (no cooling effect, v = 0.1) to true
// (cooling effect, v = 0.6) at (tdb=tr=29, t_running_mean=22). Any
// future change that drops the gate fails this test.
// ---------------------------------------------------------------------------
describe("adaptive_en cooling-effect boundary", () => {
  test("v=0.6 widens cat_i acceptability at to=29; v=0.1 does not", () => {
    const wide = adaptive_en(29, 29, 22, 0.6);
    const narrow = adaptive_en(29, 29, 22, 0.1);
    expect(wide.acceptability_cat_i).toBe(true);
    expect(narrow.acceptability_cat_i).toBe(false);
  });

  test("round_output:false preserves cooling-effect acceptability flags", () => {
    const rounded = adaptive_en(29, 29, 22, 0.6);
    const unrounded = adaptive_en(29, 29, 22, 0.6, "SI", true, false);
    expect(unrounded.acceptability_cat_i).toBe(rounded.acceptability_cat_i);
    expect(unrounded.acceptability_cat_ii).toBe(rounded.acceptability_cat_ii);
    expect(unrounded.acceptability_cat_iii).toBe(rounded.acceptability_cat_iii);
  });
});

// ---------------------------------------------------------------------------
// Input validation tests
// ---------------------------------------------------------------------------
describe("adaptive_en input validation", () => {
  test.each([
    ["tdb", "25", 25, 20, 0.1],
    ["tr", 25, "25", 20, 0.1],
    ["t_running_mean", 25, 25, "20", 0.1],
    ["v", 25, 25, 20, "0.1"],
  ])("throws TypeError if %s is not a number", (_, ...args) => {
    expect(() => adaptive_en(...args)).toThrow(TypeError);
  });

  test("throws Error if units is invalid", () => {
    expect(() => adaptive_en(25, 25, 20, 0.1, "INVALID")).toThrow(Error);
  });

  test("throws TypeError if limit_inputs is not a boolean", () => {
    expect(() => adaptive_en(25, 25, 20, 0.1, "SI", "true")).toThrow(TypeError);
  });

  test("throws TypeError if round_output is not a boolean", () => {
    expect(() => adaptive_en(25, 25, 20, 0.1, "SI", true, "true")).toThrow(
      TypeError,
    );
  });
});
