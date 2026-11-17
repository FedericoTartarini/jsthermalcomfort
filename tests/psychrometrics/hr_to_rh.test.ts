import { expect, describe, it, test } from "vitest";
import { hr_to_rh, psy_ta_rh } from "../../src/psychrometrics/index.ts";
import { approx } from "../models/testUtils.ts";

// Mirrors the hr_to_rh row of pythermalcomfort v4.8.1 tests/test_utilities.py,
// with np.testing.assert_allclose's tolerance (rtol 1e-7, atol 1e-8), without
// upstream's DeprecationWarning from an old import path the library does not
// serve (deviation _shared-186).
describe("test_utilities", () => {
  describe("test_moved_public_utility_shims", () => {
    test("hr_to_rh", () => {
      expect(
        approx(hr_to_rh(0.01, 25), 50.58961491, { rel: 1e-7, abs: 1e-8 }),
      ).toBe(true);
    });
  });
});

const TDB = [0, 5, 10, 15, 20, 25, 30, 35, 40];
const RH = [5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const P_ATM = [101325, 80000];
const grid = TDB.flatMap((tdb) =>
  RH.flatMap((rh) => P_ATM.map((p_atm) => ({ tdb, rh, p_atm }))),
);

// What upstream's tests leave out, measured on pythermalcomfort 4.8.1 in the
// parity image.
describe("hr_to_rh (JS-only)", () => {
  // The same p_sat(tdb) sits on both sides of the round trip and cancels,
  // so the inverse is exact to floating point.
  it.each(grid)(
    "round-trips psy_ta_rh's hr when tdb is $tdb, rh is $rh, p_atm is $p_atm",
    ({ tdb, rh, p_atm }) => {
      const { hr } = psy_ta_rh(tdb, rh, p_atm);
      expect(Math.abs(hr_to_rh(hr, tdb, p_atm) - rh)).toBeLessThanOrEqual(1e-6);
    },
  );

  // Reference values from pythermalcomfort.utilities.hr_to_rh, which they
  // equal within 1.5e-14 % rh.
  it.each([
    { hr: 0.01, tdb: 25, p_atm: 101325, expected: 50.58961491444707 },
    { hr: 0.005, tdb: 20, p_atm: 101325, expected: 34.54929239449113 },
    { hr: 0.02, tdb: 30, p_atm: 101325, expected: 74.34333277642592 },
    { hr: 0.01, tdb: 25, p_atm: 90000, expected: 44.9352612119441 },
    { hr: 0.0038, tdb: 10, p_atm: 101325, expected: 50.10508857249907 },
  ])(
    "returns $expected when hr is $hr, tdb is $tdb, p_atm is $p_atm",
    ({ hr, tdb, p_atm, expected }) => {
      expect(Math.abs(hr_to_rh(hr, tdb, p_atm) - expected)).toBeLessThanOrEqual(
        1e-12,
      );
    },
  );

  it("defaults p_atm to 101325 Pa", () => {
    expect(hr_to_rh(0.01, 25)).toBe(hr_to_rh(0.01, 25, 101325));
  });

  it("returns 0 for dry air", () => {
    expect(hr_to_rh(0, 25)).toBe(0);
  });

  // A call with arguments the type rejects, to test the runtime.
  const call =
    (...args: unknown[]) =>
    () =>
      (hr_to_rh as (...a: unknown[]) => unknown)(...args);

  // Deviation _shared-120, deviation _shared-121, deviation _shared-122, deviation _shared-123, deviation _shared-124.
  it("throws TypeError for an argument that is not a number, naming it", () => {
    for (const bad of [null, true, "20", [0.01]]) {
      expect(call(bad, 25)).toThrow(new TypeError("hr must be a number."));
      expect(call(0.01, bad)).toThrow(new TypeError("tdb must be a number."));
      expect(call(0.01, 25, bad)).toThrow(
        new TypeError("p_atm must be a number."),
      );
    }
    expect(call()).toThrow(new TypeError("hr must be a number."));
    expect(call(0.01)).toThrow(new TypeError("tdb must be a number."));
  });

  it("checks hr before tdb", () => {
    expect(call(null, undefined)).toThrow(
      new TypeError("hr must be a number."),
    );
  });

  it("throws TypeError when passed straight to map", () => {
    const as_callback = hr_to_rh as (...a: unknown[]) => number;
    expect(() => [0.01, 0.012].map(as_callback)).toThrow(TypeError);
  });

  it("takes the default p_atm for an explicit undefined", () => {
    expect(hr_to_rh(0.01, 25, undefined)).toBe(hr_to_rh(0.01, 25));
  });

  it("lets NaN propagate", () => {
    expect(hr_to_rh(NaN, 25)).toBeNaN();
    expect(hr_to_rh(0.01, NaN)).toBeNaN();
    expect(hr_to_rh(0.01, 25, NaN)).toBeNaN();
  });
});
