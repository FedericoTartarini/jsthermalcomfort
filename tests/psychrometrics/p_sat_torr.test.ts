import { describe, expect, test } from "vitest";
import { p_sat_torr } from "../../src/psychrometrics/index.ts";
import { p_sat_torr as from_root } from "../../src/index.ts";
import { approx } from "../models/testUtils.ts";
import { DEFAULT_TOLERANCE } from "../parity/harness.ts";

// Mirrors the p_sat_torr row of pythermalcomfort v4.8.1
// tests/test_utilities.py, with np.testing.assert_allclose's tolerance (rtol
// 1e-7, atol 1e-8), without upstream's DeprecationWarning from an old import
// path the library does not serve (deviation _shared-184).
describe("test_utilities", () => {
  describe("test_moved_public_utility_shims", () => {
    test("p_sat_torr", () => {
      expect(
        approx(p_sat_torr(25), 23.75744972, { rel: 1e-7, abs: 1e-8 }),
      ).toBe(true);
    });
  });
});

// What upstream's tests leave out, measured on pythermalcomfort 4.7.0 in the
// parity image.
describe("p_sat_torr (JS-only)", () => {
  // A call with arguments the type rejects, to test the runtime.
  const call =
    (...args: unknown[]) =>
    () =>
      (p_sat_torr as (...a: unknown[]) => unknown)(...args);

  test.each([
    [0, 4.567130491010804],
    [1, 4.91137228152998],
    [-1, 4.244379879377941],
    [25, 23.757449723073314],
  ])("p_sat_torr(%s) is %s", (tdb, expected) => {
    expect(approx(p_sat_torr(tdb), expected, DEFAULT_TOLERANCE)).toBe(true);
  });

  // Deviation _shared-40, deviation _shared-41, deviation _shared-42, deviation _shared-43, deviation _shared-44.
  test("an argument that is not a number throws TypeError, naming it", () => {
    for (const bad of ["20", "a", true, null, [1, 2], {}]) {
      expect(call(bad)).toThrow(new TypeError("tdb must be a number."));
    }
    expect(call()).toThrow(new TypeError("tdb must be a number."));
  });

  // As numpy's: nan, and exp(18.6686) for ±Infinity.
  test("NaN and ±Infinity propagate", () => {
    expect(p_sat_torr(NaN)).toBeNaN();
    for (const tdb of [Infinity, -Infinity]) {
      expect(
        approx(p_sat_torr(tdb), 128135646.62314813, DEFAULT_TOLERANCE),
      ).toBe(true);
    }
  });

  test("is exported from the package root as from its subpath", () => {
    expect(from_root).toBe(p_sat_torr);
  });
});
