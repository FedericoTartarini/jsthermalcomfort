import { expect, describe, it } from "@jest/globals";
import { adaptive_en, adaptive_en_array } from "../../src/models/adaptive_en";
import { deep_close_to_array } from "../test_utilities";

describe("adaptive_en", () => {
  it.each([
    {
      tdb: 25,
      tr: 25,
      t_running_mean: 9,
      v: 0.1,
      expected: {
        tmp_cmf: NaN,
        acceptability_cat_i: false,
        acceptability_cat_ii: false,
        acceptability_cat_iii: false,
        tmp_cmf_cat_i_up: NaN,
        tmp_cmf_cat_ii_up: NaN,
        tmp_cmf_cat_iii_up: NaN,
        tmp_cmf_cat_i_low: NaN,
        tmp_cmf_cat_ii_low: NaN,
        tmp_cmf_cat_iii_low: NaN,
      },
    },
    {
      tdb: 25,
      tr: 25,
      t_running_mean: 20,
      v: 0.1,
      expected: {
        tmp_cmf: 25.4,
        acceptability_cat_i: true,
        acceptability_cat_ii: true,
        acceptability_cat_iii: true,
        tmp_cmf_cat_i_up: 27.4,
        tmp_cmf_cat_ii_up: 28.4,
        tmp_cmf_cat_iii_up: 29.4,
        tmp_cmf_cat_i_low: 22.4,
        tmp_cmf_cat_ii_low: 21.4,
        tmp_cmf_cat_iii_low: 20.4,
      },
    },
    {
      tdb: 23.5,
      tr: 23.5,
      t_running_mean: 28,
      v: 0.1,
      expected: {
        tmp_cmf: 28.0,
        acceptability_cat_i: false,
        acceptability_cat_ii: false,
        acceptability_cat_iii: true,
        tmp_cmf_cat_i_up: 30.0,
        tmp_cmf_cat_ii_up: 31.0,
        tmp_cmf_cat_iii_up: 32.0,
        tmp_cmf_cat_i_low: 25.0,
        tmp_cmf_cat_ii_low: 24.0,
        tmp_cmf_cat_iii_low: 23.0,
      },
    },
    {
      tdb: 74.3,
      tr: 74.3,
      t_running_mean: 82.4,
      v: 0.3281,
      units: "IP",
      expected: {
        tmp_cmf: 82.5,
        acceptability_cat_i: false,
        acceptability_cat_ii: false,
        acceptability_cat_iii: true,
        tmp_cmf_cat_i_up: 86.1,
        tmp_cmf_cat_ii_up: 87.9,
        tmp_cmf_cat_iii_up: 89.7,
        tmp_cmf_cat_i_low: 77.1,
        tmp_cmf_cat_ii_low: 75.3,
        tmp_cmf_cat_iii_low: 73.5,
      },
    },
  ])(
    "returns $expected when tdb is $tdb, tr is $tr, t_running_mean is $t_running_mean,  v is $v and units is $units",
    ({ tdb, tr, t_running_mean, v, units, expected }) => {
      const result = adaptive_en(tdb, tr, t_running_mean, v, units);

      if (isNaN(expected.tmp_cmf)) expect(result.tmp_cmf).toBeNaN();
      else expect(result.tmp_cmf).toBeCloseTo(expected.tmp_cmf);

      if (isNaN(expected.tmp_cmf_cat_i_up))
        expect(result.tmp_cmf_cat_i_up).toBeNaN();
      else
        expect(result.tmp_cmf_cat_i_up).toBeCloseTo(expected.tmp_cmf_cat_i_up);

      if (isNaN(expected.tmp_cmf_cat_ii_up))
        expect(result.tmp_cmf_cat_ii_up).toBeNaN();
      else
        expect(result.tmp_cmf_cat_ii_up).toBeCloseTo(
          expected.tmp_cmf_cat_ii_up,
        );

      if (isNaN(expected.tmp_cmf_cat_iii_up))
        expect(result.tmp_cmf_cat_iii_up).toBeNaN();
      else
        expect(result.tmp_cmf_cat_iii_up).toBeCloseTo(
          expected.tmp_cmf_cat_iii_up,
        );

      if (isNaN(expected.tmp_cmf_cat_i_low))
        expect(result.tmp_cmf_cat_i_low).toBeNaN();
      else
        expect(result.tmp_cmf_cat_i_low).toBeCloseTo(
          expected.tmp_cmf_cat_i_low,
        );

      if (isNaN(expected.tmp_cmf_cat_ii_low))
        expect(result.tmp_cmf_cat_ii_low).toBeNaN();
      else
        expect(result.tmp_cmf_cat_ii_low).toBeCloseTo(
          expected.tmp_cmf_cat_ii_low,
        );

      if (isNaN(expected.tmp_cmf_cat_iii_low))
        expect(result.tmp_cmf_cat_iii_low).toBeNaN();
      else
        expect(result.tmp_cmf_cat_iii_low).toBeCloseTo(
          expected.tmp_cmf_cat_iii_low,
        );

      expect(result.acceptability_cat_i).toBe(expected.acceptability_cat_i);
      expect(result.acceptability_cat_ii).toBe(expected.acceptability_cat_ii);
      expect(result.acceptability_cat_iii).toBe(expected.acceptability_cat_iii);
    },
  );
});

