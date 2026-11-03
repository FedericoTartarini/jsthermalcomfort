import { describe, expect, test } from "vitest";
import { p_sat } from "../../src/psychrometrics/index.ts";
import { p_sat as from_root } from "../../src/index.ts";
import { approx } from "../models/testUtils.ts";

// Mirrors the p_sat case of pythermalcomfort v4.8.0 tests/test_psychrometrics.py.
describe("test_psychrometrics", () => {
  test("test_p_sat", () => {
    expect(approx(p_sat(25), 3169.2, { abs: 1e-1 })).toBe(true);
    expect(approx(p_sat(50), 12349.9, { abs: 1e-1 })).toBe(true);
  });
});

// What upstream's tests leave out, measured on pythermalcomfort 4.7.0 in the
// parity image.
describe("p_sat (JS-only)", () => {
  // A call with arguments the type rejects, to test the runtime.
  const call =
    (...args: unknown[]) =>
    () =>
      (p_sat as (...a: unknown[]) => unknown)(...args);

  test.each([
    [0, 611.212867451187],
    [1, 657.0717179813817],
    [-1, 562.6715296089346],
    [-100, 0.001405102123874154],
    [-273, 0],
    [-273.15, 0],
  ])("p_sat(%s) is %s", (tdb, expected) => {
    expect(approx(p_sat(tdb), expected, { rel: 1e-14, abs: 0 })).toBe(true);
  });

  // Deviation _shared-46, deviation _shared-47, deviation _shared-48, deviation _shared-49, deviation _shared-50.
  test("an argument that is not a number throws TypeError, naming it", () => {
    for (const bad of ["20", "a", true, null, [1, 2], {}]) {
      expect(call(bad)).toThrow(new TypeError("tdb must be a number."));
    }
    expect(call()).toThrow(new TypeError("tdb must be a number."));
  });

  // As numpy's: nan for each.
  test("NaN and ±Infinity propagate", () => {
    expect(p_sat(NaN)).toBeNaN();
    expect(p_sat(Infinity)).toBeNaN();
    expect(p_sat(-Infinity)).toBeNaN();
  });

  test("is exported from the package root as from its subpath", () => {
    expect(from_root).toBe(p_sat);
  });
});
