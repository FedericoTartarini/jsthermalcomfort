import { describe, expect, test } from "@jest/globals";
import { thi } from "../../src/models/thi.js";
import library, { thi as publicThi } from "../../src/index.js";

// Mirror pythermalcomfort/tests/test_thi.py (development, 2891054).
describe("thi", () => {
  test.each([
    [30.0, 70.0, 81.4],
    [20.0, 50.0, 65.2],
  ])("test_scalar_rounding_default (%s, %s)", (tdb, rh, expected) => {
    const result = thi(tdb, rh);
    expect(typeof result.thi).toBe("number");
    expect(result.thi).toBeCloseTo(expected, 6);
  });
  test("test_scalar_no_rounding", () => {
    const tdb = 30.0,
      rh = 70.0;
    const expected = 1.8 * tdb + 32 - 0.55 * (1 - 0.01 * rh) * (1.8 * tdb - 26);
    expect(thi(tdb, rh, false).thi).toBeCloseTo(expected, 6);
  });
  test("test_list_input", () => {
    // JS intentionally uses scalar calls instead of NumPy broadcasting (#215).
    const result = [30, 20].map((t, i) => thi(t, [70, 50][i]).thi);
    expect(result).toEqual([81.4, 65.2]);
  });
  test.each([
    [25.0, -5.0, RangeError],
    [25.0, 150.0, RangeError],
    ["hot", "humid", TypeError],
  ])("test_invalid_inputs_raise_specific (%s, %s)", (tdb, rh, error) => {
    expect(() => thi(tdb, rh)).toThrow(error);
  });
  test("public exports", () => {
    expect(publicThi).toBe(thi);
    expect(library.models.thi).toBe(thi);
  });
  test("humidity boundaries and negative temperatures", () => {
    expect(thi(0, 0).thi).toBe(46.3);
    expect(thi(30, 100).thi).toBe(86);
    expect(thi(-50, 100).thi).toBe(-58);
  });
  // Retain the shared finite-number validation, as confirmed in #215.
  test.each([NaN, Infinity, -Infinity, null, undefined, true, "25"])(
    "reject unsupported numeric inputs (%s)",
    (value) => {
      expect(() => thi(value, 50)).toThrow(TypeError);
      expect(() => thi(25, value)).toThrow(TypeError);
    },
  );
  test.each([
    { value: [] },
    { value: [30] },
    { value: [30, 20] },
    { value: [[30], [20]] },
  ])("reject array input ($value)", ({ value }) => {
    expect(() => thi(value, 50)).toThrow(TypeError);
    expect(() => thi(25, value)).toThrow(TypeError);
    expect(() => thi(value, value)).toThrow(TypeError);
  });
  test("round halfway values to even", () => {
    expect(thi(25, 0).thi).toBe(66.6);
    expect(thi(25, 0, false).thi).toBeCloseTo(66.55, 10);
    expect(thi(20, 50).thi).toBe(65.2);
    expect(thi(20, 50, false).thi).toBe(65.25);
  });
  test("validate rounding flag", () => {
    expect(() => thi(25, 50, "false")).toThrow(TypeError);
  });
});
