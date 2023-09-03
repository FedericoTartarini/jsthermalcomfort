import { expect, describe, it } from "@jest/globals";
import { psy_ta_rh } from "../../src/psychrometrics/psy_ta_rh";

describe("psy_ta_rh", () => {
  it.each([
    {
      tdb: 0,
      rh: 1,
      p_atm: 101325,
      expected: {
        p_sat: 611.2,
        p_vap: 6.112000000000001,
        hr: 3.752056339189195e-5,
        t_wb: -3.3,
        t_dp: -50.9,
        h: 93.84,
      },
    },
    {
      tdb: -273,
      rh: 1,
      p_atm: 101325,
      expected: {
        p_sat: 0.0,
        p_vap: 0.0,
        hr: 0.0,
        t_wb: -124.2,
        t_dp: -272.2,
        h: -274092.0,
      },
    },
    {
      tdb: 1,
      rh: 1,
      p_atm: 101325,
      expected: {
        p_sat: 657.1,
        p_vap: 6.571000000000001,
        hr: 4.033847169106817e-5,
        t_wb: -2.5,
        t_dp: -50.2,
        h: 1104.96,
      },
    },
    {
      tdb: 21,
      rh: 56,
      p_atm: 101325,
      expected: {
        p_sat: 2487.7,
        p_vap: 1393.112,
        hr: 0.00867078386190402,
        t_wb: 15.4,
        t_dp: 11.9,
        h: 43098.3,
      },
    },
    {
      tdb: 21,
      rh: 56,
      p_atm: 1000,
      expected: {
        p_sat: 2487.7,
        p_vap: 1393.112,
        hr: -2.2041754048718936,
        t_wb: 15.4,
        t_dp: 11.9,
        h: -5575107.96,
      },
    },
  ])(
    "returns $expected when tdb is $tdb, rh is $rh, p_atm is $p_atm",
    ({ tdb, rh, p_atm, expected }) => {
      const result = psy_ta_rh(tdb, rh, p_atm);
      expect(result).toStrictEqual(expected);
    },
  );
});
