import { expect, describe, it } from "@jest/globals";
import { deep_close_to_obj } from "../test_utilities";
import { psy_ta_rh } from "../../src/psychrometrics/psy_ta_rh";

describe("psy_ta_rh", () => {
  // p_sat, p_vap, hr and h are pythermalcomfort v4.6.2's values, and p_sat,
  // p_vap and hr are checked to 1e-9. This port rounds h to 0.01
  // (src/psychrometrics/enthalpy.js), so h is checked to the tolerance of 1.
  // t_wb and t_dp are this port's own: neither reads p_sat.
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
        t_dp: -50.9,
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
        t_dp: -272.2,
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
        t_dp: -50.2,
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
        t_dp: 11.9,
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
        t_dp: 11.9,
        h: -5575296.159154788,
      },
    },
  ])(
    "returns $expected when tdb is $tdb, rh is $rh, p_atm is $p_atm",
    ({ tdb, rh, p_atm, expected }) => {
      const result = psy_ta_rh(tdb, rh, p_atm);
      deep_close_to_obj(result, expected, 1);
      for (const key of ["p_sat", "p_vap", "hr"]) {
        expect(Math.abs(result[key] - expected[key])).toBeLessThanOrEqual(1e-9);
      }
    },
  );
});
