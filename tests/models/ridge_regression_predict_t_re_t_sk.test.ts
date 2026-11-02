import { describe, expect, test } from "vitest";
import { ridge_regression_predict_t_re_t_sk } from "../../src/models/index.ts";
import {
  _inverse_scale_output,
  _scale_features,
  RIDGE_REGRESSION_PREDICT_T_RE_T_SK_INFO,
} from "../../src/models/ridge_regression_predict_t_re_t_sk.ts";
import { Sex } from "../../src/utilities/index.ts";
import { approx } from "./testUtils.ts";

const call = (inputs: unknown) =>
  ridge_regression_predict_t_re_t_sk(
    inputs as Parameters<typeof ridge_regression_predict_t_re_t_sk>[0],
  );

// np.testing.assert_allclose(actual, desired, rtol=1e-6), whose atol is 0.
const allclose = (actual: readonly number[], expected: readonly number[]) =>
  actual.length === expected.length &&
  actual.every((x, i) => approx(x, expected[i] ?? NaN, { rel: 1e-6, abs: 0 }));

// Mirrors pythermalcomfort v4.7.0
// tests/data_driven/test_ridge_regression_body_temperature_predictor.py.
describe("test_ridge_regression_body_temperature_predictor", () => {
  // The private functions through the model's own file (S2), as upstream
  // imports them; each takes one scenario's row.
  test("test_ridge_regression_scale_features", () => {
    const scaled = _scale_features([0, 30, 180, 75, 25, 50, 37.0, 34.0]);
    expect(scaled).toHaveLength(8);
    const expected = [
      0.0, 0.18032787, 0.72916667, 0.34182563, 0.16666667, 1.0, 0.49972339,
      0.6549385,
    ];
    expect(allclose(scaled, expected)).toBe(true);
  });

  test("test_ridge_regression_inverse_scale_output", () => {
    const inversed = _inverse_scale_output([0.54714297, 0.51841453]);
    expect(inversed).toHaveLength(2);
    expect(allclose(inversed, [37.15, 32.15])).toBe(true);
  });

  test.each([
    ["Sex.male", Sex.male],
    ["Sex.male.value", "male"],
  ])("test_ridge_regression_scalar_parametrised[%s]", (_, sex_in) => {
    const duration = 540;
    const result = call({
      sex: sex_in,
      age: 60,
      height: 1.8,
      weight: 75,
      tdb: 35,
      rh: 60,
      duration,
    });
    expect(Array.isArray(result.t_re)).toBe(true);
    expect(result.t_re).toHaveLength(duration);
    expect(Array.isArray(result.t_sk)).toBe(true);
    expect(result.t_sk).toHaveLength(duration);

    expect(approx(result.t_re.at(-1) ?? NaN, 38.15, { abs: 1e-2 })).toBe(true);
    expect(approx(result.t_sk.at(-1) ?? NaN, 37.02, { abs: 1e-2 })).toBe(true);
  });

  // Upstream's list case, run element-wise (deviation _shared-5).
  test.each([
    ["male", 60, 1.8, 75, 35, 60, 38.15, 37.02],
    ["female", 65, 1.65, 60, 40, 50, 38.53, 38.04],
  ] as const)(
    "test_ridge_regression_vectorized: %s, age %s",
    (sex, age, height, weight, tdb, rh, final_t_re, final_t_sk) => {
      const duration = 540;
      const result = call({ sex, age, height, weight, tdb, rh, duration });
      expect(result.t_re).toHaveLength(duration);
      expect(result.t_sk).toHaveLength(duration);

      expect(approx(result.t_re.at(-1) ?? NaN, final_t_re, { abs: 1e-2 })).toBe(
        true,
      );
      expect(approx(result.t_sk.at(-1) ?? NaN, final_t_sk, { abs: 1e-2 })).toBe(
        true,
      );
    },
  );

  // Upstream's broadcast case, run element-wise (deviation _shared-5).
  test.each([
    ["male", 30, 37.84, 35.92],
    ["female", 35, 38.26, 37.02],
  ] as const)(
    "test_ridge_regression_broadcasting: %s, tdb %s",
    (sex, tdb, final_t_re, final_t_sk) => {
      const duration = 540;
      const result = call({
        sex,
        age: 75,
        height: 1.7,
        weight: 70,
        tdb,
        rh: 50,
        duration,
      });
      expect(result.t_re).toHaveLength(duration);
      expect(result.t_sk).toHaveLength(duration);

      expect(approx(result.t_re.at(-1) ?? NaN, final_t_re, { abs: 1e-2 })).toBe(
        true,
      );
      expect(approx(result.t_sk.at(-1) ?? NaN, final_t_sk, { abs: 1e-2 })).toBe(
        true,
      );
    },
  );

  test.todo(
    "test_ridge_regression_broadcasting: inputs not broadcastable to a common shape cannot arise, since the model takes scalars (deviation _shared-5)",
  );

  test("test_ridge_regression_initial_body_temp", () => {
    const duration = 60;
    const result = call({
      sex: Sex.male,
      age: 70,
      height: 1.8,
      weight: 75,
      tdb: 35,
      rh: 60,
      duration,
      t_re: 37.0,
      t_sk: 32.0,
    });
    expect(Array.isArray(result.t_re)).toBe(true);
    expect(result.t_re).toHaveLength(duration);
    expect(Array.isArray(result.t_sk)).toBe(true);
    expect(result.t_sk).toHaveLength(duration);

    expect(approx(result.t_re.at(-1) ?? NaN, 37.33, { abs: 1e-2 })).toBe(true);
    expect(approx(result.t_sk.at(-1) ?? NaN, 37.0, { abs: 1e-2 })).toBe(true);
  });

  test.todo(
    "test_ridge_regression_initial_t_broadcast_error: t_re and t_sk not broadcastable to the input shape cannot arise, since the model takes scalars (deviation _shared-5)",
  );

  test("test_invalid_sex", () => {
    expect(() =>
      call({
        sex: "unknown",
        age: 70,
        height: 1.8,
        weight: 75,
        tdb: 35,
        rh: 60,
        duration: 60,
      }),
    ).toThrow(RangeError);
  });

  // Deviation _shared-7.
  test.each([[NaN], [Infinity], [-Infinity]])(
    "test_non_finite_inputs[%s]",
    (bad) => {
      expect(() =>
        call({
          sex: Sex.male,
          age: 70,
          height: 1.8,
          weight: 75,
          tdb: bad,
          rh: 60,
          duration: 60,
        }),
      ).toThrow(RangeError);
    },
  );

  // Deviation ridge_regression_predict_t_re_t_sk-4.
  test.each([[0], [-5]])("test_invalid_duration[%s]", (bad_dur) => {
    expect(() =>
      call({
        sex: Sex.male,
        age: 70,
        height: 1.8,
        weight: 75,
        tdb: 35,
        rh: 60,
        duration: bad_dur,
      }),
    ).toThrow(new RangeError("Duration must be a positive integer."));
  });

  // Deviation ridge_regression_predict_t_re_t_sk-4.
  test("test_initial_t_singleton_rejected", () => {
    const base = {
      sex: Sex.male,
      age: 70,
      height: 1.8,
      weight: 75,
      tdb: 35,
      rh: 60,
      duration: 60,
    };
    expect(() => call({ ...base, t_re: 37.0 })).toThrow(
      new TypeError("Both t_re and t_sk must be provided, or neither."),
    );
    expect(() => call({ ...base, t_sk: 32.0 })).toThrow(
      new TypeError("Both t_re and t_sk must be provided, or neither."),
    );
  });

  // Deviations _shared-6 and _shared-80.
  test("test_wrong_type_duration", () => {
    const base = {
      sex: Sex.male,
      age: 70,
      height: 1.8,
      weight: 75,
      tdb: 35,
      rh: 60,
      t_sk: 32.0,
    };
    expect(() => call({ ...base, duration: true })).toThrow(TypeError);
    expect(() => call({ ...base, duration: 60.2 })).toThrow(TypeError);
  });
});

