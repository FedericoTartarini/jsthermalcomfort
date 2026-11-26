import { describe, expect, test } from "vitest";
import { antoine } from "../../src/psychrometrics/index.ts";
import { antoine as from_root } from "../../src/index.ts";
import psychrometrics from "../../src/psychrometrics/index.ts";
import { approx } from "../models/testUtils.ts";
import { DEFAULT_TOLERANCE } from "../parity/harness.ts";

// Mirrors the antoine row of pythermalcomfort v4.8.1 tests/test_utilities.py,
// with np.testing.assert_allclose's tolerance (rtol 1e-7, atol 1e-8), without
// upstream's DeprecationWarning from an old import path the library does not
// serve (deviation _shared-162).
describe("test_utilities", () => {
  describe("test_moved_public_utility_shims", () => {
    test("antoine", () => {
      expect(approx(antoine(25), 3.16735278, { rel: 1e-7, abs: 1e-8 })).toBe(
        true,
      );
    });
  });
});

// What upstream's tests leave out, measured on pythermalcomfort 4.8.1 in the
// parity image.
describe("antoine (JS-only)", () => {
  // A call with arguments the type rejects, to test the runtime.
  const call =
    (...args: unknown[]) =>
    () =>
      (antoine as (...a: unknown[]) => unknown)(...args);

  test.each([
    [0, 0.6088916792864865],
    [1, 0.6547861336539197],
    [-1, 0.5658624375569863],
    [25, 3.1673527800263943],
  ])("antoine(%s) is %s", (tdb, expected) => {
    expect(approx(antoine(tdb), expected, DEFAULT_TOLERANCE)).toBe(true);
  });

  // Deviation _shared-157, deviation _shared-158, deviation _shared-159, deviation _shared-160, deviation _shared-161.
  test("an argument that is not a number throws TypeError, naming it", () => {
    for (const bad of ["20", "a", true, null, [1, 2], {}]) {
      expect(call(bad)).toThrow(new TypeError("tdb must be a number."));
    }
    expect(call()).toThrow(new TypeError("tdb must be a number."));
  });

  // As numpy's: nan, e ** 16.6536 for ±Infinity, and 0 at -235 °C, where the
  // divisor is 0.
  test("NaN, ±Infinity and a zero divisor", () => {
    expect(antoine(NaN)).toBeNaN();
    for (const tdb of [Infinity, -Infinity]) {
      expect(approx(antoine(tdb), 17083096.093354832, DEFAULT_TOLERANCE)).toBe(
        true,
      );
    }
    expect(antoine(-235)).toBe(0);
  });

  test("is exported from the package root and the default export as from its subpath", () => {
    expect(from_root).toBe(antoine);
    expect(psychrometrics.antoine).toBe(antoine);
  });
});
