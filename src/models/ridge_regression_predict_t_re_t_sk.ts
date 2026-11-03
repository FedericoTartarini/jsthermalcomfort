// Ridge regression model for predicting rectal and skin temperature.
//
// Based on fold 1 from Forbes et al. (2025), doi:10.1016/j.jtherbio.2025.104078. Trained
// on adults aged 60-100 in minimal clothing under stationary conditions. Uses Min-Max
// scaling on features and outputs.

import { BASE_INPUTS_SEX, parseInputs } from "../_internal/define.ts";
import { buildOutputs, deepFreeze } from "../_internal/modelInfo.ts";
import type {
  InputsOf,
  ModelInfo,
  ModelWarning,
  OutputsOf,
} from "../_internal/modelInfo.ts";
import { round } from "../_internal/round.ts";
import { _valid_range } from "../_internal/validation.ts";
import { Sex } from "../utilities/options.ts";

// --- Model Constants ---

// Minimum values for each of the 8 input features, used for Min-Max scaling.
const _FEATURES_SCALER_OFFSET = [
  0.0, // sex
  -0.3114754098360656, // age
  -3.020833333333333, // height
  -0.6183587248751761, // weight
  -1.222222222222222, // tdb
  -0.21951219512195122, // rh
  -11.197107405358395, // t_re
  -2.105553500973682, // t_sk
] as const;

// Scaling factors (1 / (max - min)) for each of the 8 input features, used for Min-Max scaling.
const _FEATURES_SCALER_SCALE = [
  1.0, // sex
  0.01639344262295082, // age
  0.020833333333333332, // height
  0.012802458071949815, // weight
  0.05555555555555555, // tdb
  0.024390243902439025, // rh
  0.31613056192207334, // t_re
  0.08119094120192633, // t_sk
] as const;

// Minimum values for the 2 output variables (Rectal Temp, Mean Skin Temp), used for inverse scaling.
const _OUTPUT_SCALER_OFFSET = [
  -11.197107405358395, // t_re
  -2.0197777680408033, // t_sk
] as const;

// Scaling factors (1 / (max - min)) for the 2 output variables, used for inverse scaling.
const _OUTPUT_SCALER_SCALE = [
  0.31613056192207334, // t_re
  0.07894843838015173, // t_sk
] as const;

// Coefficients for the Rectal Temperature (t_re) ridge regression model.
// Corresponds to the 8 input features in order.
const _T_RE_COEFFS = [
  0.00016261586852849347, // sex
  0.0007368142143779594, // age
  -0.00043916987857211637, // height
  0.00046532701146677997, // weight
  0.0008443934806620367, // tdb
  0.0006663379066237714, // rh
  0.9932810428489056, // t_re (previous)
  0.006016233208250791, // t_sk (previous)
] as const;
// Intercept term for the Rectal Temperature (t_re) ridge regression model.
const _T_RE_INTERCEPT = -0.0013528489525256315;

// Coefficients for the Mean Skin Temperature (t_sk) ridge regression model.
// Corresponds to the 8 input features in order.
const _T_SK_COEFFS = [
  0.0006157845452869151, // sex
  0.00014854705372386215, // age
  -0.0004329826169348138, // height
  -0.0011471088118388912, // weight
  0.018904677058503336, // tdb
  0.003188995712763656, // rh
  -0.0010477636196332153, // t_re (previous)
  0.933918210580563, // t_sk (previous)
] as const;
// Intercept term for the Mean Skin Temperature (t_sk) ridge regression model.
const _T_SK_INTERCEPT = 0.04356328728329839;

// Thermoneutral baseline configuration
const _BASELINE_DURATION = 120; // minutes
const _THERMONEUTRAL_TDB = 23.0; // °C
const _THERMONEUTRAL_RH = 50.0; // %
const _BASELINE_T_RE_INITIAL = 37.0; // °C, initial rectal temperature for baseline
const _BASELINE_T_SK_INITIAL = 32.0; // °C, initial skin temperature for baseline

