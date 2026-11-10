import { expect, describe, it } from "vitest";
import { psy_ta_rh } from "../../src/psychrometrics/psy_ta_rh.ts";
import { rh_from_dew_point } from "../../src/psychrometrics/index.ts";

const TDB = [0, 5, 10, 15, 20, 25, 30, 35, 40];
const RH = [5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const grid = TDB.flatMap((tdb) => RH.map((rh) => ({ tdb, rh })));

describe("rh_from_dew_point", () => {
  // dew_point_tmp does not round, so the inverse is exact to floating point.
  it.each(grid)(
    "round-trips psy_ta_rh's dew_point_tmp when tdb is $tdb, rh is $rh",
    ({ tdb, rh }) => {
      const back = rh_from_dew_point(psy_ta_rh(tdb, rh).dew_point_tmp, tdb);
      expect(Math.abs(back - rh)).toBeLessThanOrEqual(1e-12);
    },
  );

  it.each([
    { t_dp: 11.9, tdb: 21, expected: 56.059759430531365 },
    { t_dp: 25, tdb: 25, expected: 100 },
    { t_dp: 26, tdb: 25, expected: 106.11655310234882 },
  ])(
    "returns $expected when t_dp is $t_dp, tdb is $tdb",
    ({ t_dp, tdb, expected }) => {
      expect(rh_from_dew_point(t_dp, tdb)).toBeCloseTo(expected, 9);
    },
  );

  it("is monotonic in t_dp", () => {
    expect(rh_from_dew_point(10, 25)).toBeLessThan(rh_from_dew_point(15, 25));
  });

  // A call with arguments the type rejects, to test the runtime.
  const call =
    (...args: unknown[]) =>
    () =>
      (rh_from_dew_point as (...a: unknown[]) => unknown)(...args);

  it("throws TypeError for an argument that is not a number, naming it", () => {
    for (const bad of [null, true, "20", [21]]) {
      expect(call(bad, 21)).toThrow(new TypeError("t_dp must be a number."));
      expect(call(11.9, bad)).toThrow(new TypeError("tdb must be a number."));
    }
    expect(call()).toThrow(new TypeError("t_dp must be a number."));
    expect(call(11.9)).toThrow(new TypeError("tdb must be a number."));
  });

  it("does not throw for NaN", () => {
    expect(call(NaN, 21)).not.toThrow();
    expect(call(11.9, NaN)).not.toThrow();
  });
});
