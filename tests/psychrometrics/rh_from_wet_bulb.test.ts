import { expect, describe, it } from "@jest/globals";
import { psy_ta_rh } from "../../src/psychrometrics/psy_ta_rh.js";
import { rh_from_wet_bulb } from "../../src/psychrometrics/rh_from_wet_bulb.ts";

const TDB = [0, 5, 10, 15, 20, 25, 30, 35, 40];
const RH = [5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const grid = (tdbs: number[]) =>
  tdbs.flatMap((tdb) => RH.map((rh) => ({ tdb, rh })));

describe("rh_from_wet_bulb", () => {
  // psy_ta_rh rounds t_wb to 0.1 °C, so the best the inverse can do is land
  // in the band of rh that rounds to the same wet bulb. Stull's fit is only
  // worth inverting from about 10 °C up: below that its slope in rh collapses
  // and at 0 °C it dips a full degree over the first 10 % rh. On this grid the
  // shallowest slope is 0.085 °C per % rh, at 10 °C, so half a rounding band
  // is at most 0.6 % rh.
  it.each(grid(TDB.filter((tdb) => tdb >= 10)))(
    "round-trips psy_ta_rh's t_wb when tdb is $tdb, rh is $rh",
    ({ tdb, rh }) => {
      const forward = psy_ta_rh(tdb, rh).t_wb;
      const back = rh_from_wet_bulb(forward, tdb);
      expect(Math.abs(back - rh)).toBeLessThanOrEqual(0.6);
      // Inside the band means the forward function cannot tell them apart.
      expect(Math.abs(psy_ta_rh(tdb, back).t_wb - forward)).toBe(0);
    },
  );

  it.each([
    { t_wb: 15.4, tdb: 21, expected: 56.18173931670903 },
    // Stull's saturation wet bulb at tdb 25 is 25.05 °C, so 25 °C is a real
    // solution and not a clamp.
    { t_wb: 25, tdb: 25, expected: 99.66164285321642 },
  ])(
    "returns $expected when t_wb is $t_wb, tdb is $tdb",
    ({ t_wb, tdb, expected }) => {
      expect(rh_from_wet_bulb(t_wb, tdb)).toBeCloseTo(expected, 6);
    },
  );

  it("clamps at the fit's own extremes", () => {
    expect(rh_from_wet_bulb(30, 25)).toBe(100);
    expect(rh_from_wet_bulb(-5, 25)).toBe(0);
  });

  it("inverts only the rising branch of the fit", () => {
    // At 0 °C the fit falls to −4.64 °C around rh 9 before rising. Below the
    // floor is the clamp; above it the rising branch is the one inverted.
    expect(rh_from_wet_bulb(-4.7, 0)).toBe(0);
    expect(rh_from_wet_bulb(-3.9, 0)).toBeCloseTo(41.12, 1);
  });
});
