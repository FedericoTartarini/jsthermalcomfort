import { describe, expect, test } from "vitest";
import {
  adaptive_en,
  ADAPTIVE_EN_INFO,
  CLO_TOUT_INFO,
} from "../../src/models/index.ts";
import { adaptive_en as adaptive_en_from_root } from "../../src/index.ts";
import { test_data_urls } from "./comftest.ts";
import { describeModelContract } from "./modelContract.ts";
import { approx, loadTestData, validateResult } from "./testUtils.ts";

type Inputs = Parameters<typeof adaptive_en>[0];

const { testData: reference_table, tolerances: tolerance } = await loadTestData(
  test_data_urls.adaptiveEn,
);

// Mirrors pythermalcomfort v4.8.0 tests/test_adaptive_en.py.
// Upstream's arrays are called element-wise, and a UserWarning becomes a range row.
describe("test_adaptive_en", () => {
  test.each(reference_table.data)(
    "test_adaptive_en: fixture case %#",
    (entry) => {
      const { inputs, outputs } = entry;
      const result = adaptive_en(inputs as unknown as Inputs);

      validateResult(result, outputs, tolerance, inputs);
    },
  );

  test("test_adaptive_en_running_mean_limits", () => {
    for (const [t_running_mean, tmp_cmf] of [
      [10, 22.1],
      [30, 28.7],
    ] as const) {
      const result = adaptive_en({ tdb: 25, tr: 25, t_running_mean, v: 0.1 });
      expect(approx(result.tmp_cmf, tmp_cmf, { rel: 1e-7, abs: 0 })).toBe(true);
    }

    for (const t_running_mean of [9.9, 30.1, 33]) {
      const result = adaptive_en({ tdb: 25, tr: 25, t_running_mean, v: 0.1 });
      expect(result.warnings).toEqual([
        expect.objectContaining({ key: "t_running_mean" }),
      ]);
      expect(result.tmp_cmf).toBe(null);
    }

    const result = adaptive_en({
      tdb: 25,
      tr: 25,
      t_running_mean: 33,
      v: 0.1,
      limit_inputs: false,
    });
    expect(approx(result.tmp_cmf, 29.7, { rel: 1e-5, abs: 1e-8 })).toBe(true);
  });

  test("test_ashrae_inputs_invalid_units", () => {
    expect(() =>
      adaptive_en({
        tdb: 25,
        tr: 25,
        t_running_mean: 20,
        v: 0.1,
        units: "INVALID",
      } as unknown as Inputs),
    ).toThrow(RangeError);
  });

  test("test_ashrae_inputs_invalid_tdb_type", () => {
    expect(() =>
      adaptive_en({
        tdb: "invalid",
        tr: 25,
        t_running_mean: 20,
        v: 0.1,
      } as unknown as Inputs),
    ).toThrow(TypeError);
  });

  test("test_ashrae_inputs_invalid_tr_type", () => {
    expect(() =>
      adaptive_en({
        tdb: 25,
        tr: "invalid",
        t_running_mean: 20,
        v: 0.1,
      } as unknown as Inputs),
    ).toThrow(TypeError);
  });

  test("test_ashrae_inputs_invalid_t_running_mean_type", () => {
    expect(() =>
      adaptive_en({
        tdb: 25,
        tr: 25,
        t_running_mean: "invalid",
        v: 0.1,
      } as unknown as Inputs),
    ).toThrow(TypeError);
  });

  test("test_ashrae_inputs_invalid_v_type", () => {
    expect(() =>
      adaptive_en({
        tdb: 25,
        tr: 25,
        t_running_mean: 20,
        v: "invalid",
      } as unknown as Inputs),
    ).toThrow(TypeError);
  });

  test("test_round_output_default_preserves_behaviour", () => {
    const default_result = adaptive_en({
      tdb: 25,
      tr: 25,
      t_running_mean: 20.5,
      v: 0.1,
    });
    const explicit_result = adaptive_en({
      tdb: 25,
      tr: 25,
      t_running_mean: 20.5,
      v: 0.1,
      round_output: true,
    });

    expect(default_result.tmp_cmf).toBe(explicit_result.tmp_cmf);
    expect(default_result.tmp_cmf_cat_i_up).toBe(
      explicit_result.tmp_cmf_cat_i_up,
    );
    expect(default_result.tmp_cmf_cat_i_low).toBe(
      explicit_result.tmp_cmf_cat_i_low,
    );
    expect(default_result.tmp_cmf_cat_ii_up).toBe(
      explicit_result.tmp_cmf_cat_ii_up,
    );
    expect(default_result.tmp_cmf_cat_iii_low).toBe(
      explicit_result.tmp_cmf_cat_iii_low,
    );
  });

  test("test_round_output_false_returns_unrounded", () => {
    // 0.33 * 20.5 + 18.8 = 25.565; rounded to 1 dp this is 25.6.
    const unrounded = adaptive_en({
      tdb: 25,
      tr: 25,
      t_running_mean: 20.5,
      v: 0.1,
      round_output: false,
    });
    const rounded = adaptive_en({
      tdb: 25,
      tr: 25,
      t_running_mean: 20.5,
      v: 0.1,
      round_output: true,
    });

    expect(approx(unrounded.tmp_cmf, 25.565, { rel: 1e-5, abs: 1e-8 })).toBe(
      true,
    );
    expect(approx(rounded.tmp_cmf, 25.6, { rel: 1e-5, abs: 1e-8 })).toBe(true);
    expect(unrounded.tmp_cmf).not.toBe(rounded.tmp_cmf);

    // Bounds derive from the unrounded value when round_output=False.
    expect(
      approx(unrounded.tmp_cmf_cat_i_low, 25.565 - 3.0, {
        rel: 1e-5,
        abs: 1e-8,
      }),
    ).toBe(true);
    expect(
      approx(unrounded.tmp_cmf_cat_ii_up, 25.565 + 3.0, {
        rel: 1e-5,
        abs: 1e-8,
      }),
    ).toBe(true);
  });

  test("test_round_output_invalid_type_raises", () => {
    expect(() =>
      adaptive_en({
        tdb: 25,
        tr: 25,
        t_running_mean: 20,
        v: 0.1,
        round_output: "yes",
      } as unknown as Inputs),
    ).toThrow(TypeError);
  });

  // Upstream's [value, np.nan], element-wise; deviation _shared-7.
  test.each(["tdb", "tr", "v"] as const)(
    "test_acceptability_nan_for_nan_input[%s]",
    (nan_input) => {
      const inputs = { tdb: 25.0, tr: 25.0, t_running_mean: 20.0, v: 0.1 };
      const result = adaptive_en({ ...inputs, limit_inputs: false });
      for (const flag of [
        result.acceptability_cat_i,
        result.acceptability_cat_ii,
        result.acceptability_cat_iii,
      ])
        expect(flag).toBe(true);
      expect(() =>
        adaptive_en({ ...inputs, [nan_input]: NaN, limit_inputs: false }),
      ).toThrow(RangeError);
    },
  );
});

