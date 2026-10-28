import { describe, expect, test } from "vitest";
import { p_sat_torr } from "../../src/psychrometrics/index.ts";
import { p_sat_torr as from_root } from "../../src/index.ts";

// pythermalcomfort v4.7.0's tests have no case for p_sat_torr; these are
// measured on it in the parity image.
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
    expect(p_sat_torr(tdb)).toBe(expected);
  });

  // numpy converts "20" to 20.0, True to 1.0 and None to nan, broadcasts a
  // list, and raises ValueError for "a" (deviation _shared-40, deviation
  // _shared-41, deviation _shared-42, deviation _shared-43, deviation
  // _shared-44).
  test("an argument that is not a number throws TypeError, naming it", () => {
    for (const bad of ["20", "a", true, null, [1, 2], {}]) {
      expect(call(bad)).toThrow(new TypeError("tdb must be a number."));
    }
    expect(call()).toThrow(new TypeError("tdb must be a number."));
  });

  // As numpy's: nan for NaN, and exp(18.6686) for ±Infinity, where
  // 4030.183 / ±inf is 0.
  test("NaN and ±Infinity propagate", () => {
    expect(p_sat_torr(NaN)).toBeNaN();
    expect(p_sat_torr(Infinity)).toBe(128135646.62314813);
    expect(p_sat_torr(-Infinity)).toBe(128135646.62314813);
  });

  test("is exported from the package root as from its subpath", () => {
    expect(from_root).toBe(p_sat_torr);
  });
});
