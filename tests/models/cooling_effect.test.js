import { expect, describe, it } from "@jest/globals";
import { cooling_effect } from "../../src/models/cooling_effect.js";

describe("cooling_effect", () => {
  it.each([
    {
      tdb: 25,
      tr: 25,
      vr: 0.05,
      rh: 50,
      met: 1,
      clo: 0.6,
      expect_result: 0,
    },
    {
      tdb: 25,
      tr: 25,
      vr: 0.5,
      rh: 50,
      met: 1,
      clo: 0.6,
      expect_result: 2.17,
    },
    {
      tdb: 27,
      tr: 25,
      vr: 0.5,
      rh: 50,
      met: 1,
      clo: 0.6,
      expect_result: 1.85,
    },
    {
      tdb: 25,
      tr: 27,
      vr: 0.5,
      rh: 50,
      met: 1,
      clo: 0.6,
      expect_result: 2.44,
    },
    {
      tdb: 25,
      tr: 25,
      vr: 0.5,
      rh: 60,
      met: 1,
      clo: 0.3,
      expect_result: 2.41,
    },
  ])(
    "returns $expect_result when tdb is $tdb, tr is $tr, vr is $vr, rh is $rh, met is $met, clo is $clo.",
    ({ tdb, tr, vr, rh, met, clo, expect_result }) => {
      const result = cooling_effect(tdb, tr, vr, rh, met, clo);

      expect(result).toBeCloseTo(expect_result);
    },
  );

  it("should be 0 when the cooling effect cannot be calculated", () => {
    const result = cooling_effect(0, 80, 5, 60, 3, 1);

    expect(result).toBe(0);
  });

  it("should be convert unit to SI when unit is IP and output the correct result", () => {
    const result = cooling_effect(77, 77, 1.64, 50, 1, 0.6, undefined, "IP");

    expect(result).toBeCloseTo(3.95);
  });
});
