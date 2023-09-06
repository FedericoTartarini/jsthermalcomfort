import { expect, describe, it } from "@jest/globals";
import { athb, athb_array } from "../../src/models/athb.js";
import { deep_close_to_array } from "../test_utilities.js";

describe("athb_array", () => {
  it("should be a function", () => {
    expect(athb_array).toBeInstanceOf(Function);
  });

  it.each([
    {
      tdb: [25, 25, 15, 25],
      tr: [25, 35, 25, 25],
      vr: [0.1, 0.1, 0.2, 0.1],
      rh: [50, 50, 50, 60],
      met: [1.1, 1.5, 1.2, 2],
      t_running_mean: [20, 20, 20, 20],
      expected: [0.17, 0.912, -0.755, 0.38],
    },
  ])(
    "returns $expected when tdb is $tdb, tr is $tr, vr is $vr, rh is $rh, met is $met, t_running_mean is $t_running_mean",
    ({ tdb, tr, vr, rh, met, t_running_mean, expected }) => {
      const result = athb_array(tdb, tr, vr, rh, met, t_running_mean);

      deep_close_to_array(result, expected, 3);
    },
  );
});

describe("athb", () => {
  it("should be a function", () => {
    expect(athb).toBeInstanceOf(Function);
  });

  it.each([
    {
      tdb: 25,
      tr: 25,
      vr: 0.1,
      rh: 50,
      met: 1.1,
      t_running_mean: 20,
      expected: 0.2,
    },
  ])(
    "returns $expected when tdb is $tdb, tr is $tr, vr is $vr, rh is $rh, met is $met, t_running_mean is $t_running_mean",
    ({ tdb, tr, vr, rh, met, t_running_mean, expected }) => {
      const result = athb(tdb, tr, vr, rh, met, t_running_mean);

      expect(result).toBeCloseTo(expected, 1);
    },
  );
});