export const RIDGE_REGRESSION_PREDICT_T_RE_T_SK_INFO = deepFreeze({
  name: "ridge_regression_predict_t_re_t_sk",
  label: "Ridge Regression Body Temperature Prediction",
  standards: [],
  inputs: {
    sex: BASE_INPUTS_SEX,
    age: {
      kind: "numeric",
      unit: "years",
      applicability: { min: 60, max: 100 },
    },
    height: { kind: "numeric", unit: "m" },
    weight: {
      kind: "numeric",
      unit: "kg",
      applicability: { min: 40, max: 140 },
    },
    tdb: { kind: "numeric", unit: "°C", applicability: { min: 0, max: 60 } },
    rh: { kind: "numeric", unit: "%", applicability: { min: 0, max: 100 } },
    duration: { kind: "numeric", unit: "min", integer: true },
    t_re: { kind: "numeric", unit: "°C", default: null },
    t_sk: { kind: "numeric", unit: "°C", default: null },
    limit_inputs: { kind: "bool", default: true },
    round_output: { kind: "bool", default: true },
  },
  outputs: {
    t_re: { kind: "numeric", nullable: true, unit: "°C", series: true },
    t_sk: { kind: "numeric", nullable: true, unit: "°C", series: true },
  },
  derived: {
    height: { unit: "cm", applicability: { min: 130, max: 230 } },
  },
} as const satisfies ModelInfo);

/** @interface */
export type RidgeRegressionInputs = InputsOf<
  typeof RIDGE_REGRESSION_PREDICT_T_RE_T_SK_INFO
>;

/**
 * Dataclass for returning predicted temperature history.
 *
 * @interface
 */
export type PredictedBodyTemperatures = OutputsOf<
  typeof RIDGE_REGRESSION_PREDICT_T_RE_T_SK_INFO
>;

