import { describe, expect, test } from "vitest";
import { wet_bulb_tmp } from "../../src/psychrometrics/index.ts";
import { wet_bulb_tmp as from_root } from "../../src/index.ts";
import { approx } from "../models/testUtils.ts";

// Mirrors the wet_bulb_tmp case of pythermalcomfort v4.8.0
// tests/test_psychrometrics.py.
describe("test_psychrometrics", () => {
  test("test_t_wb", () => {
    expect(approx(wet_bulb_tmp(27.1, 66.4), 22.4, { abs: 1e-1 })).toBe(true);
    expect(approx(wet_bulb_tmp(25, 50), 18.0, { abs: 1e-1 })).toBe(true);
  });
});

// What upstream's tests leave out, measured on pythermalcomfort 4.7.0 in the
// parity image.
describe("wet_bulb_tmp (JS-only)", () => {
  // A call with arguments the type rejects, to test the runtime.
  const call =
    (...args: unknown[]) =>
    () =>
      (wet_bulb_tmp as (...a: unknown[]) => unknown)(...args);

  test.each([
    [27.1, 66.4, 22.359915787638204],
    [25, 50, 17.99814746834343],
    [21, 56, 15.375615632102036],
    [0, 1, -3.305882847908723],
    [-20, 5, -17.590084452993086],
    [40, 10, 18.507283692077245],
    [25, 150, 31.823829132932165],
  ])("wet_bulb_tmp(%s, %s) is %s", (tdb, rh, expected) => {
    expect(
      approx(wet_bulb_tmp(tdb, rh), expected, { rel: 1e-12, abs: 0 }),
    ).toBe(true);
  });

  // Deviation _shared-59, deviation _shared-60, deviation _shared-61, deviation _shared-62, deviation _shared-63.
  test("an argument that is not a number throws TypeError, naming it", () => {
    for (const bad of ["20", "a", true, null, [1, 2], {}]) {
      expect(call(bad, 50)).toThrow(new TypeError("tdb must be a number."));
      expect(call(25, bad)).toThrow(new TypeError("rh must be a number."));
    }
    expect(call()).toThrow(new TypeError("tdb must be a number."));
    expect(call(25)).toThrow(new TypeError("rh must be a number."));
  });

  // As numpy's: nan for a NaN, the infinity's sign for an infinite tdb or rh,
  // and nan for a negative rh, whose rh**1.5 is nan.
  test("NaN and ±Infinity propagate", () => {
    expect(wet_bulb_tmp(NaN, 50)).toBeNaN();
    expect(wet_bulb_tmp(25, NaN)).toBeNaN();
    expect(wet_bulb_tmp(Infinity, 50)).toBe(Infinity);
    expect(wet_bulb_tmp(-Infinity, 50)).toBe(-Infinity);
    expect(wet_bulb_tmp(25, Infinity)).toBe(Infinity);
    expect(wet_bulb_tmp(25, -1)).toBeNaN();
  });

  test("is exported from the package root as from its subpath", () => {
    expect(from_root).toBe(wet_bulb_tmp);
  });
});
