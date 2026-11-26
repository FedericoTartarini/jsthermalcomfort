import { describe, expect, test } from "vitest";
import { f_svv } from "../../src/environment/index.ts";
import { f_svv as from_root } from "../../src/index.ts";
import { pythonRound } from "../../src/_internal/round.ts";
import { approx } from "../models/testUtils.ts";
import { DEFAULT_TOLERANCE } from "../parity/harness.ts";

// Mirrors pythermalcomfort v4.8.1 tests/test_environment.py, test_f_svv, which
// rounds with Python's round and compares with np.isclose (rtol 1e-5, atol
// 1e-9).
describe("test_environment", () => {
  test("test_f_svv", () => {
    for (const [w, h, d, expected] of [
      [30, 10, 3.3, 0.27],
      [150, 10, 3.3, 0.31],
      [30, 6, 3.3, 0.2],
      [150, 6, 3.3, 0.23],
      [30, 10, 6, 0.17],
      [150, 10, 6, 0.21],
      [30, 6, 6, 0.11],
      [150, 6, 6, 0.14],
      [6, 9, 3.3, 0.14],
      [6, 6, 3.3, 0.11],
      [6, 6, 6, 0.04],
      [4, 4, 3.3, 0.06],
      [4, 4, 6, 0.02],
    ] as const) {
      expect(
        approx(pythonRound(f_svv(w, h, d), 2), expected, {
          rel: 1e-5,
          abs: 1e-9,
        }),
      ).toBe(true);
    }
  });
});

// Mirrors the f_svv row of pythermalcomfort v4.8.1 tests/test_utilities.py,
// with np.testing.assert_allclose's tolerance (rtol 1e-7, atol 1e-8), without
// upstream's DeprecationWarning from an old import path the library does not
// serve (deviation _shared-137).
describe("test_utilities", () => {
  describe("test_moved_public_utility_shims", () => {
    test("f_svv", () => {
      expect(
        approx(f_svv(30, 10, 3.3), 0.2709762313, { rel: 1e-7, abs: 1e-8 }),
      ).toBe(true);
    });
  });
});

// What upstream's tests leave out, measured on pythermalcomfort 4.8.1 in the
// parity image.
describe("f_svv (JS-only)", () => {
  // A call with arguments the type rejects, to test the runtime.
  const call =
    (...args: unknown[]) =>
    () =>
      (f_svv as (...a: unknown[]) => unknown)(...args);

  // Upstream divides h by 2 * d first (environment/f_svv.py:24), so Python
  // picks the message from h and d, an integral number read as an int
  // (deviation _shared-146, deviation _shared-151).
  test("throws Python's message, a RangeError, for a d of 0", () => {
    expect(call(30, 10, 0)).toThrow(new RangeError("division by zero"));
    expect(call(0, 0, 0)).toThrow(new RangeError("division by zero"));
    expect(call(30, 10.5, 0)).toThrow(new RangeError("float division by zero"));
    expect(call(30, 10, -0)).toThrow(new RangeError("float division by zero"));
  });

  test("NaN and ±Infinity propagate", () => {
    expect(f_svv(NaN, 10, 3.3)).toBeNaN();
    expect(
      approx(f_svv(Infinity, 10, 3.3), 0.31430660454109005, DEFAULT_TOLERANCE),
    ).toBe(true);
    expect(f_svv(30, 10, Infinity)).toBe(0);
  });

  // Deviation _shared-93, deviation _shared-94.
  test("throws TypeError for an argument that is not a number, naming it", () => {
    for (const bad of [null, true, "30", [30]]) {
      expect(call(bad, 10, 3.3)).toThrow(new TypeError("w must be a number."));
      expect(call(30, bad, 3.3)).toThrow(new TypeError("h must be a number."));
      expect(call(30, 10, bad)).toThrow(new TypeError("d must be a number."));
    }
    expect(call()).toThrow(new TypeError("w must be a number."));
    expect(call(30)).toThrow(new TypeError("h must be a number."));
    expect(call(30, 10)).toThrow(new TypeError("d must be a number."));
  });

  test("is exported from the package root as from its subpath", () => {
    expect(from_root).toBe(f_svv);
  });
});
