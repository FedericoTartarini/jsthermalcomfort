import { expect, describe, it } from "@jest/globals";
import { deep_close_to_obj } from "../test_utilities";
import { use_fans_heatwaves } from "../../src/models/use_fans_heatwave";

describe("use_fans_heatwaves", () => {
  it("should be a function", () => {
    expect(use_fans_heatwaves).toBeInstanceOf(Function);
  });

  it.each([
    {
      tdb: 25,
      tr: 25,
      v: 0.1,
      rh: 50,
      met: 1.2,
      clo: 0.5,
      wme: undefined,
      body_surface_area: undefined,
      p_atmospheric: undefined,
      body_position: undefined,
      max_skin_blood_flow: undefined,
      kwargs: undefined,
      expected: {
        e_skin: 18.1,
        e_rsw: 10.0,
        e_max: 145.0,
        q_sensible: 45.7,
        q_skin: 63.8,
        q_res: 5.2,
        t_core: 36.9,
        t_skin: 33.8,
        m_bl: 13.6,
        m_rsw: 14.6,
        w: 0.1,
        w_max: 0.7,
        heat_strain_blood_flow: 0.0,
        heat_strain_w: 0.0,
        heat_strain_sweating: 0.0,
        heat_strain: 0.0,
      },
    },
    {
      tdb: 40,
      tr: 35,
      v: 0.2,
      rh: 60,
      met: 1.5,
      clo: 0.3,
      wme: 0,
      body_surface_area: 1.8258,
      p_atmospheric: 101325,
      body_position: "standing",
      max_skin_blood_flow: 100,
      kwargs: { max_sweating: 100 },
      expected: {
        e_skin: 72.7,
        e_rsw: 71.0,
        e_max: 99.4,
        q_sensible: -4.2,
        q_skin: 68.5,
        q_res: 2.2,
        t_core: 37.5,
        t_skin: 36.9,
        m_bl: 94.8,
        m_rsw: 104.3,
        w: 0.7,
        w_max: 0.7,
        heat_strain_blood_flow: 0.0,
        heat_strain_w: 1.0,
        heat_strain_sweating: 0.0,
        heat_strain: 1.0,
      },
    },
    {
      tdb: 40,
      tr: 35,
      v: 0.2,
      rh: 60,
      met: 1.5,
      clo: 0.3,
      wme: 0,
      body_surface_area: 1.8258,
      p_atmospheric: 101325,
      body_position: "standing",
      max_skin_blood_flow: 80,
      kwargs: { max_sweating: 100 },
      expected: {
        e_skin: 71.6,
        e_rsw: 69.9,
        e_max: 98.0,
        q_sensible: -4.6,
        q_skin: 67.0,
        q_res: 2.2,
        t_core: 37.5,
        t_skin: 36.9,
        m_bl: 80.0,
        m_rsw: 102.9,
        w: 0.7,
        w_max: 0.7,
        heat_strain_blood_flow: 1.0,
        heat_strain_w: 1.0,
        heat_strain_sweating: 0.0,
        heat_strain: 1.0,
      },
    },
    {
      tdb: 55,
      tr: 25,
      v: 0.2,
      rh: 60,
      met: 1.5,
      clo: 0.3,
      wme: 0,
      body_surface_area: 1.8258,
      p_atmospheric: 101325,
      body_position: "standing",
      max_skin_blood_flow: 80,
      kwargs: { max_sweating: 100 },
      expected: {
        e_skin: NaN,
        e_rsw: NaN,
        e_max: NaN,
        q_sensible: NaN,
        q_skin: NaN,
        q_res: NaN,
        t_core: NaN,
        t_skin: NaN,
        m_bl: NaN,
        m_rsw: NaN,
        w: NaN,
        w_max: NaN,
        heat_strain_blood_flow: NaN,
        heat_strain_w: NaN,
        heat_strain_sweating: NaN,
        heat_strain: NaN,
      },
    },
  ])(
    "returns $expected when tdb is $tdb, tr is $tr, v is $v, rh is $rh, met is $met, clo is $clo ",
    ({
      tdb,
      tr,
      v,
      rh,
      met,
      clo,
      wme,
      body_surface_area,
      p_atm,
      body_position,
      units,
      max_skin_blood_flow,
      kwargs,
      expected,
    }) => {
      const result = use_fans_heatwaves(
        tdb,
        tr,
        v,
        rh,
        met,
        clo,
        wme,
        body_surface_area,
        p_atm,
        body_position,
        units,
        max_skin_blood_flow,
        kwargs,
      );
      for (let key in expected) {
        if (isNaN(expected[key])) {
          expect(result[key]).toBeNaN();
        } else {
          deep_close_to_obj(result, expected, 1);
        }
      }
    },
  );
});