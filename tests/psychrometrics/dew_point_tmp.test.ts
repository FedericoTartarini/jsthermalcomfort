import { describe, expect, test } from "vitest";
import { dew_point_tmp } from "../../src/psychrometrics/index.ts";
import { dew_point_tmp as from_root } from "../../src/index.ts";
import { approx } from "../models/testUtils.ts";

// Mirrors the dew_point_tmp cases of pythermalcomfort v4.8.0
// tests/test_psychrometrics.py. Upstream's arrays are called element-wise.
describe("test_psychrometrics", () => {
  test("test_t_dp", () => {
    // Scalar inputs
    expect(approx(dew_point_tmp(31.6, 59.6), 22.778, { abs: 1e-1 })).toBe(true);
    expect(approx(dew_point_tmp(29.3, 75.4), 24.497, { abs: 1e-1 })).toBe(true);
    expect(approx(dew_point_tmp(27.1, 66.4), 20.302, { abs: 1e-1 })).toBe(true);

    // Edge cases
    // rh = 100%: dew point should equal tdb
    expect(approx(dew_point_tmp(25.0, 100.0), 25.0, { abs: 1e-1 })).toBe(true);
    // rh = 0%: dew point should be very low (approaching -inf, but np.nan due to log(0))
    const result_rh0 = dew_point_tmp(25.0, 0.0);
    expect(result_rh0).toBeNaN(); // Should be NaN due to log(0)

    // Array inputs
    const tdb_array = [31.6, 29.3, 27.1];
    const rh_array = [59.6, 75.4, 66.4];
    const expected = [22.778, 24.497, 20.302];
    tdb_array.forEach((tdb, i) => {
      const result = dew_point_tmp(tdb, rh_array[i] ?? NaN);
      expect(approx(result, expected[i] ?? NaN, { rel: 1e-7, abs: 1e-1 })).toBe(
        true,
      );
    });

    // Broadcasting: tdb as array, rh as scalar
    const tdb_array2 = [31.6, 29.3];
    const rh_scalar = 59.6;
    const expected_broadcast = [22.778, 20.625]; // Same rh for both
    tdb_array2.forEach((tdb, i) => {
      const result = dew_point_tmp(tdb, rh_scalar);
      expect(
        approx(result, expected_broadcast[i] ?? NaN, { rel: 1e-7, abs: 1e-1 }),
      ).toBe(true);
    });

    // Numpy array inputs
    const tdb_np = [31.6, 29.3];
    const rh_np = [59.6, 75.4];
    const expected_np = [22.778, 24.497];
    tdb_np.forEach((tdb, i) => {
      const result = dew_point_tmp(tdb, rh_np[i] ?? NaN);
      expect(
        approx(result, expected_np[i] ?? NaN, { rel: 1e-7, abs: 1e-1 }),
      ).toBe(true);
    });

    // More temperature ranges
    expect(approx(dew_point_tmp(10.0, 50.0), 0.064, { abs: 1e-1 })).toBe(true); // Low temp
    expect(approx(dew_point_tmp(40.0, 50.0), 27.587, { abs: 1e-1 })).toBe(true);
  });

  test("test_t_dp_invalid_rh", () => {
    expect(() => dew_point_tmp(25, 110)).toThrow(RangeError);
    expect(() => dew_point_tmp(25, -10)).toThrow(RangeError);
  });
});

// What upstream's tests leave out, measured on pythermalcomfort 4.7.0 in the
// parity image.
describe("dew_point_tmp (JS-only)", () => {
  // A call with arguments the type rejects, to test the runtime.
  const call =
    (...args: unknown[]) =>
    () =>
      (dew_point_tmp as (...a: unknown[]) => unknown)(...args);

  test.each([
    [31.6, 59.6, 22.77535873145921],
    [29.3, 75.4, 24.49459666217674],
    [27.1, 66.4, 20.296089313047194],
    [25, 100, 24.999999999999996],
    [100, 100, 99.99999999999999],
    [-100, 1, -119.08391489374613],
  ])("dew_point_tmp(%s, %s) is %s", (tdb, rh, expected) => {
    expect(
      approx(dew_point_tmp(tdb, rh), expected, { rel: 1e-14, abs: 0 }),
    ).toBe(true);
  });

  // Deviation _shared-57.
  test("an rh outside [0, 100] throws upstream's message as a RangeError", () => {
    for (const rh of [-0.1, 100.1, Infinity, -Infinity]) {
      expect(call(25, rh)).toThrow(
        new RangeError("Relative humidity must be between 0 and 100%."),
      );
    }
    expect(Number.isFinite(dew_point_tmp(25, 0.1))).toBe(true);
  });

  // Deviation _shared-52, deviation _shared-53, deviation _shared-54, deviation _shared-55, deviation _shared-56.
  test("an argument that is not a number throws TypeError, naming it", () => {
    for (const bad of ["20", "a", true, null, [1, 2], {}]) {
      expect(call(bad, 50)).toThrow(new TypeError("tdb must be a number."));
      expect(call(25, bad)).toThrow(new TypeError("rh must be a number."));
    }
    expect(call()).toThrow(new TypeError("tdb must be a number."));
    expect(call(25)).toThrow(new TypeError("rh must be a number."));
  });

  // As numpy's: nan for each.
  test("NaN and ±Infinity propagate", () => {
    expect(dew_point_tmp(NaN, 50)).toBeNaN();
    expect(dew_point_tmp(25, NaN)).toBeNaN();
    expect(dew_point_tmp(Infinity, 50)).toBeNaN();
    expect(dew_point_tmp(-Infinity, 50)).toBeNaN();
  });

  test("is exported from the package root as from its subpath", () => {
    expect(from_root).toBe(dew_point_tmp);
  });
});
