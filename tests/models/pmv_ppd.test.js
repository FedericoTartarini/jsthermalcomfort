import { expect, describe, it } from "@jest/globals";
import { pmv_ppd } from "../../src/models/pmv_ppd.js";

describe("pmv_pdd", () => {
  it.each([
    {
      tdb: 22,
      tr: 22,
      vr: 0.1,
      rh: 60,
      met: 1.2,
      clo: 0.5,
      standard: "ISO",
      expect_pmv: -0.8,
      expect_ppd: 16.9,
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
      expect_ppd: 17.3,
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
      expect_ppd: 8.9,
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
      expect_ppd: 9.7,
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
      expect_ppd: 9.8,
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
      expect_ppd: 10.8,
    },
  ])(
    "returns $expect_pmv and $expect_ppd when tdb is $tdb, tr is $tr, vr is $vr, rh is $rh, met is $met, clo is $clo, standard is $standard",
    ({ tdb, tr, vr, rh, met, clo, standard, expect_pmv, expect_ppd }) => {
      const result = pmv_ppd(tdb, tr, vr, rh, met, clo, 0, standard);
      if (!result.hasOwnProperty("pmv")) {
        throw new Error("pmv property not found in pmv_ppdValue");
      }
      if (!result.hasOwnProperty("ppd")) {
        throw new Error("ppd property not found in pmv_ppdValue");
      }

      result.pmv.forEach((value) => {
          expect(value).toBeCloseTo(expect_pmv);
      });

      result.ppd.forEach((value) => {
          expect(value).toBeCloseTo(expect_ppd);
      });

    },
  );
});
