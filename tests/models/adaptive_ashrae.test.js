import { expect, describe, it } from "@jest/globals";
import {
  adaptive_ashrae,
  adaptive_ashrae_array,
} from "../../src/models/adaptive_ashrae";

describe("adaptive_ashrae", () => {
  it.each([
    {
      tdb: 19.6,
      tr: 19.6,
      t_running_mean: 17,
      v: 0.1,
      expected: { acceptability_80: true },
    },
    {
      tdb: 19.6,
      tr: 19.6,
      t_running_mean: 17,
      v: 0.1,
      expected: { acceptability_90: false },
    },
    {
      tdb: 19.6,
      tr: 19.6,
      t_running_mean: 25,
      v: 0.1,
      expected: { acceptability_80: false },
    },
    {
      tdb: 26,
      tr: 26,
      t_running_mean: 16,
      v: 0.1,
      expected: { acceptability_80: true },
    },
    {
      tdb: 26,
      tr: 26,
      t_running_mean: 16,
      v: 0.1,
      expected: { acceptability_90: false },
    },
    {
      tdb: 30,
      tr: 26,
      t_running_mean: 16,
      v: 0.1,
      expected: { acceptability_80: false },
    },
    {
      tdb: 25,
      tr: 25,
      t_running_mean: 23,
      v: 0.1,
      expected: { acceptability_80: true },
    },
    {
      tdb: 25,
      tr: 25,
      t_running_mean: 23,
      v: 0.1,
      expected: { acceptability_90: true },
    },
    {
      tdb: 25,
      tr: 25,
      t_running_mean: 9,
      v: 0.1,
      expected: {
        tmp_cmf: NaN,
        tmp_cmf_80_low: NaN,
        tmp_cmf_80_up: NaN,
        tmp_cmf_90_low: NaN,
        tmp_cmf_90_up: NaN,
        acceptability_80: false,
        acceptability_90: false,
      },
    },
    {
      tdb: 77,
      tr: 77,
      t_running_mean: 48,
      v: 0.3,
      units: "IP",
      expected: {
        tmp_cmf: NaN,
        tmp_cmf_80_low: NaN,
        tmp_cmf_80_up: NaN,
        tmp_cmf_90_low: NaN,
        tmp_cmf_90_up: NaN,
        acceptability_80: false,
        acceptability_90: false,
      },
    },
  ])(
    "returns $expected when tdb is $tdb, tr is $tr, t_running_mean is $t_running_mean, v is $v and units is $units",
    ({ tdb, tr, t_running_mean, v, expected, units }) => {
      const result = adaptive_ashrae(tdb, tr, t_running_mean, v, units);

      for (const [key, value] in Object.entries(expected)) {
        expect(result[key]).toBe(value);
      }
    },
  );

  it.each([
    {
      tdb: 25,
      tr: 25,
      t_running_mean: 10,
      v: 0.1,
      expected: {
        tmp_cmf: 20.9,
        tmp_cmf_80_low: 17.4,
        tmp_cmf_80_up: 24.4,
        tmp_cmf_90_low: 18.4,
        tmp_cmf_90_up: 23.4,
        acceptability_80: false,
        acceptability_90: false,
      },
    },
    {
      tdb: 77,
      tr: 77,
      t_running_mean: 68,
      v: 0.3,
      units: "IP",
      expected: {
        tmp_cmf: 75.2,
        tmp_cmf_80_low: 68.9,
        tmp_cmf_80_up: 81.5,
        tmp_cmf_90_low: 70.7,
        tmp_cmf_90_up: 79.7,
        acceptability_80: true,
        acceptability_90: true,
      },
    },
  ])(
    "returns $expected when tdb is $tdb, tr is $tr, t_running_mean is $t_running_mean, v is $v and units is $units",
    ({ tdb, tr, t_running_mean, v, units, expected }) => {
      const result = adaptive_ashrae(tdb, tr, t_running_mean, v, units);
      expect(result.tmp_cmf).toBeCloseTo(expected.tmp_cmf, 2);
      expect(result.tmp_cmf_80_low).toBeCloseTo(expected.tmp_cmf_80_low, 2);
      expect(result.tmp_cmf_80_up).toBeCloseTo(expected.tmp_cmf_80_up, 2);
      expect(result.tmp_cmf_90_low).toBeCloseTo(expected.tmp_cmf_90_low, 2);
      expect(result.tmp_cmf_90_up).toBeCloseTo(expected.tmp_cmf_90_up, 2);

      expect(result.acceptability_80).toBe(expected.acceptability_80);
      expect(result.acceptability_90).toBe(expected.acceptability_90);
    },
  );
});

