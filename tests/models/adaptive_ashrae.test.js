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
// Regression test for issue #179:
// round_output should only affect numeric output formatting, not acceptability.
// The acceptability flags are derived from unrounded values and must be
// identical regardless of round_output setting.
// ---------------------------------------------------------------------------
describe("adaptive_ashrae round_output acceptability regression (issue #179)", () => {
  test("acceptability at boundary input (SI): unrounded bounds correctly identify acceptability", () => {
    // t_running_mean = 12.40 gives t_cmf ≈ 21.644
    // Unrounded: t_cmf = 21.644
    // Upper 80 bound: 21.644 + 3.5 + 0 = 25.144 (ce=0 since to < 25)
    // Upper 90 bound: 21.644 + 2.5 + 0 = 24.144
    // Operative temperature 25.12:
    // - Within 80 bound (25.12 < 25.144) → acceptability_80 = true
    // - Outside 90 bound (25.12 > 24.144) → acceptability_90 = false
    const rounded = adaptive_ashrae(25.12, 25.12, 12.4, 0.1, "SI", true, true);
    const unrounded = adaptive_ashrae(
      25.12,
      25.12,
      12.4,
      0.1,
      "SI",
      true,
      false,
    );
    // Both should match because acceptability is computed from unrounded values
    expect(rounded.acceptability_80).toBe(true);
    expect(unrounded.acceptability_80).toBe(true);
    expect(rounded.acceptability_90).toBe(false);
    expect(unrounded.acceptability_90).toBe(false);
  });

  test("acceptability at boundary input (IP): unrounded bounds correctly identify acceptability", () => {
    // Convert the same test case to IP units:
    // 25.12°C = 77.216°F, t_running_mean 12.40°C = 54.32°F, v=0.1 m/s ≈ 0.328 ft/s
    // Same acceptability calculation should apply in IP mode:
    // t_cmf ≈ 21.644°C ≈ 70.96°F
    // Upper 80 bound ≈ 25.144°C ≈ 77.26°F
    // Upper 90 bound ≈ 24.144°C ≈ 75.46°F
    // Operative temperature ≈ 77.216°F (> 75.46°F)
    // Expected: acceptability_80 = true, acceptability_90 = false
    const rounded = adaptive_ashrae(
      77.216,
      77.216,
      54.32,
      0.328,
      "IP",
      true,
      true,
    );
    const unrounded = adaptive_ashrae(
      77.216,
      77.216,
      54.32,
      0.328,
      "IP",
      true,
      false,
    );
    expect(rounded.acceptability_80).toBe(true);
    expect(unrounded.acceptability_80).toBe(true);
    expect(rounded.acceptability_90).toBe(false);
    expect(unrounded.acceptability_90).toBe(false);
  });

  test("acceptability flags are identical across wide range of inputs", () => {
    const testCases = [
      { tdb: 20, tr: 20, t_running_mean: 15, v: 0.1 },
      { tdb: 24, tr: 24, t_running_mean: 20, v: 0.2 },
      { tdb: 26, tr: 26, t_running_mean: 22, v: 0.3 },
      { tdb: 28, tr: 28, t_running_mean: 24, v: 0.4 },
    ];

    testCases.forEach(({ tdb, tr, t_running_mean, v }) => {
      const rounded = adaptive_ashrae(
        tdb,
        tr,
        t_running_mean,
        v,
        "SI",
        true,
        true,
      );
      const unrounded = adaptive_ashrae(
        tdb,
        tr,
        t_running_mean,
        v,
        "SI",
        true,
        false,
      );
      expect(rounded.acceptability_80).toBe(unrounded.acceptability_80);
      expect(rounded.acceptability_90).toBe(unrounded.acceptability_90);
    });
  });

  test("IP output values are rounded to 1 decimal place when round_output:true", () => {
    // t_running_mean (IP) = 54.32°F = 12.4°C
    // SI calculation: t_cmf = 0.31 * 12.4 + 17.8 = 21.644°C
    // All SI bounds computed from unrounded t_cmf, then converted to IP and rounded.
    // With round_output=true: t_cmf (SI) = 21.644 → 21.6 (rounded for display)
    // Bounds (SI): 80_low = 18.144, 80_up = 25.144, 90_low = 19.144, 90_up = 24.144
    // Converted to IP and rounded: tmp_cmf = 71, tmp_cmf_80_low = 64.7,
    //   tmp_cmf_80_up = 77.3, tmp_cmf_90_low = 66.5, tmp_cmf_90_up = 75.5
    //
    // REGRESSION TEST: This test FAILS against the pre-fix implementation, which would
    // round t_cmf (21.644 → 21.6) BEFORE computing bounds. The rounded SI value
    // (21.6°C = 70.88°F) differs from the final IP value (71°F) computed from
    // unrounded SI values, proving the fix changes IP output formatting.
    const resultIP = adaptive_ashrae(77, 77, 54.32, 0.328, "IP", true, true);
    // All output numeric values should have at most 1 decimal place
    const checkDecimalPlaces = (value) => {
      const str = value.toString();
      const decimalPart = str.split(".")[1] || "";
      return decimalPart.length;
    };
    expect(checkDecimalPlaces(resultIP.tmp_cmf)).toBeLessThanOrEqual(1);
    expect(checkDecimalPlaces(resultIP.tmp_cmf_80_low)).toBeLessThanOrEqual(1);
    expect(checkDecimalPlaces(resultIP.tmp_cmf_80_up)).toBeLessThanOrEqual(1);
    expect(checkDecimalPlaces(resultIP.tmp_cmf_90_low)).toBeLessThanOrEqual(1);
    expect(checkDecimalPlaces(resultIP.tmp_cmf_90_up)).toBeLessThanOrEqual(1);
    // Assert concrete expected values for all five outputs
    // (computed from actual execution of fixed code)
    expect(resultIP.tmp_cmf).toBe(71);
    expect(resultIP.tmp_cmf_80_low).toBe(64.7);
    expect(resultIP.tmp_cmf_80_up).toBe(77.3);
    expect(resultIP.tmp_cmf_90_low).toBe(66.5);
    expect(resultIP.tmp_cmf_90_up).toBe(75.5);
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
