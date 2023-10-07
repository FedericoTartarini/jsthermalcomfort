import { expect, describe, it } from "@jest/globals";
import { deep_close_to_array } from "../test_utilities.js";
import { e_pmv, e_pmv_array } from "../../src/models/e_pmv.js";

describe("e_pmv", () => {
  it.each([
    {
      tdb: 24,
      tr: 30,
      vr: 0.22,
      rh: 50,
      met: 1.4,
      clo: 0.5,
      e_coefficient: 0.6,
      expected: 0.29,
    },
  ])(
    "returns $expected when tdb is $tdb, tr is $tr, vr is $vr, rh is $rh, met is $met, clo is $clo, e_coefficient is $e_coefficient",
    ({ tdb, tr, vr, rh, met, clo, e_coefficient, expected }) => {
      const result = e_pmv(tdb, tr, vr, rh, met, clo, e_coefficient);

      expect(result).toBeCloseTo(expected, 2);
    },
  );
});

describe("e_pmv_array", () => {
  it.each([
    {
      tdb: [24, 30],
      tr: [30, 30],
      vr: [0.22, 0.22],
      rh: [50, 50],
      met: [1.4, 1.4],
      clo: [0.5, 0.5],
      e_coefficient: [0.6, 0.6],
      wme: undefined,
      expected: [0.29, 0.91],
    },
  ])(
    "returns $expected when tdb is $tdb, tr is $tr, vr is $vr, rh is $rh, met is $met, clo is $clo, e_coefficient is $e_coefficient",
    ({ tdb, tr, vr, rh, met, clo, e_coefficient, wme, expected }) => {
      const result = e_pmv_array(tdb, tr, vr, rh, met, clo, e_coefficient, wme);

      deep_close_to_array(result, expected, 2);
    },
  );
});
