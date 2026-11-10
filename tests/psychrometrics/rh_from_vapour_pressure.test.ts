import { expect, describe, it } from "vitest";
import { p_sat } from "../../src/psychrometrics/p_sat.ts";
import { psy_ta_rh } from "../../src/psychrometrics/psy_ta_rh.ts";
import { rh_from_vapour_pressure } from "../../src/psychrometrics/index.ts";

const TDB = [0, 5, 10, 15, 20, 25, 30, 35, 40];
const RH = [5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const grid = TDB.flatMap((tdb) => RH.map((rh) => ({ tdb, rh })));

describe("rh_from_vapour_pressure", () => {
  // The same p_sat(tdb) sits on both sides of the round trip and cancels,
  // so the inverse is exact to floating point.
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
    // pythermalcomfort 4.7.0's psy_ta_rh(21, 56).p_vap.
    { p_vap: 1393.0935831404106, tdb: 21, expected: 56 },
    { p_vap: 0, tdb: 25, expected: 0 },
    { p_vap: p_sat(25), tdb: 25, expected: 100 },
    { p_vap: 2 * p_sat(25), tdb: 25, expected: 200 },
  ])(
    "returns $expected when p_vap is $p_vap, tdb is $tdb",
    ({ p_vap, tdb, expected }) => {
      expect(rh_from_vapour_pressure(p_vap, tdb)).toBeCloseTo(expected, 9);
    },
  );

  // A call with arguments the type rejects, to test the runtime.
  const call =
    (...args: unknown[]) =>
    () =>
      (rh_from_vapour_pressure as (...a: unknown[]) => unknown)(...args);

  it("throws TypeError for an argument that is not a number, naming it", () => {
    for (const bad of [null, true, "20", [21]]) {
      expect(call(bad, 21)).toThrow(new TypeError("p_vap must be a number."));
      expect(call(1393, bad)).toThrow(new TypeError("tdb must be a number."));
    }
    expect(call()).toThrow(new TypeError("p_vap must be a number."));
    expect(call(1393)).toThrow(new TypeError("tdb must be a number."));
  });

  it("does not throw for NaN", () => {
    expect(call(NaN, 21)).not.toThrow();
    expect(call(1393, NaN)).not.toThrow();
  });
});
