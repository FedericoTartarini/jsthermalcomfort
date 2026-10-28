import { expect, describe, it } from "vitest";
import { deep_close_to_obj } from "../test_utilities";
import { psy_ta_rh } from "../../src/psychrometrics/psy_ta_rh";

describe("psy_ta_rh", () => {
  // p_sat, p_vap, hr, t_dp and h are pythermalcomfort 4.7.0's psy_ta_rh,
  // measured in the parity image.
  it.each([
    {
      tdb: 0,
      rh: 1,
      p_atm: 101325,
      expected: {
        p_sat: 611.212867451187,
        p_vap: 6.11212867451187,
        hr: 3.752135335122248e-5,
        t_wb: -3.3,
        t_dp: -50.37572114175687,
        h: 93.84090473140742,
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
        t_dp: -273.99165262341927,
        h: -274092.0,
      },
    },
    {
      tdb: 1,
      rh: 1,
      p_atm: 101325,
      expected: {
        p_sat: 657.0717179813817,
        p_vap: 6.570717179813816,
        hr: 4.033673538397002e-5,
        t_wb: -2.5,
        t_dp: -49.747732719681224,
        h: 1104.9549830026772,
      },
    },
    {
      tdb: 21,
      rh: 56,
      p_atm: 101325,
      expected: {
        p_sat: 2487.667112750733,
        p_vap: 1393.0935831404106,
        hr: 0.008670667636692745,
        t_wb: 15.4,
        t_dp: 11.883808722406506,
        h: 43098.0014161374,
      },
    },
    {
      tdb: 21,
      rh: 56,
      p_atm: 1000,
      expected: {
        p_sat: 2487.667112750733,
        p_vap: 1393.0935831404106,
        hr: -2.204249532438113,
        t_wb: 15.4,
        t_dp: 11.883808722406506,
        h: -5575296.159154788,
      },
    },
  ])(
    "returns $expected when tdb is $tdb, rh is $rh, p_atm is $p_atm",
    ({ tdb, rh, p_atm, expected }) => {
      const result = psy_ta_rh(tdb, rh, p_atm);
      deep_close_to_obj(result, expected, 1);
    },
  );
});