/**
 * Predicts the full history of core and skin temperature changes based on a ridge
 * regression model.
 *
 * This model simulates the rectal (t_re) and mean skin (t_sk)
 * temperatures by first establishing a baseline in a thermoneutral environment
 * (23°C, 50% RH for 120 mins) and then simulating exposure to the specified
 * environmental conditions for `duration`. If a `t_re` and
 * `t_sk` are provided, then the initial 120 min simulation is skipped.
 * Coefficients are taken from fold one from the study [Forbes2025](../../docs/references.md#forbes2025)
 * (https://doi.org/10.1016/j.jtherbio.2025.104078). See notes documentation
 * for limitations with this model.
 *
 * @param inputs
 * @param inputs.sex - Biological sex. Pass the enum instance (e.g., `Sex.male`)
 * or its string value (e.g., `Sex.male.value` or `"male"`).
 * @param inputs.age - Age, in years.
 * @param inputs.height - Body height in meters [m].
 * @param inputs.weight - Body weight in kilograms [kg].
 * @param inputs.tdb - Ambient (dry bulb) air temperature, in °C.
 * @param inputs.rh - Relative humidity, in %.
 * @param inputs.duration - Duration of the simulation in the specified environment, in minutes.
 * @param inputs.t_re - Initial rectal temperature (°C). If provided, the baseline simulation
 * at 23°C, 50% RH for 120 minutes is skipped, and this value is used
 * as the starting rectal temperature for the main simulation.
 * @param inputs.t_sk - Initial mean skin temperature (°C). If provided, the baseline simulation
 * at 23°C, 50% RH for 120 minutes is skipped, and this value is used
 * as the starting mean skin temperature for the main simulation.
 * @param inputs.limit_inputs - If True, limits the inputs to the standard applicability limits. Defaults to True.
 * @param inputs.round_output - If True, rounds outputs to 2 decimal places; otherwise leaves full precision.
 * Defaults to True.
 *
 * @returns A dataclass containing the predicted rectal (`t_re`) and skin (`t_sk`)
 * temperature history in °C. See
 * {@link PredictedBodyTemperatures}
 * for more details. The outputs are numpy arrays. For scalar inputs, the shape
 * is (`duration`,).
 *
 * - `t_re` - Predicted rectal temperature history.
 *   - If scalar inputs are provided, this is a 1D array of shape (`duration`,).
 * - `t_sk` - Predicted mean skin temperature history.
 *   - If scalar inputs are provided, this is a 1D array of shape (`duration`,).
 *
 * @throws `RangeError` If sex contains invalid values (must be "male"/"female" or Sex enum members).
 * @throws `TypeError` If only one of t_re or t_sk is provided.
 *
 * @remarks
 * The model is applicable for adults aged between 60 and 100 years. The ranges for
 * the input parameters are:
 *
 * - **Age**: 60 to 100 years
 * - **Height**: 1.30 to 2.30 m
 * - **Weight**: 40 to 140 kg
 * - **Ambient Temperature**: 0 to 60 °C
 * - **Relative Humidity**: 0 to 100 %
 *
 * If inputs fall outside applicability limits and `limit_inputs=True`, the
 * corresponding output time series are filled with NaN for all time steps.
 *
 * The model does not have inputs such as: air velocity, radiative heat transfer,
 * clothing level and an individual's activity level due to there being little
 * variation in the dataset.
 *
 * All individuals in the dataset were in minimal clothing while stationary in a
 * heat chamber, therefore stationary individuals in minimal clothing are best
 * represented by this model.
 *
 * @example
 * ```ts
 * import { ridge_regression_predict_t_re_t_sk } from "jsthermalcomfort/models";
 * import { Sex } from "jsthermalcomfort/utilities";
 *
 * // Scalar example for a single person
 * const results = ridge_regression_predict_t_re_t_sk({
 *   sex: Sex.male,
 *   age: 60,
 *   height: 1.8,
 *   weight: 75,
 *   tdb: 35,
 *   rh: 60,
 *   duration: 540,
 * });
 *
 * console.log(`Final Rectal temp: ${results.t_re.at(-1)?.toFixed(2)}°C`); // Final Rectal temp: 38.15°C
 * console.log(`Final Skin temp: ${results.t_sk.at(-1)?.toFixed(2)}°C`); // Final Skin temp: 37.02°C
 *
 * // Vectorized example for multiple scenarios
 * const results_vec = [
 *   { sex: Sex.male, age: 60, height: 1.8, weight: 75, tdb: 35, rh: 60 },
 *   { sex: Sex.female, age: 65, height: 1.65, weight: 60, tdb: 40, rh: 50 },
 * ].map((inputs) =>
 *   ridge_regression_predict_t_re_t_sk({ ...inputs, duration: 540 }),
 * );
 *
 * console.log("Final rectal temps:", results_vec.map((r) => r.t_re.at(-1))); // Final rectal temps: [ 38.15, 38.53 ]
 * console.log("Rectal temp history shape:", [results_vec.length, results_vec[0]?.t_re.length]); // Rectal temp history shape: [ 2, 540 ]
 * ```
 */
