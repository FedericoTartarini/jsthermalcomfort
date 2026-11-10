import { describe, expect, test } from "vitest";
import { enthalpy_air } from "../../src/psychrometrics/index.ts";
import { enthalpy_air as from_root } from "../../src/index.ts";
import { approx } from "../models/testUtils.ts";

// Mirrors the enthalpy_air case of pythermalcomfort v4.8.0
// tests/test_psychrometrics.py. Its is_equal is np.isclose with atol 0.1 and
// the default rtol, 1e-5.
describe("test_psychrometrics", () => {
  test("test_enthalpy", () => {
    expect(
      approx(enthalpy_air(25, 0.01), 50561.25, { rel: 1e-5, abs: 0.1 }),
    ).toBe(true);
    expect(
      approx(enthalpy_air(27.1, 0.01), 52707.56, { rel: 1e-5, abs: 0.1 }),
    ).toBe(true);
  });
});

// What upstream's tests leave out, measured on pythermalcomfort 4.7.0 in the
// parity image.
describe("enthalpy_air (JS-only)", () => {
  // A call with arguments the type rejects, to test the runtime.
  const call =
    (...args: unknown[]) =>
    () =>
      (enthalpy_air as (...a: unknown[]) => unknown)(...args);

  test.each([
    [25, 0.01, 50561.25],
    [27.1, 0.01, 52707.555],
    [0, 0, 0],
    [1, 1, 2503809.0],
    [-1, -1, -2500199.0],
    [-273, 1, 1734143.0],
  ])("enthalpy_air(%s, %s) is %s", (tdb, hr, expected) => {
    expect(enthalpy_air(tdb, hr)).toBe(expected);
  });

  // Deviation _shared-64, deviation _shared-65, deviation _shared-66, deviation _shared-67, deviation _shared-68.
  test("an argument that is not a number throws TypeError, naming it", () => {
    for (const bad of ["20", "a", true, null, [1, 2], {}]) {
      expect(call(bad, 0.01)).toThrow(new TypeError("tdb must be a number."));
      expect(call(25, bad)).toThrow(new TypeError("hr must be a number."));
    }
    expect(call()).toThrow(new TypeError("tdb must be a number."));
    expect(call(25)).toThrow(new TypeError("hr must be a number."));
  });

  // As numpy's: nan for a NaN, the infinity's sign otherwise.
  test("NaN and ±Infinity propagate", () => {
    expect(enthalpy_air(NaN, 0.01)).toBeNaN();
    expect(enthalpy_air(25, NaN)).toBeNaN();
    expect(enthalpy_air(Infinity, 0.01)).toBe(Infinity);
    expect(enthalpy_air(25, Infinity)).toBe(Infinity);
    expect(enthalpy_air(-Infinity, Infinity)).toBe(-Infinity);
  });

  test("is exported from the package root as from its subpath", () => {
    expect(from_root).toBe(enthalpy_air);
  });
});
