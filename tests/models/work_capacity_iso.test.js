import { describe, expect, test } from "@jest/globals";
import { work_capacity_iso } from "../../src/models/work_capacity_iso.js";
import jsthermalcomfort, {
  work_capacity_iso as exported_work_capacity_iso,
} from "../../src/index.js";

const relativeTolerance = 1e-3;

describe("work_capacity_iso calculation", () => {
  test("test_scalar_typical", () => {
    const result = work_capacity_iso(30.0, 200.0);
    expect(result).toEqual({ capacity: expect.any(Number) });
    expect(Math.abs(result.capacity - 100)).toBeLessThanOrEqual(
      relativeTolerance * 100,
    );
  });

  test("test_list_input_pairwise", () => {
    const wbgts = [20.0, 30.0, 40.0];
    const mets = [100.0, 200.0, 300.0];
    const results = wbgts.map((wbgt, i) => work_capacity_iso(wbgt, mets[i]));
    const expected = [0, 100, 0];
    results.forEach((result, i) => {
      // Use an absolute tolerance when the expected value is 0.
      expect(Math.abs(result.capacity - expected[i])).toBeLessThanOrEqual(
        Math.max(1e-12, relativeTolerance * Math.abs(expected[i])),
      );
    });
  });

  test("test_exact_wbgt_lim_full_capacity", () => {
    const met = 250.0;
    const wbgt_lim = 34.9 - met / 46.0;
    expect(
      Math.abs(work_capacity_iso(wbgt_lim, met).capacity - 100),
    ).toBeLessThanOrEqual(1e-6);
  });

  test("test_resting_limit_zero_capacity", () => {
    const met = 250.0;
    const wbgt_lim_rest = 34.9 - 117.0 / 46.0;
    expect(
      Math.abs(work_capacity_iso(wbgt_lim_rest, met).capacity),
    ).toBeLessThanOrEqual(1e-6);
  });

  test("test_low_wbgt_clamped_to_100", () => {
    expect(
      Math.abs(work_capacity_iso(0.0, 500.0).capacity - 100),
    ).toBeLessThanOrEqual(1e-6);
  });

  test("test_high_wbgt_clamped_to_0", () => {
    expect(
      Math.abs(work_capacity_iso(100.0, 500.0).capacity),
    ).toBeLessThanOrEqual(1e-6);
  });

  test("test_negative_met_raises", () => {
    expect(() => work_capacity_iso(25.0, -10.0)).toThrow(RangeError);
  });

  test("test_met_above_max_raises", () => {
    expect(() => work_capacity_iso(25.0, 3000.0)).toThrow(RangeError);
  });
});

describe("work_capacity_iso edge cases, validation and exports", () => {
  test("preserves an unclamped result without rounding", () => {
    expect(work_capacity_iso(30, 300).capacity).toBeCloseTo(
      59.234972677595636,
      10,
    );
  });

  test.each([
    [0, 0],
    [2500, 14.200587494754513],
  ])("accepts the metabolic-rate boundary %s W", (met, expected) => {
    expect(work_capacity_iso(25, met).capacity).toBeCloseTo(expected, 10);
  });

  test("handles the resting metabolic rate of 117 W", () => {
    expect(work_capacity_iso(30, 117).capacity).toBe(100);
    expect(work_capacity_iso(34.9 - 117 / 46, 117).capacity).toBeNaN();
    expect(work_capacity_iso(40, 117).capacity).toBe(0);
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
    expect(() => work_capacity_iso(value, 300)).toThrow(TypeError);
    expect(() => work_capacity_iso(30, value)).toThrow(TypeError);
  });

  test("is available through named and default package exports", () => {
    expect(exported_work_capacity_iso).toBe(work_capacity_iso);
    expect(jsthermalcomfort.models.work_capacity_iso).toBe(work_capacity_iso);
  });
});
