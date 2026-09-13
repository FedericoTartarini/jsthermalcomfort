import { expect, describe, it } from "@jest/globals";
import { psy_ta_rh } from "../../src/psychrometrics/psy_ta_rh.js";
import { rh_from_dew_point } from "../../src/psychrometrics/rh_from_dew_point.ts";

const TDB = [0, 5, 10, 15, 20, 25, 30, 35, 40];
const RH = [5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const grid = TDB.flatMap((tdb) => RH.map((rh) => ({ tdb, rh })));

describe("rh_from_dew_point", () => {
  // psy_ta_rh rounds t_dp to 0.1 °C, so the best the inverse can do is land
  // in the band of rh that rounds to the same dew point. Half a band is
  // 0.05 °C × rh × ∂γ/∂t_dp = 0.05 × rh × b·c / (c + t_dp)², at most about
  // 0.36 % rh on this grid (rh 100 at t_dp 0 °C).
  it.each(grid)(
    "round-trips psy_ta_rh's t_dp when tdb is $tdb, rh is $rh",
    ({ tdb, rh }) => {
      const forward = psy_ta_rh(tdb, rh).t_dp;
      const back = rh_from_dew_point(forward, tdb);
      expect(Math.abs(back - rh)).toBeLessThanOrEqual(0.4);
      // Inside the band means the forward function cannot tell them apart.
      expect(Math.abs(psy_ta_rh(tdb, back).t_dp - forward)).toBe(0);
    },
  );

  it.each([
    { t_dp: 11.9, tdb: 21, expected: 56.141013900020575 },
    { t_dp: 25, tdb: 25, expected: 100.94912936885467 },
  ])(
    "returns $expected when t_dp is $t_dp, tdb is $tdb",
    ({ t_dp, tdb, expected }) => {
      expect(rh_from_dew_point(t_dp, tdb)).toBeCloseTo(expected, 9);
    },
  );

  it("is monotonic in t_dp", () => {
    expect(rh_from_dew_point(10, 25)).toBeLessThan(rh_from_dew_point(15, 25));
  });
});
