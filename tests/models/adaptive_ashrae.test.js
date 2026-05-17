import { describe, expect, test } from "@jest/globals";
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

// ---------------------------------------------------------------------------
// round_output unrounded path
// Reference value is derived analytically from the model equation
// t_cmf = 0.31 * t_running_mean + 17.8, giving 24.62 at t_running_mean = 22.
// Default round_output = true yields 24.6.
//
// Note: round_output=false propagates unrounded t_cmf into bounds,
// which can shift acceptability flags at narrow boundary inputs.
// The test below uses a non-boundary input to verify the typical case.
// ---------------------------------------------------------------------------
describe("adaptive_ashrae unrounded path", () => {
  test("round_output:false returns the unrounded comfort temperature and bounds", () => {
    const rounded = adaptive_ashrae(25, 25, 22, 0.1);
    const unrounded = adaptive_ashrae(25, 25, 22, 0.1, "SI", true, false);
    expect(rounded.tmp_cmf).toBe(24.6);
    expect(Math.abs(unrounded.tmp_cmf - 24.62)).toBeLessThan(1e-10);
    expect(unrounded.tmp_cmf).not.toBe(rounded.tmp_cmf);
    // tmp_cmf_80_low = t_cmf - 3.5: 24.62 - 3.5 = 21.12 unrounded; 21.1 rounded.
    expect(rounded.tmp_cmf_80_low).toBe(21.1);
    expect(Math.abs(unrounded.tmp_cmf_80_low - 21.12)).toBeLessThan(1e-10);
    expect(unrounded.tmp_cmf_80_low).not.toBe(rounded.tmp_cmf_80_low);
  });
});

describe("adaptive_ashrae round_output default", () => {
  test("omitting round_output keeps the default true", () => {
    expect(adaptive_ashrae(25, 25, 22, 0.1).tmp_cmf).toBe(24.6);
  });
});

// ---------------------------------------------------------------------------
// Cooling-effect acceptability boundary
// Locks the cooling-effect gate (get_ce) inside adaptive_ashrae. At
// v >= 0.6 and to >= 25, ce = 1.2 widens the 90% upper bound from
// t_cmf + 2.5 to t_cmf + 2.5 + 1.2, which flips acceptability_90 from
// false (no cooling effect, v = 0.1) to true (cooling effect, v = 0.6)
// at (tdb=tr=28, t_running_mean=22). Any future change that drops the
// gate fails this test.
// ---------------------------------------------------------------------------
describe("adaptive_ashrae cooling-effect boundary", () => {
  test("v=0.6 widens 90% acceptability at to=28; v=0.1 does not", () => {
    const wide = adaptive_ashrae(28, 28, 22, 0.6);
    const narrow = adaptive_ashrae(28, 28, 22, 0.1);
    expect(wide.acceptability_90).toBe(true);
    expect(narrow.acceptability_90).toBe(false);
  });

  test("round_output:false acceptability matches round_output:true at non-boundary input", () => {
    const rounded = adaptive_ashrae(28, 28, 22, 0.6);
    const unrounded = adaptive_ashrae(28, 28, 22, 0.6, "SI", true, false);
    expect(unrounded.acceptability_80).toBe(rounded.acceptability_80);
    expect(unrounded.acceptability_90).toBe(rounded.acceptability_90);
  });
});

// ---------------------------------------------------------------------------
// Input validation tests
// ---------------------------------------------------------------------------
describe("adaptive_ashrae input validation", () => {
  test.each([
    ["tdb", "25", 25, 20, 0.1],
    ["tr", 25, "25", 20, 0.1],
    ["t_running_mean", 25, 25, "20", 0.1],
    ["v", 25, 25, 20, "0.1"],
  ])("throws TypeError if %s is not a number", (_, ...args) => {
    expect(() => adaptive_ashrae(...args)).toThrow(TypeError);
  });

  test("throws Error if units is invalid", () => {
    expect(() => adaptive_ashrae(25, 25, 20, 0.1, "INVALID")).toThrow(Error);
  });

  test("throws TypeError if limit_inputs is not a boolean", () => {
    expect(() => adaptive_ashrae(25, 25, 20, 0.1, "SI", "true")).toThrow(
      TypeError,
    );
  });

  test("throws TypeError if round_output is not a boolean", () => {
    expect(() => adaptive_ashrae(25, 25, 20, 0.1, "SI", true, "true")).toThrow(
      TypeError,
    );
  });
});
