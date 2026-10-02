import { describe, expect, test } from "@jest/globals";
import { work_capacity_niosh } from "../../src/models/work_capacity_niosh.js";
import jsthermalcomfort, {
  work_capacity_niosh as exported_work_capacity_niosh,
} from "../../src/index.js";

const relativeTolerance = 1e-3;

function expectedCapacity(wbgt, met) {
  const met_rest = 117.0;
  const wbgt_lim = 56.7 - 11.5 * Math.log10(met);
  const wbgt_lim_rest = 56.7 - 11.5 * Math.log10(met_rest);
  const cap = ((wbgt_lim_rest - wbgt) / (wbgt_lim_rest - wbgt_lim)) * 100;
  return Math.min(100, Math.max(0, cap));
}

describe("work_capacity_niosh calculation", () => {
  test("test_scalar_typical", () => {
    const wbgt = 25.0;
    const met = 200.0;
    const result = work_capacity_niosh(wbgt, met);
    expect(result).toEqual({ capacity: expect.any(Number) });
    const expected = expectedCapacity(wbgt, met);
    expect(Math.abs(result.capacity - expected)).toBeLessThanOrEqual(
      relativeTolerance * Math.abs(expected),
    );
  });

  test("test_list_input_pairwise", () => {
    const wbgts = [20.0, 30.0, 40.0];
    const mets = [150.0, 250.0, 350.0];
    const results = wbgts.map((wbgt, i) => work_capacity_niosh(wbgt, mets[i]));
    results.forEach((result, i) => {
      const expected = expectedCapacity(wbgts[i], mets[i]);
      // Use an absolute tolerance when the expected value is 0.
      expect(Math.abs(result.capacity - expected)).toBeLessThanOrEqual(
        Math.max(1e-12, relativeTolerance * Math.abs(expected)),
      );
    });
  });

  test("test_exact_wbgt_lim_full_capacity", () => {
    const met = 300.0;
    const wbgt_lim = 56.7 - 11.5 * Math.log10(met);
    expect(
      Math.abs(work_capacity_niosh(wbgt_lim, met).capacity - 100),
    ).toBeLessThanOrEqual(1e-6);
  });

  test("test_resting_limit_zero_capacity", () => {
    const met = 200.0;
    const wbgt_lim_rest = 56.7 - 11.5 * Math.log10(117.0);
    expect(
      Math.abs(work_capacity_niosh(wbgt_lim_rest, met).capacity),
    ).toBeLessThanOrEqual(1e-6);
  });

  test("test_low_wbgt_clamped_to_100", () => {
    expect(
      Math.abs(work_capacity_niosh(0.0, 250.0).capacity - 100),
    ).toBeLessThanOrEqual(1e-6);
  });

  test("test_high_wbgt_clamped_to_0", () => {
    expect(
      Math.abs(work_capacity_niosh(100.0, 250.0).capacity),
    ).toBeLessThanOrEqual(1e-6);
  });

  test("test_negative_met_raises", () => {
    expect(() => work_capacity_niosh(25.0, -10.0)).toThrow(RangeError);
  });

  test("test_met_above_max_raises", () => {
    expect(() => work_capacity_niosh(25.0, 3000.0)).toThrow(RangeError);
  });
});

describe("work_capacity_niosh edge cases, validation and exports", () => {
  test("preserves an unclamped result without rounding", () => {
    expect(work_capacity_niosh(30, 300).capacity).toBeCloseTo(
      62.003258471944356,
      10,
    );
  });

  test.each([
    [0, 0],
    [2500, 51.764145949502584],
  ])("accepts the metabolic-rate boundary %s W", (met, expected) => {
    expect(work_capacity_niosh(25, met).capacity).toBeCloseTo(expected, 10);
  });

  test("returns 0% at 0 W for every WBGT", () => {
    expect(work_capacity_niosh(-50, 0).capacity).toBe(0);
    expect(work_capacity_niosh(25, 0).capacity).toBe(0);
    expect(work_capacity_niosh(100, 0).capacity).toBe(0);
  });

  test("handles the resting metabolic rate of 117 W", () => {
    expect(work_capacity_niosh(30, 117).capacity).toBe(100);
    expect(
      work_capacity_niosh(56.7 - 11.5 * Math.log10(117), 117).capacity,
    ).toBeNaN();
    expect(work_capacity_niosh(40, 117).capacity).toBe(0);
  });

  test.each([
    ["missing", undefined],
    ["null", null],
    ["string", "30"],
    ["boolean", true],
    ["NaN", NaN],
    ["infinity", Infinity],
    ["negative infinity", -Infinity],
    ["array", [30]],
  ])("rejects %s inputs for either argument", (_, value) => {
    expect(() => work_capacity_niosh(value, 300)).toThrow(TypeError);
    expect(() => work_capacity_niosh(30, value)).toThrow(TypeError);
  });

  test("is available through named and default package exports", () => {
    expect(exported_work_capacity_niosh).toBe(work_capacity_niosh);
    expect(jsthermalcomfort.models.work_capacity_niosh).toBe(
      work_capacity_niosh,
    );
  });
});
