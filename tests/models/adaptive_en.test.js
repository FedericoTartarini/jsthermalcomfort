import { expect, describe, it } from "@jest/globals";
import { adaptive_en } from "../../src/models/adaptive_en";

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
  ])(
    "returns $expected when tdb is $tdb, tr is $tr, t_running_mean is $t_running_mean and v is $v",
    ({ tdb, tr, t_running_mean, v, expected }) => {
      const result = adaptive_en(tdb, tr, t_running_mean, v);

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
