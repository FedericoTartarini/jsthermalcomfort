import { describe, expect, test } from "@jest/globals";
import { adaptive_en } from "../../src/models/adaptive_en";
import { testDataUrls } from "./comftest";
import { loadTestData, validateResult } from "./testUtils"; // use the utils

const returnArray = false;

const { testData, tolerances } = await loadTestData(
  testDataUrls.adaptiveEn,
  returnArray,
);

describe("adaptive_en", () => {
  test.each(testData.data)("test_adaptive_en case %#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { tdb, tr, t_running_mean, v } = inputs;
    const modelResult = adaptive_en(tdb, tr, t_running_mean, v);

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });

  test("test_ashrae_inputs_invalid_units", () => {
    expect(() => adaptive_en(25, 25, 20, 0.1, "INVALID")).toThrow(Error);
  });

  test("test_ashrae_inputs_invalid_tdb_type", () => {
    expect(() => adaptive_en("invalid", 25, 20, 0.1)).toThrow(TypeError);
  });

  test("test_ashrae_inputs_invalid_tr_type", () => {
    expect(() => adaptive_en(25, "invalid", 20, 0.1)).toThrow(TypeError);
  });

  test("test_ashrae_inputs_invalid_t_running_mean_type", () => {
    expect(() => adaptive_en(25, 25, "invalid", 0.1)).toThrow(TypeError);
  });

  test("test_ashrae_inputs_invalid_v_type", () => {
    expect(() => adaptive_en(25, 25, 20, "invalid")).toThrow(TypeError);
  });

  test("test_round_output_default_preserves_behaviour", () => {
    const defaultResult = adaptive_en(25, 25, 20.5, 0.1);
    const explicitResult = adaptive_en(25, 25, 20.5, 0.1, "SI", true, true);

    expect(defaultResult.tmp_cmf).toBe(explicitResult.tmp_cmf);
    expect(defaultResult.tmp_cmf_cat_i_up).toBe(
      explicitResult.tmp_cmf_cat_i_up,
    );
    expect(defaultResult.tmp_cmf_cat_i_low).toBe(
      explicitResult.tmp_cmf_cat_i_low,
    );
    expect(defaultResult.tmp_cmf_cat_ii_up).toBe(
      explicitResult.tmp_cmf_cat_ii_up,
    );
    expect(defaultResult.tmp_cmf_cat_iii_low).toBe(
      explicitResult.tmp_cmf_cat_iii_low,
    );
  });

  test("test_round_output_false_returns_unrounded", () => {
    const unrounded = adaptive_en(25, 25, 20.5, 0.1, "SI", true, false);
    const rounded = adaptive_en(25, 25, 20.5, 0.1, "SI", true, true);

    expect(unrounded.tmp_cmf).toBeCloseTo(25.565);
    expect(rounded.tmp_cmf).toBeCloseTo(25.6);
    expect(unrounded.tmp_cmf).not.toBe(rounded.tmp_cmf);
    expect(unrounded.tmp_cmf_cat_i_low).toBeCloseTo(25.565 - 3.0);
    expect(unrounded.tmp_cmf_cat_ii_up).toBeCloseTo(25.565 + 3.0);
  });

  test("test_round_output_invalid_type_raises", () => {
    expect(() => adaptive_en(25, 25, 20, 0.1, "SI", true, "yes")).toThrow(
      TypeError,
    );
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

describe("adaptive_en additional input validation", () => {
  test("limit_inputs must be a boolean", () => {
    expect(() => adaptive_en(25, 25, 20, 0.1, "SI", "true")).toThrow(TypeError);
  });
});