describe("adaptive_en_array", () => {
  it.each([
    {
      tdb: [25, 25, 23.5],
      tr: [25, 25, 23.5],
      t_running_mean: [9, 20, 28],
      v: [0.1, 0.1, 0.1],
      expected: {
        tmp_cmf: [NaN, 25.4, 28.0],
        acceptability_cat_i: [false, true, false],
        acceptability_cat_ii: [false, true, false],
        acceptability_cat_iii: [false, true, true],
        tmp_cmf_cat_i_up: [NaN, 27.4, 30.0],
        tmp_cmf_cat_ii_up: [NaN, 28.4, 31.0],
        tmp_cmf_cat_iii_up: [NaN, 29.4, 32.0],
        tmp_cmf_cat_i_low: [NaN, 22.4, 25.0],
        tmp_cmf_cat_ii_low: [NaN, 21.4, 24.0],
        tmp_cmf_cat_iii_low: [NaN, 20.4, 23.0],
      },
    },
  ])(
    "returns $expected when tdb is $tdb, tr is $tr, t_running_mean is $t_running_mean and v is $v",
    ({ tdb, tr, t_running_mean, v, expected }) => {
      const result = adaptive_en_array(tdb, tr, t_running_mean, v);

      deep_close_to_array(result.tmp_cmf, expected.tmp_cmf);
      deep_close_to_array(result.tmp_cmf_cat_i_up, expected.tmp_cmf_cat_i_up);
      deep_close_to_array(result.tmp_cmf_cat_ii_up, expected.tmp_cmf_cat_ii_up);
      deep_close_to_array(
        result.tmp_cmf_cat_iii_up,
        expected.tmp_cmf_cat_iii_up,
      );
      deep_close_to_array(result.tmp_cmf_cat_i_low, expected.tmp_cmf_cat_i_low);
      deep_close_to_array(
        result.tmp_cmf_cat_ii_low,
        expected.tmp_cmf_cat_ii_low,
      );
      deep_close_to_array(
        result.tmp_cmf_cat_iii_low,
        expected.tmp_cmf_cat_iii_low,
      );

      expect(result.acceptability_cat_i).toStrictEqual(
        expected.acceptability_cat_i,
      );
      expect(result.acceptability_cat_ii).toStrictEqual(
        expected.acceptability_cat_ii,
      );
      expect(result.acceptability_cat_iii).toStrictEqual(
        expected.acceptability_cat_iii,
      );
    },
  );
});
