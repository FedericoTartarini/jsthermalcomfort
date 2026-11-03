import { describe, expect, test } from "vitest";
import {
  ridge_regression_predict_t_re_t_sk,
  RIDGE_REGRESSION_PREDICT_T_RE_T_SK_INFO,
} from "../../src/models/index.ts";
import { ridge_regression_predict_t_re_t_sk as ridge_from_root } from "../../src/index.ts";
import {
  _inverse_scale_output,
  _scale_features,
} from "../../src/models/ridge_regression_predict_t_re_t_sk.ts";
import { Sex } from "../../src/utilities/index.ts";
import { describeModelContract } from "./modelContract.ts";
import { approx } from "./testUtils.ts";

const call = (inputs: unknown) =>
  ridge_regression_predict_t_re_t_sk(
    inputs as Parameters<typeof ridge_regression_predict_t_re_t_sk>[0],
  );

// np.testing.assert_allclose(actual, desired, rtol=1e-6), whose atol is 0.
const allclose = (actual: readonly number[], expected: readonly number[]) =>
  actual.length === expected.length &&
  actual.every((x, i) => approx(x, expected[i] ?? NaN, { rel: 1e-6, abs: 0 }));

// Mirrors pythermalcomfort v4.8.0
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

// Mirrors the sex cases of pythermalcomfort v4.8.0 tests/test_choice_field.py
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

const valid = { sex: "male", ...base };

describeModelContract(
  ridge_regression_predict_t_re_t_sk,
  RIDGE_REGRESSION_PREDICT_T_RE_T_SK_INFO,
  valid,
  { ...valid, age: 50 },
);

const exact = (
  actual: readonly (number | null)[],
  expected: readonly number[],
) => {
  expect(actual).toHaveLength(expected.length);
  for (const [i, x] of expected.entries()) expect(actual[i]).toBe(x);
};

// What upstream's tests leave out, measured on pythermalcomfort 4.7.0 in the
// parity image.
describe("ridge_regression_predict_t_re_t_sk (JS-only)", () => {
  // Bit for bit (register ridge_regression_predict_t_re_t_sk's Notes).
  test.each([
    [
      { ...valid, duration: 3, round_output: false },
      [37.15744500097326, 37.16101650307734, 37.16481157266281],
      [34.59539428828672, 34.760167348740076, 34.914036926186235],
    ],
    [{ ...valid, duration: 3 }, [37.16, 37.16, 37.16], [34.6, 34.76, 34.91]],
    [
      {
        ...valid,
        sex: "female",
        duration: 3,
        t_re: 37.5,
        t_sk: 33.0,
        round_output: false,
      },
      [37.49916322203089, 37.498762394655714, 37.4987661571505],
      [33.13729219555245, 33.404785396169665, 33.65460384911361],
    ],
    [
      { ...valid, duration: 2, t_re: 37.0, t_sk: 32.0, limit_inputs: false },
      [37.0, 37.0],
      [32.17, 32.5],
    ],
  ])("%o gives upstream's series", (inputs, t_re, t_sk) => {
    const result = call(inputs);
    exact(result.t_re, t_re);
    exact(result.t_sk, t_sk);
    expect(result.warnings).toEqual([]);
  });

  test("t_re and t_sk null take the baseline simulation, as upstream's None", () => {
    expect(call({ ...valid, duration: 2, t_re: null, t_sk: null })).toEqual(
      call({ ...valid, duration: 2 }),
    );
  });

  // Deviation ridge_regression_predict_t_re_t_sk-7.
  test("duration 1 gives series of length 1, with upstream's values", () => {
    const result = call({ ...valid, duration: 1, round_output: false });
    exact(result.t_re, [37.15744500097326]);
    exact(result.t_sk, [34.59539428828672]);
  });

  test("the series are frozen arrays", () => {
    const { t_re, t_sk } = call(valid);
    expect(Array.isArray(t_re) && Object.isFrozen(t_re)).toBe(true);
    expect(Array.isArray(t_sk) && Object.isFrozen(t_sk)).toBe(true);
  });

  // Deviations ridge_regression_predict_t_re_t_sk-2 and -3.
  const flagged = {
    ...valid,
    age: 50,
    height: 1.2,
    weight: 150,
    tdb: 61,
    duration: 2,
  };
  const { inputs, derived } = RIDGE_REGRESSION_PREDICT_T_RE_T_SK_INFO;
  const rows = [
    {
      key: "age",
      role: "input",
      value: 50,
      unit: "years",
      bound: inputs.age.applicability,
    },
    {
      key: "height",
      role: "derived",
      value: 120,
      unit: "cm",
      bound: derived.height.applicability,
    },
    {
      key: "weight",
      role: "input",
      value: 150,
      unit: "kg",
      bound: inputs.weight.applicability,
    },
    {
      key: "tdb",
      role: "input",
      value: 61,
      unit: "°C",
      bound: inputs.tdb.applicability,
    },
  ].map((row) => ({ kind: "range", ...row }));

  test("out of its limits, the gate on gives null series and upstream's rows in order", () => {
    const result = call(flagged);
    expect(result.t_re).toEqual([null, null]);
    expect(result.t_sk).toEqual([null, null]);
    expect(result.warnings).toEqual(rows);
  });

  test("with the gate off, it gives upstream's values and the same rows", () => {
    const result = call({ ...flagged, limit_inputs: false });
    exact(result.t_re, [37.35, 37.35]);
    exact(result.t_sk, [34.81, 35.3]);
    expect(result.warnings).toEqual(rows);
  });

  test("the limits are inclusive", () => {
    for (const edge of [
      { age: 60, height: 1.3, weight: 40, tdb: 0, rh: 0 },
      { age: 100, height: 2.3, weight: 140, tdb: 60, rh: 100 },
    ]) {
      const result = call({ ...valid, ...edge, duration: 2 });
      expect(result.warnings).toEqual([]);
      expect(result.t_re.every((x) => x !== null)).toBe(true);
    }
  });

  // Deviation ridge_regression_predict_t_re_t_sk-4; RidgeRegressionInputs'
  // order (classes_input.py:849-910).
  test.each([
    [
      { duration: 0, rh: 101, age: 0, t_re: 37 },
      new RangeError("Duration must be a positive integer."),
    ],
    [
      { rh: 101, age: 0, t_re: 37 },
      new TypeError("Both t_re and t_sk must be provided, or neither."),
    ],
    [
      { rh: 101, age: 0 },
      new RangeError("Relative humidity (rh) must be between 0 and 100%."),
    ],
    [
      { rh: -0.1 },
      new RangeError("Relative humidity (rh) must be between 0 and 100%."),
    ],
    [
      { age: 0, height: 0, weight: 0 },
      new RangeError("age must be a positive value."),
    ],
    [
      { height: 0, weight: 0 },
      new RangeError("height must be a positive value."),
    ],
    [{ weight: -1 }, new RangeError("weight must be a positive value.")],
    [
      { sex: null, weight: 0 },
      new RangeError("weight must be a positive value."),
    ],
  ])("%o throws upstream's message, in its order", (bad, error) => {
    expect(() => call({ ...valid, duration: 2, ...bad })).toThrow(error);
  });

  // Deviation _shared-80.
  test("a duration that is not an integer throws the library's TypeError", () => {
    expect(() => call({ ...valid, duration: 60.2 })).toThrow(
      new TypeError("duration must be an integer."),
    );
  });

  test("the root entry exports the same function", () => {
    expect(ridge_from_root).toBe(ridge_regression_predict_t_re_t_sk);
  });
});
