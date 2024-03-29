import { expect, describe, it } from "@jest/globals";
import { pmv, pmv_array } from "../../src/models/pmv.js";
import { deep_close_to_array } from "../test_utilities.js";

describe("pmv", () => {
  it.each([
    {
      tdb: 22,
      tr: 22,
      vr: 0.1,
      rh: 60,
      met: 1.2,
      clo: 0.5,
      standard: "ISO",
      expect_pmv: -0.75,
    },
    {
      tdb: 27,
      tr: 27,
      vr: 0.1,
      rh: 60,
      met: 1.2,
      clo: 0.5,
      standard: "ISO",
      expect_pmv: 0.8,
    },
    {
      tdb: 27,
      tr: 27,
      vr: 0.3,
      rh: 60,
      met: 1.2,
      clo: 0.5,
      standard: "ISO",
      expect_pmv: 0.4,
    },
    {
      tdb: 19.6,
      tr: 19.6,
      vr: 0.1,
      rh: 86,
      met: 1.1,
      clo: 1,
      standard: "ASHRAE",
      expect_pmv: -0.5,
    },
    {
      tdb: 23.9,
      tr: 23.9,
      vr: 0.1,
      rh: 66,
      met: 1.1,
      clo: 1,
      standard: "ASHRAE",
      expect_pmv: 0.5,
    },
    {
      tdb: 25.7,
      tr: 25.7,
      vr: 0.1,
      rh: 15,
      met: 1.1,
      clo: 1,
      standard: "ASHRAE",
      expect_pmv: 0.5,
    },
  ])(
    "returns $expected when tdb is $tdb, tr is $tr, vr is $vr, rh is $rh, met is $met, clo is $clo, standard is $standard",
    ({ tdb, tr, vr, rh, met, clo, standard, expect_pmv }) => {
      const result = pmv(tdb, tr, vr, rh, met, clo, 0, standard);

      expect(result).toBeCloseTo(expect_pmv, 1);
    },
  );
});

describe("pmv_array", () => {
  it.each([
    {
      tdb: [22, 27],
      tr: [22, 27],
      vr: [0.1, 0.3],
      rh: [60, 60],
      met: [1.2, 1.2],
      clo: [0.5, 0.5],
      standard: "ISO",
      expect_pmv: [-0.75, 0.4],
    },
  ])(
    "returns $expected when tdb is $tdb, tr is $tr, vr is $vr, rh is $rh, met is $met, clo is $clo, standard is $standard",
    ({ tdb, tr, vr, rh, met, clo, standard, expect_pmv }) => {
      const result = pmv_array(tdb, tr, vr, rh, met, clo, undefined, standard);

      deep_close_to_array(result, expect_pmv, 1);
    },
  );
});
