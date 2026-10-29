import { expect, describe, it } from "vitest";
import { psy_ta_rh } from "../../src/psychrometrics/psy_ta_rh.ts";
import { rh_from_wet_bulb } from "../../src/psychrometrics/rh_from_wet_bulb.ts";

const TDB = [0, 5, 10, 15, 20, 25, 30, 35, 40];
const RH = [5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const grid = (tdbs: number[]) =>
  tdbs.flatMap((tdb) => RH.map((rh) => ({ tdb, rh })));

describe("rh_from_wet_bulb", () => {
  // wet_bulb_tmp does not round, so the inverse is exact to floating point.
  // Stull's fit is only worth inverting from about 10 °C up: below that its
  // slope in rh collapses and at 0 °C it dips a full degree over the first
  // 10 % rh.
  it.each(grid(TDB.filter((tdb) => tdb >= 10)))(
    "round-trips psy_ta_rh's wet_bulb_tmp when tdb is $tdb, rh is $rh",
    ({ tdb, rh }) => {
      const back = rh_from_wet_bulb(psy_ta_rh(tdb, rh).wet_bulb_tmp, tdb);
      expect(Math.abs(back - rh)).toBeLessThanOrEqual(1e-12);
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