export function ridge_regression_predict_t_re_t_sk(
  inputs: RidgeRegressionInputs,
): PredictedBodyTemperatures {
  // Validate inputs
  let {
    sex,
    age,
    height,
    weight,
    tdb,
    rh,
    duration,
    t_re,
    t_sk,
    limit_inputs,
    round_output,
  } = parseInputs(RIDGE_REGRESSION_PREDICT_T_RE_T_SK_INFO, inputs);
  if (duration <= 0) {
    throw new RangeError("Duration must be a positive integer.");
  }
  if ((t_re === null) !== (t_sk === null)) {
    throw new TypeError("Both t_re and t_sk must be provided, or neither.");
  }
  if (rh < 0 || rh > 100) {
    throw new RangeError("Relative humidity (rh) must be between 0 and 100%.");
  }
  for (const [param_name, value] of [
    ["age", age],
    ["height", height],
    ["weight", weight],
  ] as const) {
    if (value <= 0) {
      throw new RangeError(`${param_name} must be a positive value.`);
    }
  }

  // Convert height from m to cm, handling both scalar and list-like inputs
  const height_cm = height * 100;

  // Convert sex (enum or string) to string values and then 0/1 encoding
  // The parse leaves only null for upstream's check (deviation ridge_regression_predict_t_re_t_sk-6).
  if (sex === null) {
    throw new TypeError(
      "Invalid input for sex. Must be one of ['male', 'female']",
    );
  }
  // 1 for female, 0 for male
  const sex_value = sex.trim().toLowerCase() === Sex.female ? 1 : 0;

  const warnings: ModelWarning[] = [];
  const [age_valid, height_valid, weight_valid, temp_valid, rh_valid] =
    _check_ridge_regression_compliance(
      age,
      height_cm,
      weight,
      tdb,
      rh,
      warnings,
    );

  let current_t_re: number;
  let current_t_sk: number;
  if (t_re !== null && t_sk !== null) {
    // Use provided baseline temperatures
    current_t_re = t_re;
    current_t_sk = t_sk;
  } else {
    // Baseline simulation (120 mins in a neutral environment)
    t_re = _BASELINE_T_RE_INITIAL;
    t_sk = _BASELINE_T_SK_INITIAL;

    const baseline_features = [
      sex_value, // sex
      age, // age
      height_cm, // height
      weight, // weight
      _THERMONEUTRAL_TDB, // tdb
      _THERMONEUTRAL_RH, // relative humidity
      t_re,
      t_sk,
    ] as const;

    const [baseline_t_re_hist, baseline_t_sk_hist] =
      _predict_temperature_simulation(baseline_features, _BASELINE_DURATION);
    current_t_re = baseline_t_re_hist.at(-1) ?? NaN;
    current_t_sk = baseline_t_sk_hist.at(-1) ?? NaN;
  }

  // Final simulation in specified environment
  const final_features = [
    sex_value, // sex
    age, // age
    height_cm, // height
    weight, // weight
    tdb, // tdb
    rh, // humidity
    current_t_re,
    current_t_sk,
  ] as const;

  let [final_t_re_hist, final_t_sk_hist] = _predict_temperature_simulation(
    final_features,
    duration,
  );

  if (limit_inputs) {
    const all_valid = !(
      Number.isNaN(age_valid) ||
      Number.isNaN(height_valid) ||
      Number.isNaN(weight_valid) ||
      Number.isNaN(temp_valid) ||
      Number.isNaN(rh_valid)
    );
    // Apply validity mask across the time dimension
    final_t_re_hist = final_t_re_hist.map((x) => (all_valid ? x : NaN));
    final_t_sk_hist = final_t_sk_hist.map((x) => (all_valid ? x : NaN));
  }

  if (round_output) {
    final_t_re_hist = final_t_re_hist.map((x) => round(x, 2));
    final_t_sk_hist = final_t_sk_hist.map((x) => round(x, 2));
  }

  return buildOutputs(
    RIDGE_REGRESSION_PREDICT_T_RE_T_SK_INFO,
    { t_re: final_t_re_hist, t_sk: final_t_sk_hist },
    warnings,
  );
}

type Features = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

/** Scales input features using predefined scaling constants. */
export function _scale_features(features: Features): Features {
  return [
    features[0] * _FEATURES_SCALER_SCALE[0] + _FEATURES_SCALER_OFFSET[0],
    features[1] * _FEATURES_SCALER_SCALE[1] + _FEATURES_SCALER_OFFSET[1],
    features[2] * _FEATURES_SCALER_SCALE[2] + _FEATURES_SCALER_OFFSET[2],
    features[3] * _FEATURES_SCALER_SCALE[3] + _FEATURES_SCALER_OFFSET[3],
    features[4] * _FEATURES_SCALER_SCALE[4] + _FEATURES_SCALER_OFFSET[4],
    features[5] * _FEATURES_SCALER_SCALE[5] + _FEATURES_SCALER_OFFSET[5],
    features[6] * _FEATURES_SCALER_SCALE[6] + _FEATURES_SCALER_OFFSET[6],
    features[7] * _FEATURES_SCALER_SCALE[7] + _FEATURES_SCALER_OFFSET[7],
  ];
}

/** Apply inverse scaling to the model output. */
export function _inverse_scale_output(
  scaled_output: readonly [number, number],
): [number, number] {
  return [
    (scaled_output[0] - _OUTPUT_SCALER_OFFSET[0]) / _OUTPUT_SCALER_SCALE[0],
    (scaled_output[1] - _OUTPUT_SCALER_OFFSET[1]) / _OUTPUT_SCALER_SCALE[1],
  ];
}