const neutral = { tdb: 25, tr: 25, t_running_mean: 20, v: 0.1 };

describeModelContract(adaptive_en, ADAPTIVE_EN_INFO, neutral, {
  ...neutral,
  t_running_mean: 5,
});

// What upstream's tests leave out, measured on pythermalcomfort 4.7.0 in the
// parity image, the acceptability on 4.8.0, and what only the library adds.
describe("adaptive_en (JS-only)", () => {
  // A call with inputs the type rejects, to test the runtime.
  const call = (inputs: unknown) => () => adaptive_en(inputs as Inputs);
  const masked = {
    tmp_cmf: null,
    acceptability_cat_i: null,
    acceptability_cat_ii: null,
    acceptability_cat_iii: null,
    tmp_cmf_cat_i_up: null,
    tmp_cmf_cat_ii_up: null,
    tmp_cmf_cat_iii_up: null,
    tmp_cmf_cat_i_low: null,
    tmp_cmf_cat_ii_low: null,
    tmp_cmf_cat_iii_low: null,
  };

  describe("values", () => {
    // models/adaptive_en.py:71-90.
    test("the TSDoc examples give what upstream prints", () => {
      expect(adaptive_en(neutral)).toEqual({
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
        warnings: [],
      });
      expect(
        adaptive_en({
          tdb: 77,
          tr: 77,
          t_running_mean: 68,
          v: 0.3,
          units: "IP",
        }),
      ).toEqual({
        tmp_cmf: 77.7,
        acceptability_cat_i: true,
        acceptability_cat_ii: true,
        acceptability_cat_iii: true,
        tmp_cmf_cat_i_up: 81.3,
        tmp_cmf_cat_ii_up: 83.1,
        tmp_cmf_cat_iii_up: 84.9,
        tmp_cmf_cat_i_low: 72.3,
        tmp_cmf_cat_ii_low: 70.5,
        tmp_cmf_cat_iii_low: 68.7,
        warnings: [],
      });
      expect(adaptive_en({ ...neutral, t_running_mean: 9 })).toMatchObject(
        masked,
      );
    });

    test("takes units in any case, as upstream", () => {
      const ip = { tdb: 77, tr: 77, t_running_mean: 68, v: 0.3 };
      expect(call({ ...ip, units: "ip" })()).toEqual(
        adaptive_en({ ...ip, units: "IP" }),
      );
      expect(call({ ...neutral, units: "si" })()).toEqual(adaptive_en(neutral));
    });

    test.each([
      [30, 20, 25.4],
      [17, 12, 22.8],
    ])(
      "an operative temperature of %s °C at t_running_mean %s °C is outside every category",
      (t, t_running_mean, tmp_cmf) => {
        const result = adaptive_en({ tdb: t, tr: t, t_running_mean, v: 0.1 });
        expect(result.tmp_cmf).toBe(tmp_cmf);
        expect(result.acceptability_cat_i).toBe(false);
        expect(result.acceptability_cat_ii).toBe(false);
        expect(result.acceptability_cat_iii).toBe(false);
      },
    );

    // Deviation adaptive_en-4: the increase starts at 25 °C and at each threshold speed.
    test.each([
      [25, 0.6, 1.2],
      [25, 0.9, 1.8],
      [25, 1.2, 2.2],
      [24.9, 0.6, 0.0],
    ])(
      "at an operative temperature of %s °C and v %s m/s the upper limits rise by %s °C",
      (t, v, ce) => {
        const result = adaptive_en({
          tdb: t,
          tr: t,
          t_running_mean: 20,
          v,
          round_output: false,
        });
        expect(
          approx(
            (result.tmp_cmf_cat_i_up ?? NaN) - (result.tmp_cmf ?? NaN) - 2.0,
            ce,
            {
              rel: 0,
              abs: 1e-12,
            },
          ),
        ).toBe(true);
      },
    );

    // adaptive_en(tdb=25, tr=25, t_running_mean=20, v=-0.5) gives every
    // acceptability NaN with tmp_cmf 25.4 and only numpy's RuntimeWarning on
    // 4.8.0, whatever limit_inputs is: operative_tmp's ISO square root is NaN.
    test.each([true, false])(
      "a negative v makes every acceptability null with no row, limit_inputs %s",
      (limit_inputs) => {
        const result = adaptive_en({ ...neutral, v: -0.5, limit_inputs });
        expect(result.tmp_cmf).toBe(25.4);
        expect(result.acceptability_cat_i).toBe(null);
        expect(result.acceptability_cat_ii).toBe(null);
        expect(result.acceptability_cat_iii).toBe(null);
        expect(result.warnings).toEqual([]);
      },
    );
  });

  describe("errors", () => {
    // deviation _shared-24 (classes_input.py:120)
    test("units other than SI or IP throws upstream's message", () => {
      const message = "Units must be either 'SI' or 'IP'";
      for (const bad of ["INVALID", "", "metric"])
        expect(call({ ...neutral, units: bad })).toThrow(
          new RangeError(message),
        );
      for (const bad of [null, 5, true, ["SI"]])
        expect(call({ ...neutral, units: bad })).toThrow(
          new TypeError(message),
        );
    });
  });

  // deviation adaptive_en-1
  test("ADAPTIVE_EN_INFO shares BaseInputs' units, not a copy", () => {
    expect(ADAPTIVE_EN_INFO.inputs.units).toBe(CLO_TOUT_INFO.inputs.units);
  });

  // deviation adaptive_en-2
  describe("warnings rows", () => {
    const { t_running_mean } = ADAPTIVE_EN_INFO.inputs;

    test.each([
      t_running_mean.applicability.min,
      t_running_mean.applicability.max,
    ])("no row on the bound: t_running_mean = %s", (value) => {
      const result = adaptive_en({ ...neutral, t_running_mean: value });
      expect(result.warnings).toEqual([]);
      expect(Number.isFinite(result.tmp_cmf)).toBe(true);
    });

    test.each([9.99, 30.01])(
      "one row one step outside, whose bound is ADAPTIVE_EN_INFO's: t_running_mean = %s",
      (value) => {
        const on = adaptive_en({ ...neutral, t_running_mean: value });
        expect(on.warnings).toEqual([
          {
            kind: "range",
            key: "t_running_mean",
            role: "input",
            value,
            unit: t_running_mean.unit,
            bound: t_running_mean.applicability,
          },
        ]);
        const [first] = on.warnings;
        expect(first?.kind === "range" && first.bound).toBe(
          t_running_mean.applicability,
        );
        expect(on).toMatchObject(masked);
        // deviation adaptive_en-3
        const off = adaptive_en({
          ...neutral,
          t_running_mean: value,
          limit_inputs: false,
        });
        expect(off.warnings).toEqual(on.warnings);
        expect(Number.isFinite(off.tmp_cmf)).toBe(true);
      },
    );

    // Upstream checks the converted value (models/adaptive_en.py:108-123):
    // 86.18 °F warns as 30.100000000000005 °C.
    test("under IP the row holds the SI value upstream compares", () => {
      const { warnings } = adaptive_en({
        tdb: 77,
        tr: 77,
        t_running_mean: 86.18,
        v: 0.3,
        units: "IP",
      });
      expect(warnings).toEqual([
        expect.objectContaining({
          key: "t_running_mean",
          value: 30.100000000000005,
          unit: ADAPTIVE_EN_INFO.inputs.t_running_mean.unit,
        }),
      ]);
    });
  });

  test("is exported from the package root as from its subpath", () => {
    expect(adaptive_en_from_root).toBe(adaptive_en);
  });
});
