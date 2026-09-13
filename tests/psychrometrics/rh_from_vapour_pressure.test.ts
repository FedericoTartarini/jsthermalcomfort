import { expect, describe, it } from "@jest/globals";
import { p_sat } from "../../src/psychrometrics/p_sat.js";
import { psy_ta_rh } from "../../src/psychrometrics/psy_ta_rh.js";
import { rh_from_vapour_pressure } from "../../src/psychrometrics/rh_from_vapour_pressure.ts";

const TDB = [0, 5, 10, 15, 20, 25, 30, 35, 40];
const RH = [5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const grid = TDB.flatMap((tdb) => RH.map((rh) => ({ tdb, rh })));

describe("rh_from_vapour_pressure", () => {
  // The same rounded p_sat(tdb) sits on both sides of the round trip and
  // cancels, so the inverse is exact to floating point.
  it.each(grid)(
    "round-trips psy_ta_rh's p_vap when tdb is $tdb, rh is $rh",
    ({ tdb, rh }) => {
      const { p_vap } = psy_ta_rh(tdb, rh);
      expect(
        Math.abs(rh_from_vapour_pressure(p_vap, tdb) - rh),
      ).toBeLessThanOrEqual(1e-6);
    },
  );

  it.each([
    { p_vap: 1393.112, tdb: 21, expected: 56 },
    { p_vap: 0, tdb: 25, expected: 0 },
    { p_vap: p_sat(25), tdb: 25, expected: 100 },
    { p_vap: 2 * p_sat(25), tdb: 25, expected: 200 },
  ])(
    "returns $expected when p_vap is $p_vap, tdb is $tdb",
    ({ p_vap, tdb, expected }) => {
      expect(rh_from_vapour_pressure(p_vap, tdb)).toBeCloseTo(expected, 9);
    },
  );
});