/** Core simulation loop for temperature prediction. */
function _predict_temperature_simulation(
  features: Features,
  duration: number,
): [number[], number[]] {
  // Scale input features
  const scaled_features = _scale_features(features);

  // Precompute static components of the regression
  const static_t_re =
    scaled_features[0] * _T_RE_COEFFS[0] +
    scaled_features[1] * _T_RE_COEFFS[1] +
    scaled_features[2] * _T_RE_COEFFS[2] +
    scaled_features[3] * _T_RE_COEFFS[3] +
    scaled_features[4] * _T_RE_COEFFS[4] +
    scaled_features[5] * _T_RE_COEFFS[5] +
    _T_RE_INTERCEPT;
  const static_t_sk =
    scaled_features[0] * _T_SK_COEFFS[0] +
    scaled_features[1] * _T_SK_COEFFS[1] +
    scaled_features[2] * _T_SK_COEFFS[2] +
    scaled_features[3] * _T_SK_COEFFS[3] +
    scaled_features[4] * _T_SK_COEFFS[4] +
    scaled_features[5] * _T_SK_COEFFS[5] +
    _T_SK_INTERCEPT;

  // Initialize temperatures from scaled features
  let prev_t_re = scaled_features[6];
  let prev_t_sk = scaled_features[7];

  // Store history of temperatures
  const t_re_history_scaled: number[] = [];
  const t_sk_history_scaled: number[] = [];

  // Run simulation
  for (let i = 0; i < duration; i++) {
    const new_t_re =
      static_t_re + _T_RE_COEFFS[6] * prev_t_re + _T_RE_COEFFS[7] * prev_t_sk;
    const new_t_sk =
      static_t_sk + _T_SK_COEFFS[6] * prev_t_re + _T_SK_COEFFS[7] * prev_t_sk;
    [prev_t_re, prev_t_sk] = [new_t_re, new_t_sk];

    t_re_history_scaled[i] = new_t_re;
    t_sk_history_scaled[i] = new_t_sk;
  }

  // Stack as (n_scenarios, duration, 2) and inverse-scale via broadcasting
  const inv = t_re_history_scaled.map((t_re_scaled, i) =>
    _inverse_scale_output([t_re_scaled, t_sk_history_scaled[i] ?? NaN]),
  );
  const t_re_history = inv.map((step) => step[0]);
  const t_sk_history = inv.map((step) => step[1]);

  return [t_re_history, t_sk_history];
}

/**
 * Check if the inputs are within the model's applicability limits.
 *
 * @param age - Age in years.
 * @param height - Body height in cm.
 * @param weight - Body weight in kg.
 * @param tdb - Ambient air temperature in °C.
 * @param rh - Relative humidity in %.
 *
 * @returns Five arrays with valid values preserved and out-of-range values set to NaN:
 * (age_valid, height_valid, weight_valid, temp_valid, rh_valid).
 */
function _check_ridge_regression_compliance(
  age: number,
  height: number,
  weight: number,
  tdb: number,
  rh: number,
  warnings: ModelWarning[],
): [number, number, number, number, number] {
  const { inputs, derived } = RIDGE_REGRESSION_PREDICT_T_RE_T_SK_INFO;
  const age_valid = _valid_range(
    age,
    inputs.age.applicability,
    "age",
    "input",
    inputs.age.unit,
    warnings,
  );
  const height_valid = _valid_range(
    height,
    derived.height.applicability,
    "height",
    "derived",
    derived.height.unit,
    warnings,
  );
  const weight_valid = _valid_range(
    weight,
    inputs.weight.applicability,
    "weight",
    "input",
    inputs.weight.unit,
    warnings,
  );
  const temp_valid = _valid_range(
    tdb,
    inputs.tdb.applicability,
    "tdb",
    "input",
    inputs.tdb.unit,
    warnings,
  );
  const rh_valid = _valid_range(
    rh,
    inputs.rh.applicability,
    "rh",
    "input",
    inputs.rh.unit,
    warnings,
  );
  return [age_valid, height_valid, weight_valid, temp_valid, rh_valid];
}
