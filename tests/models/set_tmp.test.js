import { expect, describe, it } from "@jest/globals";
import { set_tmp, set_tmp_array } from "../../src/models/set_tmp";

describe("set_tmp", () => {
  it("should be a function", () => {
    expect(set_tmp).toBeInstanceOf(Function);
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
      p_atm: undefined,
      body_position: undefined,
      units: undefined,
      limit_inputs: undefined,
      expected: 24.3,
    },
    {
      tdb: 77,
      tr: 77,
      v: 0.328,
      rh: 50,
      met: 1.2,
      clo: 0.5,
      wme: undefined,
      body_surface_area: undefined,
      p_atm: undefined,
      body_position: undefined,
      units: "IP",
      limit_inputs: undefined,
      expected: 75.8,
    },
    {
      tdb: 77,
      tr: 77,
      v: 0.328,
      rh: 50,
      met: 1.2,
      clo: 0.5,
      wme: undefined,
      body_surface_area: undefined,
      p_atm: undefined,
      body_position: undefined,
      units: "SI",
      limit_inputs: undefined,
      expected: 41.9,
    },
    {
      tdb: 77,
      tr: 77,
      v: 0.328,
      rh: 50,
      met: 1.2,
      clo: 0.5,
      wme: undefined,
      body_surface_area: undefined,
      p_atm: undefined,
      body_position: "sitting",
      units: "SI",
      limit_inputs: undefined,
      expected: 38.2,
    },
  ])(
    "returns $expected when tdb is $tdb, tr is $tr, v is $v, rh is $rh, met is $met, clo is $clo and units is $units",
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
      limit_inputs,
      kwargs,
      expected,
    }) => {
      const result = set_tmp(
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
        limit_inputs,
        kwargs,
      );
      expect(result).toBeCloseTo(expected, 1);
    },
  );
});
