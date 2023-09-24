import { expect, describe, it } from "@jest/globals";
import { deep_close_to_array } from "../test_utilities.js";
import { a_pmv, a_pmv_array } from "../../src/models/a_pmv.js";

describe("a_pmv", () => {
  it.each([
    {
      tdb: 24,
      tr: 30,
      vr: 0.22,
      rh: 50,
      met: 1.4,
      clo: 0.5,
      a_coefficient: 0.293,
      wme: undefined,
      expected: 0.48,
    },
  ])(
    "returns $expected when tdb is $tdb, tr is $tr, vr is $vr, rh is $rh, met is $met, clo is $clo, a_coefficient is $a_coefficient",
    ({ tdb, tr, vr, rh, met, clo, wme, a_coefficient, expected }) => {
      const result = a_pmv(tdb, tr, vr, rh, met, clo, a_coefficient, wme);

      expect(result).toBeCloseTo(expected, 2);
    },
  );
});

describe("a_pmv_array", () => {
  it.each([
    {
      tdb: [24, 30],
      tr: [30, 30],
      vr: [0.22, 0.22],
      rh: [50, 50],
      met: [1.4, 1.4],
      clo: [0.5, 0.5],
      a_coefficient: [0.293, 0.293],
      wme: undefined,
      expected: [0.48, 1.09],
    },
  ])(
    "returns $expected when tdb is $tdb, tr is $tr, vr is $vr, rh is $rh, met is $met, clo is $clo, a_coefficient is $a_coefficient",
    ({ tdb, tr, vr, rh, met, clo, wme, a_coefficient, expected }) => {
      const result = a_pmv_array(tdb, tr, vr, rh, met, clo, a_coefficient, wme);

      deep_close_to_array(result, expected, 2);
    },
  );
});