const base = {
  age: 70,
  height: 1.8,
  weight: 75,
  tdb: 35,
  rh: 60,
  duration: 60,
};
const sex_message = "sex must be one of ['male', 'female']";

// Mirrors the sex cases of pythermalcomfort v4.7.0 tests/test_choice_field.py
// through the model, whose inputs class receives sex
// (models/ridge_regression_predict_t_re_t_sk.py:330-331).
describe("test_choice_field", () => {
  const allowed = ["male", "female"];
  const final_t_re = (sex: unknown) => call({ ...base, sex }).t_re.at(-1);

  // BaseInputs skips None, and the model's own check then raises
  // (deviation ridge_regression_predict_t_re_t_sk-6).
  test("test_choice_fields_metadata_and_none[sex]", () => {
    expect(RIDGE_REGRESSION_PREDICT_T_RE_T_SK_INFO.inputs.sex.allowed).toEqual(
      allowed,
    );
    expect(() => final_t_re(null)).toThrow(
      new TypeError("Invalid input for sex. Must be one of ['male', 'female']"),
    );
  });

  // Sex.female is the string "female" (deviation _shared-81).
  test.each([
    ["scalar", allowed[0], 37.47],
    ["uppercase", "MALE", 37.47],
    ["enum", Sex.female, 37.54],
  ])(
    "test_choice_fields_preserve_valid_values[sex-%s]",
    (_, value, expected) => {
      expect(final_t_re(value)).toBe(expected);
    },
  );

  // Deviation ridge_regression_predict_t_re_t_sk-8.
  test.each([["list"], ["array"]])(
    "test_choice_fields_preserve_valid_values[sex-%s]",
    () => {
      expect(() => final_t_re(allowed)).toThrow(new TypeError(sex_message));
    },
  );

  test.todo(
    "test_choice_fields_preserve_valid_values[sex-series]: a pandas Series has no JavaScript counterpart",
  );

  test.each([
    ["scalar", "invalid", RangeError],
    ["list", [allowed[0], "invalid"], TypeError],
    ["array", [allowed[0], "invalid"], TypeError],
  ])("test_choice_fields_reject_invalid_values[sex-%s]", (_, value, error) => {
    expect(() => final_t_re(value)).toThrow(new error(sex_message));
  });
});
