import { describe, expect, test } from "vitest";
import { psy_ta_rh } from "../../src/psychrometrics/index.ts";
import { psy_ta_rh as from_root } from "../../src/index.ts";
import { approx } from "../models/testUtils.ts";

// Mirrors the psy_ta_rh case of pythermalcomfort v4.8.0
// tests/test_psychrometrics.py.
describe("test_psychrometrics", () => {
  test("test_psy_ta_rh", () => {
    const results = psy_ta_rh(25, 50, 101325);
    expect(approx(results.p_sat, 3169.2, { abs: 1e-1 })).toBe(true);
    expect(approx(results.p_vap, 1584.6, { abs: 1e-1 })).toBe(true);
    expect(approx(results.hr, 0.00988, { abs: 1e-3 })).toBe(true);
    expect(approx(results.wet_bulb_tmp, 18.0, { abs: 1e-1 })).toBe(true);
    expect(approx(results.dew_point_tmp, 13.8, { abs: 1e-1 })).toBe(true);
    expect(approx(results.h, 50259.79, { abs: 1e-1 })).toBe(true);
  });
});

// What upstream's tests leave out, measured on pythermalcomfort 4.7.0 in the
// parity image.
describe("psy_ta_rh (JS-only)", () => {
  // A call with arguments the type rejects, to test the runtime.
  const call =
    (...args: unknown[]) =>
    () =>
      (psy_ta_rh as (...a: unknown[]) => unknown)(...args);

  test.each([
    [
      25,
      50,
      101325,
      {
        p_sat: 3169.2164701436163,
        p_vap: 1584.6082350718082,
        hr: 0.009881599747200199,
        wet_bulb_tmp: 17.99814746834343,
        dew_point_tmp: 13.851583599891661,
        h: 50259.7881563401,
      },
    ],
    [
      0,
      1,
      101325,
      {
        p_sat: 611.212867451187,
        p_vap: 6.11212867451187,
        hr: 3.752135335122248e-5,
        wet_bulb_tmp: -3.305882847908723,
        dew_point_tmp: -50.37572114175687,
        h: 93.84090473140742,
      },
    ],
    [
      1,
      1,
      101325,
      {
        p_sat: 657.0717179813817,
        p_vap: 6.570717179813816,
        hr: 4.033673538397002e-5,
        wet_bulb_tmp: -2.549855326011829,
        dew_point_tmp: -49.747732719681224,
        h: 1104.9549830026772,
      },
    ],
    [
      21,
      56,
      101325,
      {
        p_sat: 2487.667112750733,
        p_vap: 1393.0935831404106,
        hr: 0.008670667636692745,
        wet_bulb_tmp: 15.375615632102036,
        dew_point_tmp: 11.883808722406506,
        h: 43098.0014161374,
      },
    ],
    [
      21,
      56,
      1000,
      {
        p_sat: 2487.667112750733,
        p_vap: 1393.0935831404106,
        hr: -2.204249532438113,
        wet_bulb_tmp: 15.375615632102036,
        dew_point_tmp: 11.883808722406506,
        h: -5575296.159154788,
      },
    ],
    [
      25,
      50,
      82500,
      {
        p_sat: 3169.2164701436163,
        p_vap: 1584.6082350718082,
        hr: 0.012180558093486948,
        wet_bulb_tmp: 17.99814746834343,
        dew_point_tmp: 13.851583599891661,
        h: 56113.22347577946,
      },
    ],
    [
      -273,
      1,
      101325,
      {
        p_sat: 0,
        p_vap: 0,
        hr: 0,
        wet_bulb_tmp: -124.21601301164563,
        dew_point_tmp: -273.99165262341927,
        h: -274092.0,
      },
    ],
  ] as const)("psy_ta_rh(%s, %s, %s) is %j", (tdb, rh, p_atm, expected) => {
    const result = psy_ta_rh(tdb, rh, p_atm);
    for (const key of Object.keys(expected) as (keyof typeof expected)[]) {
      expect(approx(result[key], expected[key], { rel: 1e-12, abs: 0 })).toBe(
        true,
      );
    }
  });

  test("p_atm defaults to 101325 Pa", () => {
    expect(psy_ta_rh(25, 50)).toEqual(psy_ta_rh(25, 50, 101325));
  });

  // As upstream's PsychrometricValues, @dataclass(frozen=True)
  // (classes_return.py:464), with its fields in the dataclass's order.
  test("returns a frozen object with upstream's fields", () => {
    const result = psy_ta_rh(25, 50);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.keys(result)).toEqual([
      "p_sat",
      "p_vap",
      "hr",
      "wet_bulb_tmp",
      "dew_point_tmp",
      "h",
    ]);
  });

  // Deviation _shared-57, through dew_point_tmp, as upstream raises.
  test("an rh outside [0, 100] throws dew_point_tmp's RangeError", () => {
    for (const rh of [-1, 110]) {
      expect(call(25, rh)).toThrow(
        new RangeError("Relative humidity must be between 0 and 100%."),
      );
    }
  });

  // Deviation _shared-69, deviation _shared-70, deviation _shared-71, deviation _shared-72, deviation _shared-73.
  test("an argument that is not a number throws TypeError, naming it", () => {
    for (const bad of ["20", "a", true, null, [1, 2], {}]) {
      expect(call(bad, 50)).toThrow(new TypeError("tdb must be a number."));
      expect(call(25, bad)).toThrow(new TypeError("rh must be a number."));
      expect(call(25, 50, bad)).toThrow(
        new TypeError("p_atm must be a number."),
      );
    }
    expect(call()).toThrow(new TypeError("tdb must be a number."));
    expect(call(25)).toThrow(new TypeError("rh must be a number."));
  });

  // As numpy's: an infinite p_atm gives hr 0, and a NaN one nan.
  test("NaN and ±Infinity propagate", () => {
    const nan = psy_ta_rh(25, 50, NaN);
    expect(nan.hr).toBeNaN();
    expect(nan.h).toBeNaN();
    const inf = psy_ta_rh(25, 50, Infinity);
    expect(inf.hr).toBe(0);
    expect(inf.h).toBe(25100);
    const result = psy_ta_rh(NaN, 50);
    expect(Object.values(result).every(Number.isNaN)).toBe(true);
  });

  test("is exported from the package root as from its subpath", () => {
    expect(from_root).toBe(psy_ta_rh);
  });
});
