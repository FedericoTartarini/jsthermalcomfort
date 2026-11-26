import { describe, expect, test } from "vitest";
import { v_relative } from "../../src/environment/index.ts";
import { v_relative as from_root } from "../../src/index.ts";
import { approx } from "../models/testUtils.ts";

// Mirrors pythermalcomfort v4.8.1 tests/test_environment.py, test_v_relative,
// its array case one call per element, with np.allclose's tolerance (rtol
// 1e-5, atol 1e-8 or the test's 1e-6).
describe("test_environment", () => {
  test("test_v_relative", () => {
    expect(approx(v_relative(2.0, 1.0), 2.0, { rel: 1e-5, abs: 1e-8 })).toBe(
      true,
    );
    for (const [v, expected] of [
      [1.0, 1.3],
      [2.0, 2.3],
      [3.0, 3.3],
    ] as const) {
      expect(
        approx(v_relative(v, 2.0), expected, { rel: 1e-5, abs: 1e-6 }),
      ).toBe(true);
    }
    expect(
      approx(v_relative(-1.5, 1.5), -1.5 + 0.3 * 0.5, { rel: 1e-5, abs: 1e-6 }),
    ).toBe(true);
  });
});

// Mirrors the v_relative row of pythermalcomfort v4.8.1 tests/test_utilities.py,
// one call per element, with np.testing.assert_allclose's tolerance (rtol
// 1e-7, atol 1e-8), without upstream's DeprecationWarning from an old import
// path the library does not serve (deviation _shared-138).
describe("test_utilities", () => {
  describe("test_moved_public_utility_shims", () => {
    test("v_relative", () => {
      for (const [v, expected] of [
        [1, 1.3],
        [2, 2.3],
      ] as const) {
        expect(
          approx(v_relative(v, 2), expected, { rel: 1e-7, abs: 1e-8 }),
        ).toBe(true);
      }
    });
  });
});

// What upstream's tests leave out, measured on pythermalcomfort 4.8.1 in the
// parity image unless a test says otherwise.
describe("v_relative (JS-only)", () => {
  // A call with arguments the type rejects, to test the runtime.
  const call =
    (...args: unknown[]) =>
    () =>
      (v_relative as (...a: unknown[]) => unknown)(...args);

  // Upstream rounds with `np.around(..., 3)`, and these are pythermalcomfort 4.6.0's values.
  test.each([
    { v: 0, met: 1.005, expected: 0.001 },
    { v: 0.1, met: 1.015, expected: 0.104 },
  ])(
    "rounds as numpy does: $expected when v is $v and met is $met",
    ({ v, met, expected }) => {
      expect(v_relative(v, met)).toBe(expected);
    },
  );

  // Upstream's np.where(met > 1, …, v) returns v wherever met > 1 is false.
  test("returns v for a met of 1 or less, -Infinity or NaN", () => {
    expect(v_relative(0.1, 1)).toBe(0.1);
    expect(v_relative(0.1, -Infinity)).toBe(0.1);
    expect(v_relative(0.1, NaN)).toBe(0.1);
  });

  test("NaN and ±Infinity propagate through v and an infinite met", () => {
    expect(v_relative(NaN, 1.2)).toBeNaN();
    expect(v_relative(0.1, Infinity)).toBe(Infinity);
    expect(v_relative(-Infinity, 1.2)).toBe(-Infinity);
  });

  // Deviation _shared-88, deviation _shared-89, deviation _shared-90, deviation _shared-91, deviation _shared-92.
  test("throws TypeError for an argument that is not a number, naming it", () => {
    for (const bad of [null, true, "0.1", [0.1]]) {
      expect(call(bad, 1.2)).toThrow(new TypeError("v must be a number."));
      expect(call(0.1, bad)).toThrow(new TypeError("met must be a number."));
    }
    expect(call()).toThrow(new TypeError("v must be a number."));
    expect(call(0.1)).toThrow(new TypeError("met must be a number."));
  });

  test("is exported from the package root as from its subpath", () => {
    expect(from_root).toBe(v_relative);
  });
});