describe("adaptive_ashrae_array", () => {
  it.each([
    {
      tdb: [19.6, 19.6, 19.6, 26, 30, 25],
      tr: [19.6, 19.6, 19.6, 26, 26, 25],
      t_running_mean: [17, 17, 25, 16, 16, 23],
      v: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
      expected: {
        acceptability_80: [true, undefined, false, true, false, true],
        acceptability_90: [undefined, false, undefined, false, undefined, true],
      },
    },
  ])(
    "returns $expected when tdb is $tdb, tr is $tr, t_running_mean is $t_running_mean, v is $v and units is $units",
    ({ tdb, tr, t_running_mean, v, expected, units }) => {
      const result = adaptive_ashrae_array(tdb, tr, t_running_mean, v, units);

      for (const [key, value] in Object.entries(expected)) {
        if (value === undefined) continue;
        expect(result[key]).toBe(value);
      }
    },
  );

  it.each([
    {
      tdb: [25, 25],
      tr: [25, 25],
      t_running_mean: [10, 9],
      v: [0.1, 0.1],
      expected: {
        tmp_cmf: [20.9, NaN],
        tmp_cmf_80_low: [17.4, NaN],
        tmp_cmf_80_up: [24.4, NaN],
        tmp_cmf_90_low: [18.4, NaN],
        tmp_cmf_90_up: [23.4, NaN],
        acceptability_80: [false, false],
        acceptability_90: [false, false],
      },
    },
    {
      tdb: [77, 77],
      tr: [77, 77],
      t_running_mean: [68, 48],
      v: [0.3, 0.3],
      units: "IP",
      expected: {
        tmp_cmf: [75.2, NaN],
        tmp_cmf_80_low: [68.9, NaN],
        tmp_cmf_80_up: [81.5, NaN],
        tmp_cmf_90_low: [70.7, NaN],
        tmp_cmf_90_up: [79.7, NaN],
        acceptability_80: [true, false],
        acceptability_90: [true, false],
      },
    },
  ])(
    "returns $expected when tdb is $tdb, tr is $tr, t_running_mean is $t_running_mean, v is $v and units is $units",
    ({ tdb, tr, t_running_mean, v, units, expected }) => {
      const result = adaptive_ashrae_array(tdb, tr, t_running_mean, v, units);

      for (let i = 0; i < expected.tmp_cmf.length; ++i) {
        if (isNaN(expected.tmp_cmf[i])) expect(result.tmp_cmf[i]).toBeNaN();
        else expect(result.tmp_cmf[i]).toBeCloseTo(expected.tmp_cmf[i], 2);

        if (isNaN(expected.tmp_cmf_80_low[i]))
          expect(result.tmp_cmf_80_low[i]).toBeNaN();
        else
          expect(result.tmp_cmf_80_low[i]).toBeCloseTo(
            expected.tmp_cmf_80_low[i],
            2,
          );

        if (isNaN(expected.tmp_cmf_80_up[i]))
          expect(result.tmp_cmf_80_up[i]).toBeNaN();
        else
          expect(result.tmp_cmf_80_up[i]).toBeCloseTo(
            expected.tmp_cmf_80_up[i],
            2,
          );

        if (isNaN(expected.tmp_cmf_90_low[i]))
          expect(result.tmp_cmf_90_low[i]).toBeNaN();
        else
          expect(result.tmp_cmf_90_low[i]).toBeCloseTo(
            expected.tmp_cmf_90_low[i],
            2,
          );

        if (isNaN(expected.tmp_cmf_90_up[i]))
          expect(result.tmp_cmf_90_up[i]).toBeNaN();
        else
          expect(result.tmp_cmf_90_up[i]).toBeCloseTo(
            expected.tmp_cmf_90_up[i],
            2,
          );

        expect(result.acceptability_80[i]).toBe(expected.acceptability_80[i]);
        expect(result.acceptability_90[i]).toBe(expected.acceptability_90[i]);
      }
    },
  );
});
