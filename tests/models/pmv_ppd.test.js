import { expect, describe, it } from "@jest/globals";
import {
  pmv_ppd,
  pmv_ppd_array,
  pmv_calculation,
} from "../../src/models/pmv_ppd.js";
import { deep_close_to_array } from "../test_utilities.js";

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
      expect_pmv: -0.75,
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

      expect(result.pmv).toBeCloseTo(expect_pmv, 1);
      expect(result.ppd).toBeCloseTo(expect_ppd, 1);
    },
  );

  it("throws an error if standard are not in compliance with ISO or ASHRAE Standards", () => {
    expect(() => {
      pmv_ppd(25, 25, 0.1, 50, 1.1, 0.5, undefined, "random");
    }).toThrow(
      "PMV calculations can only be performed in compliance with ISO or ASHRAE Standards",
    );
  });

  it("check results with limit_inputs disabled", () => {
    const kwargs = {
      limit_inputs: false,
    };
    const result = pmv_ppd(31, 41, 2, 50, 0.7, 2.1, undefined, "iso", kwargs);
    expect(result.pmv).toBeCloseTo(2.4);
    expect(result.ppd).toBeCloseTo(91);
  });
});

describe("pmv_ppd_array", () => {
  // it.each([
  //   {
  //     tdb: [26, 24, 22, 26, 24, 22],
  //     tr: [26, 24, 22, 26, 24, 22],
  //     vr: [0.9, 0.6, 0.3, 0.9, 0.6, 0.3],
  //     rh: [50, 50, 50, 50, 50, 50],
  //     met: [1.1, 1.1, 1.1, 1.3, 1.3, 1.3],
  //     clo: [0.5, 0.5, 0.5, 0.7, 0.7, 0.7],
  //     standard: "ASHRAE",
  //     kwargs: {
  //       units: undefined,
  //       limit_inputs: undefined,
  //       airspeed_control: false,
  //     },
  //     expect_pmv: [NaN, NaN, NaN, -0.14, -0.43, -0.57],
  //   },
  // ])(
  //     "returns $expect_pmv when tdb is $tdb, tr is $tr, vr is $vr, rh is $rh, met is $met, clo is $clo, standard is $standard",
  //     ({ tdb, tr, vr, rh, met, clo, standard, kwargs, expect_pmv }) => {
  //       const result = pmv_ppd_array(
  //           tdb,
  //           tr,
  //           vr,
  //           rh,
  //           met,
  //           clo,
  //           undefined,
  //           standard,
  //           kwargs,
  //       );
  //       deep_close_to_array(result.pmv, expect_pmv, 2);
  //     },
  // );

  it.each([
    {
      tdb: [22, 27],
      tr: [22, 27],
      rh: [60, 60],
      vr: [0.1, 0.1],
      met: [1.2, 1.2],
      clo: [0.5, 0.5],
      standard: "ISO",
      expect_pmv: [-0.75, 0.8],
      expect_ppd: [16.9, 17.3],
    },
  ])(
    "returns $expect_pmv when tdb is $tdb, tr is $tr, vr is $vr, rh is $rh, met is $met, clo is $clo, standard is $standard",
    ({
      tdb,
      tr,
      vr,
      rh,
      met,
      clo,
      standard,
      kwargs,
      expect_pmv,
      expect_ppd,
    }) => {
      const result = pmv_ppd_array(
        tdb,
        tr,
        vr,
        rh,
        met,
        clo,
        undefined,
        standard,
        kwargs,
      );

      deep_close_to_array(result.pmv, expect_pmv, 1);
      deep_close_to_array(result.ppd, expect_ppd, 1);
    },
  );

  it.each([
    {
      tdb: [70, 70],
      tr: [67.28, 67.28],
      vr: [0.328084, 0.328084],
      rh: [86, 86],
      met: [1.1, 1.1],
      clo: [1, 1],
      expect_pmv: [-0.3, -0.3],
    },
  ])(
    "returns $expect_pmv when tdb is $tdb, tr is $tr, vr is $vr, rh is $rh, met is $met, clo is $clo",
    ({ tdb, tr, vr, rh, met, clo, expect_pmv }) => {
      const kwargs = {
        units: "ip",
      };
      const result = pmv_ppd_array(
        tdb,
        tr,
        vr,
        rh,
        met,
        clo,
        undefined,
        undefined,
        kwargs,
      );
      deep_close_to_array(result.pmv, expect_pmv, 1);
    },
  );

  it("check results with limit_inputs disabled", () => {
    const kwargs = {
      units: undefined,
      limit_inputs: false,
      airspeed_control: undefined,
    };
    const result = pmv_ppd_array(
      [31, 31],
      [41, 41],
      [2, 2],
      [50, 50],
      [0.7, 0.7],
      [2.1, 2.1],
      undefined,
      "iso",
      kwargs,
    );

    deep_close_to_array(result.pmv, [2.4, 2.4], 1);
    deep_close_to_array(result.ppd, [91, 91], 1);
  });
});

describe("pmv_calculation", () => {
  it.each([
    {
      tdb: 25,
      tr: 25,
      vr: 0.3,
      rh: 50,
      met: 1.5,
      clo: 0.7,
      wme: 0,
      expected: 0.55,
    },
  ])(
    "returns $expected when tdb is $tdb, tr is $tr, vr is $vr, rh is $rh, met is $met, clo is $clo",
    ({ tdb, tr, vr, rh, met, clo, wme, expected }) => {
      const result = pmv_calculation(tdb, tr, vr, rh, met, clo, wme);
      expect(result).toBeCloseTo(expected, 1);
    },
  );
});
