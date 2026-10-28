import { describe, expect, test } from "vitest";
import { adaptive_en } from "../../src/models/index.ts";
import { testDataUrls } from "./comftest.ts";
import { approx, loadTestData, validateResult } from "./testUtils.ts";

type Inputs = Parameters<typeof adaptive_en>[0];

const { testData: reference_table, tolerances: tolerance } = await loadTestData(
  testDataUrls.adaptiveEn,
);

// Mirrors pythermalcomfort v4.7.0 tests/test_adaptive_en.py.
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
      expect(result.tmp_cmf).toBeNaN();
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
});
