import { describe, expect, test } from "@jest/globals";
import pkg, { work_capacity_hothaps } from "../../src/index.js";

// Mirror tests/test_work_capacity_hothaps.py at Python commit
// 3a2dc606971ab3684a90185ffd1c1582aae87fc5 (names, inputs, expectations, tolerances).
function _expected_capacity(wbgt, divisor, exponent) {
  if (Array.isArray(wbgt))
    return wbgt.map((v) => _expected_capacity(v, divisor, exponent));
  return Math.min(
    100,
    Math.max(0, 100 * (0.1 + 0.9 / (1 + (wbgt / divisor) ** exponent))),
  );
}

function approx(actual, expected, rel = 1e-3) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(
    Math.max(1e-12, rel * Math.abs(expected)),
  );
}

describe("work_capacity_hothaps", () => {
  test.each([
    ["test_scalar_heavy", "heavy", 30.94, 16.64],
    ["test_scalar_moderate", "moderate", 32.93, 17.81],
    ["test_scalar_light", "light", 34.64, 22.72],
  ])("%s", (_, intensity, divisor, exponent) => {
    const result = work_capacity_hothaps(30.0, intensity);
    expect(result).toHaveProperty("capacity");
    expect(typeof result.capacity).toBe("number");
    approx(result.capacity, _expected_capacity(30.0, divisor, exponent));
  });
  test("test_list_input", () => {
    const wbgts = [20.0, 40.0];
    const result = work_capacity_hothaps(wbgts, "heavy");
    expect(Array.isArray(result.capacity)).toBe(true);
    const exp_list = _expected_capacity(wbgts, 30.94, 16.64);
    expect(result.capacity).toHaveLength(exp_list.length);
    exp_list.forEach((e, i) => approx(result.capacity[i], e));
  });
  test("test_low_wbgt_clamped_to_100", () => {
    approx(work_capacity_hothaps(0.0, "light").capacity, 100.0, 1e-6);
  });
  test("test_high_wbgt_approaches_10_percent", () => {
    approx(work_capacity_hothaps(100.0, "moderate").capacity, 10.0);
  });
  test("test_invalid_intensity_raises", () => {
    expect(() => work_capacity_hothaps(30.0, "invalid")).toThrow(Error);
  });
});

describe("additional JS API and edge cases", () => {
  test("default, mixed-case intensity and package export", () => {
    approx(work_capacity_hothaps(30).capacity, 66.30396938573278, 1e-12);
    expect(work_capacity_hothaps(30, "HeAvY")).toEqual(
      work_capacity_hothaps(30),
    );
    expect(pkg.models.work_capacity_hothaps).toBe(work_capacity_hothaps);
  });
  test("NumPy special values and rectangular arrays", () => {
    const input = Object.freeze([
      Object.freeze([0, NaN]),
      Object.freeze([Infinity, -Infinity]),
    ]);
    expect(work_capacity_hothaps(input).capacity).toEqual([
      [100, NaN],
      [10, 10],
    ]);
    expect(work_capacity_hothaps(-1).capacity).toBeNaN();
    expect(work_capacity_hothaps([]).capacity).toEqual([]);
    expect(work_capacity_hothaps([[]]).capacity).toEqual([[]]);
  });
  test.each(
    [undefined, null, "30", {}, [30, "40"], Array(1)].map((value) => ({
      value,
    })),
  )("rejects non-numeric input %#", ({ value }) => {
    expect(() => work_capacity_hothaps(value)).toThrow(TypeError);
  });
  test("rejects ragged arrays", () => {
    expect(() => work_capacity_hothaps([[1], [2, 3]])).toThrow(RangeError);
  });
  test("matches Python boolean scalars and arrays", () => {
    expect(work_capacity_hothaps(true)).toEqual(work_capacity_hothaps(1));
    expect(work_capacity_hothaps(false)).toEqual(work_capacity_hothaps(0));
    expect(
      work_capacity_hothaps([
        [true, 30],
        [false, 40],
      ]),
    ).toEqual(
      work_capacity_hothaps([
        [1, 30],
        [0, 40],
      ]),
    );
  });
  test.each([null, 1, true, [], {}].map((value) => ({ value })))(
    "rejects non-string intensity %#",
    ({ value }) => {
      expect(() => work_capacity_hothaps(30, value)).toThrow(TypeError);
    },
  );
});
