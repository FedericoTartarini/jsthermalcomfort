import { expect, describe, it } from "@jest/globals";
import { psy_ta_rh } from "../../src/psychrometrics/psy_ta_rh.js";
import { hr_to_rh } from "../../src/psychrometrics/hr_to_rh.ts";

const TDB = [0, 5, 10, 15, 20, 25, 30, 35, 40];
const RH = [5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const P_ATM = [101325, 80000];
const grid = TDB.flatMap((tdb) =>
  RH.flatMap((rh) => P_ATM.map((p_atm) => ({ tdb, rh, p_atm }))),
);

describe("hr_to_rh", () => {
  // The same p_sat(tdb) sits on both sides of the round trip and cancels, so
  // the inverse is exact to floating point.
  it.each(grid)(
    "round-trips psy_ta_rh's hr when tdb is $tdb, rh is $rh, p_atm is $p_atm",
    ({ tdb, rh, p_atm }) => {
      const { hr } = psy_ta_rh(tdb, rh, p_atm);
      expect(Math.abs(hr_to_rh(hr, tdb, p_atm) - rh)).toBeLessThanOrEqual(1e-6);
    },
  );

  // Reference values from pythermalcomfort v4.6.2's hr_to_rh. Two of them
  // differ in the last digit: this port computes 100 · p_vap / p_sat, upstream
  // p_vap / p_sat · 100.
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
});
