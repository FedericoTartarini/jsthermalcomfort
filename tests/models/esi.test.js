import { describe, expect, test } from "@jest/globals";
import { esi } from "../../src/models/esi.js";
import models, { esi as exportedEsi } from "../../src/models/index.js";

// Reference: https://github.com/pythermalcomfort/pythermalcomfort/blob/a4244026c71a7befbb1a5ced4c7b367e4966f951/tests/test_esi.py
// Mirror pythermalcomfort/tests/test_esi.py. Unlike its is_equal calls,
// these comparisons assert the result so incorrect expectations cannot pass silently.
test("test_esi", () => {
  expect(Math.abs(esi(30.2, 42.2, 766).esi - 26.2)).toBeLessThanOrEqual(0.1);
});

test("test_esi_list_input", () => {
  const actual = esi([30.2, 27.0], [42.2, 68.8], [766, 289]).esi;
  expect(actual).toHaveLength(2);
  [26.2, 25.6].forEach((expected, i) => {
    expect(Math.abs(actual[i] - expected)).toBeLessThanOrEqual(0.1);
  });
});

test.each([
  [30, -5, 500],
  [30, 120, 500],
  [30, 50, -10],
])("test_esi_invalid_numeric_ranges (%j, %j, %j)", (tdb, rh, sol) => {
  expect(() => esi(tdb, rh, sol)).toThrow(RangeError);
});

// Known upstream inconsistency: retain the exact Python cases and expected
// values as expected failures. Python currently ignores is_equal's false result.
// The formula returns 19.9, 33.1 and 24.8; assert those independently below.
// Remove failing only once the upstream expectations have been corrected.
test.failing.each([
  [30, 0, 500, 16.5],
  [30, 100, 500, 19.5],
  [30, 50, 0, 18.0],
])(
  "test_esi_boundary_conditions (%j, %j, %j, %j)",
  (tdb, rh, sol, expected) => {
    expect(Math.abs(esi(tdb, rh, sol).esi - expected)).toBeLessThanOrEqual(0.1);
  },
);

test.each([
  ["30.0", 45, 500],
  [30, "45", 500],
  [30, 45, "500.0"],
])("test_esi_invalid_type (%j, %j, %j)", (tdb, rh, sol) => {
  expect(() => esi(tdb, rh, sol)).toThrow(TypeError);
});

describe("esi API alignment regressions", () => {
  test.each([
    [30, 0, 500, 19.9],
    [30, 100, 500, 33.1],
    [30, 50, 0, 24.8],
  ])(
    "matches Python formula at boundaries (%j, %j, %j)",
    (tdb, rh, sol, expected) => {
      expect(esi(tdb, rh, sol)).toEqual({ esi: expected });
    },
  );
  test("exports the canonical function", () => {
    expect(models.esi).toBe(esi);
    expect(exportedEsi).toBe(esi);
  });
  test("supports unrounded scalar and array results", () => {
    expect(esi(30.2, 42.2, 766, false).esi).toBeCloseTo(26.173880712178565, 12);
    const result = esi([30.2, 27], [42.2, 68.8], [766, 289], false).esi;
    expect(result[0]).toBeCloseTo(26.173880712178565, 12);
    expect(result[1]).toBeCloseTo(25.554787492217226, 12);
  });
  test.each([
    [30, [0, 100], 500, [19.9, 33.1]],
    [[30], [0, 100], [500], [19.9, 33.1]],
    [[30, 30], 50, [0, 500], [24.8, 26.5]],
    [[30], [50], [0], [24.8]],
    [[], 50, 0, []],
    [30, [], [0], []],
    [30, 50, [], []],
  ])("broadcasts scalars/singletons (%j, %j, %j)", (tdb, rh, sol, expected) => {
    expect(esi(tdb, rh, sol)).toEqual({ esi: expected });
  });
  test("rejects incompatible array lengths", () => {
    expect(() => esi([30, 31], [40, 50, 60], 500)).toThrow(RangeError);
    expect(() => esi([], [40, 50], 500)).toThrow(RangeError);
  });
  test.each([
    [30, [-1, 50], 500],
    [30, [50, 101], 500],
    [30, 50, [0, -1]],
  ])("validates every array element's range (%j, %j, %j)", (...args) => {
    expect(() => esi(...args)).toThrow(RangeError);
  });
  test.each([
    [],
    [30],
    [30, 50],
    [null, 50, 500],
    [[30, "31"], 50, 500],
    [30, 50, 500, "true"],
    [30, 50, 500, null],
  ])("rejects missing or invalid inputs (%j)", (...args) => {
    expect(() => esi(...args)).toThrow(TypeError);
  });
  test("rounds halfway values to even like NumPy", () => {
    expect(esi(1.5555555555555556, 0, 0, false).esi).toBe(0.25);
    expect(esi(1.5555555555555556, 0, 0).esi).toBe(0.2);
  });
  test("propagates NaN as Python does", () => {
    expect(esi(NaN, 50, 500).esi).toBeNaN();
  });
});
