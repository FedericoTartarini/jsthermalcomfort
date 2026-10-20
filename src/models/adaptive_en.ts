import { t_o } from "../psychrometrics/t_o.js";
import {
  units_converter,
  round,
  validateInputs,
  Standard,
} from "../utilities/utilities.js";
import { adaptive_cooling_effect } from "../_internal/adaptive_cooling_effect.ts";
import { deepFreeze } from "./modelDocs.ts";
import {
  _check_params_object,
  _upper_units,
  _valid_range,
} from "../_internal/validation.ts";
import type { ApplicabilityWarning, ModelInfo } from "./modelDocs.ts";

// Comfort temperature as a linear function of the running mean outdoor
// temperature, t_cmf = SLOPE * t_running_mean + INTERCEPT, as upstream names them.
const SLOPE = 0.33;
const INTERCEPT = 18.8;

// A type alias, as the JSDoc typedef it replaces emitted, so the result stays
// assignable to Record<string, unknown>; an interface is not.
/**
 * @typedef {object} AdaptiveEnResult - a result set containing the results for {@link #adative_en|adaptive_en}
 * @property {number} tmp_cmf - Comfort temperature at that specific running mean temperature, default in [°C] or in [°F]
 * @property {boolean} acceptability_cat_i - If the indoor conditions comply with comfort category I
 * @property {boolean} acceptability_cat_ii - If the indoor conditions comply with comfort category II
 * @property {boolean} acceptability_cat_iii - If the indoor conditions comply with comfort category III
 * @property {number} tmp_cmf_cat_i_up - Upper acceptable comfort temperature for category I, default in [°C] or in [°F]
 * @property {number} tmp_cmf_cat_ii_up - Upper acceptable comfort temperature for category II, default in [°C] or in [°F]
 * @property {number} tmp_cmf_cat_iii_up - Upper acceptable comfort temperature for category III, default in [°C] or in [°F]
 * @property {number} tmp_cmf_cat_i_low - Lower acceptable comfort temperature for category I, default in [°C] or in [°F]
 * @property {number} tmp_cmf_cat_ii_low - Lower acceptable comfort temperature for category II, default in [°C] or in [°F]
 * @property {number} tmp_cmf_cat_iii_low - Lower acceptable comfort temperature for category III, default in [°C] or in [°F]
 * @property { ApplicabilityWarning[] } warnings - Applicability bounds the call broke, whatever `limit_inputs` is; see `ApplicabilityWarning`.
 * @public
 */
export type AdaptiveEnResult = {
  tmp_cmf: number;
  acceptability_cat_i: boolean;
  acceptability_cat_ii: boolean;
  acceptability_cat_iii: boolean;
  tmp_cmf_cat_i_up: number;
  tmp_cmf_cat_ii_up: number;
  tmp_cmf_cat_iii_up: number;
  tmp_cmf_cat_i_low: number;
  tmp_cmf_cat_ii_low: number;
  tmp_cmf_cat_iii_low: number;
  readonly warnings: ApplicabilityWarning[];
};

/**
 * The params of `adaptive_en`: upstream's keyword parameters, quantities and
 * switches alike, with upstream's defaults (ADR 0002). Documented on the
 * function's `params`.
 */
export interface AdaptiveEnParams {
  tdb: number;
  tr: number;
  t_running_mean: number;
  v: number;
  units?: "SI" | "IP";
  limit_inputs?: boolean;
  round_output?: boolean;
}

/**
 * Applicability limit of the adaptive model's own input, in SI units.
 *
 * Upstream checks the running mean outdoor temperature alone, against
 * (10.0, 33.5) (adaptive_en.py:122 at v4.6.2); tdb, tr and v have no limit.
 * Frozen, referenced by identity from `ADAPTIVE_EN_INFO` and read by the gate
 * below, so the metadata and the NaN cannot disagree. Its own object, not
 * `ADAPTIVE_ASHRAE_LIMITS.t_running_mean`: the two standards' ranges agree
 * today, not by definition. Exported for that identity test, deliberately not
 * added to `src/models/index.js`.
 */
export const ADAPTIVE_EN_LIMITS = Object.freeze({
  t_running_mean: Object.freeze({ min: 10, max: 33.5 }),
});

/**
 * Model metadata for the EN 16798-1 adaptive model.
 *
 * Experimental — the shape of `ModelInfo` may change before release.
 *
 * `standards` names EN 16798-1:2019 through `Standard.en_16798_1_2019`, a
 * member upstream's `Models` enum lacks (utilities.py:23-31 at v4.6.2; ADR
 * 0003 as amended). The function takes no `standard`.
 * Only `t_running_mean` has an applicability bound. The acceptability
 * outputs are booleans, so they carry no unit and no classifier.
 *
 * @public
 */
export const ADAPTIVE_EN_INFO: ModelInfo = deepFreeze({
  name: "adaptive_en",
  label: "Adaptive (EN 16798-1)",
  description:
    "Adaptive comfort temperature and its category I, II and III acceptability ranges from the running mean outdoor temperature.",
  standards: [Standard.en_16798_1_2019],
  inputs: {
    tdb: { unit: "°C" },
    tr: { unit: "°C" },
    t_running_mean: {
      unit: "°C",
      applicability: ADAPTIVE_EN_LIMITS.t_running_mean,
    },
    v: { unit: "m/s" },
  },
  outputs: {
    tmp_cmf: { unit: "°C" },
    acceptability_cat_i: { unit: null },
    acceptability_cat_ii: { unit: null },
    acceptability_cat_iii: { unit: null },
    tmp_cmf_cat_i_up: { unit: "°C" },
    tmp_cmf_cat_ii_up: { unit: "°C" },
    tmp_cmf_cat_iii_up: { unit: "°C" },
    tmp_cmf_cat_i_low: { unit: "°C" },
    tmp_cmf_cat_ii_low: { unit: "°C" },
    tmp_cmf_cat_iii_low: { unit: "°C" },
  },
});

// A non-finite number throws a TypeError here (ADR 0001, reason three), where
// upstream returns a result for every one: NaN temperatures for a NaN
// t_running_mean, or an infinite one under limit_inputs; ±inf ones for an
// infinite t_running_mean without limit_inputs; and for a non-finite tdb, tr
// or v the comfort temperatures with nothing acceptable. A boolean quantity,
// which upstream reads as 0 or 1, and a null tdb, tr or v, which upstream
// reads as NaN in SI (in IP it raises a TypeError), throw a TypeError too:
// quantities are numbers (ADR 0005). round_output is
// validated, as upstream gives it to ENInputs (adaptive_en.py:92-99), whose
// base class requires a bool (classes_input.py:79, :123-129). limit_inputs
// is declared but not validated: ENInputs is not given it, and upstream reads
// it with `if limit_inputs:` (adaptive_en.py:121), so it is read with
// JavaScript's truth value. Python's differs on three values (ADR 0001): NaN
// is true in Python and false here, and an empty array or object is false in
// Python and true here.
const ADAPTIVE_EN_SCHEMA = {
  tdb: { type: "number" },
  tr: { type: "number" },
  t_running_mean: { type: "number" },
  v: { type: "number" },
  units: { enum: ["SI", "IP"] },
  limit_inputs: {},
  round_output: { type: "boolean" },
};

// ADR 0013. Upstream's docstring says the model can only be used "if the
// running mean temperature is between 10 °C and 30 °C" (adaptive_en.py:88-89),
// and that limit_inputs "returns NaN for inputs outside the standard
// applicability limits" (:53). Its code gates on 10 to 33.5 °C, inclusive
// (:122; _valid_range, _internal/validation.py:47), and the acceptabilities,
// compared against the NaN bounds, are False. The cooling-effect note's "above
// 25°C" and "0.6 < v < 0.9 m/s" (:46-48) are inclusive at their lower edges
// in the code (_internal/adaptive_cooling_effect.py:33-35).
/**
 * Determines the adaptive thermal comfort based on EN 16798-1 2019 {@link #ref_3|[3]}
 *
 * Note: You can use this function to calculate if your conditions are within the EN
 * adaptive thermal comfort region. Calculations with comply with the EN 16798-1 2019 {@link #ref_3|[3]}.
 *
 * @public
 * @memberof models
 * @docname Adaptive EN
 *
 * @param {Object} params - the model's parameters, named as in pythermalcomfort.
 * @param {number} params.tdb - Dry bulb air temperature, default in [°C] or [°F] if `units` = 'IP'.
 * @param {number} params.tr - Mean radiant temperature, default in [°C] or [°F] if `units` = 'IP'.
 * @param {number} params.t_running_mean - Running mean temperature, default in [°C] or [°F] if `units` = 'IP'.
 *
 * Note: The running mean temperature can be calculated using the function {@link #running_mean_outdoor_temperature|running_mean_outdoor_temperature}.
 *
 * @param {number} params.v - Air speed, default in [m/s] or [fps] if `units` = 'IP'.
 *
 * Note: Indoor operative temperature correction is applicable for buildings equipped
 * with fans or personal systems providing building occupants with personal
 * control over air speed at occupant level.
 * For operative temperatures at or above 25°C the comfort zone upper limit can be
 * increased by 1.2 °C (0.6 <= v < 0.9 m/s), 1.8 °C (0.9 <= v < 1.2 m/s), 2.2 °C (v >= 1.2 m/s).
 *
 * @param {"SI" | "IP"} [params.units="SI"] - Select the SI (International System of Units) or the IP (Imperial Units) system.
 * @param {boolean} [params.limit_inputs=true] - If True, returns NaN for the comfort temperature and its bounds, and false for
 * the acceptabilities, when the running mean temperature is outside the applicability limits, 10 <= t_running_mean [°C] <= 33.5.
 * @param {boolean} [params.round_output=true] - If True, rounds the returned comfort temperature and category bounds to one decimal
 * place in the output unit (rounding is applied after any IP unit conversion).
 * If False, returns the unrounded values.
 *
 * @returns {AdaptiveEnResult} result set
 *
 * @example
 * const results = adaptive_en({ tdb: 25, tr: 25, t_running_mean: 20, v: 0.1 });
 * console.log(results); // {tmp_cmf: 25.4, acceptability_cat_i: true, acceptability_cat_ii: true, ... }
 * console.log(results.acceptability_cat_i); // true
 * // The conditions you entered are considered to comply with Category I
 *
 * @example
 * // For users who want to use the IP system, units "IP" or "ip" are both valid
 * const results = adaptive_en({ tdb: 77, tr: 77, t_running_mean: 68, v: 0.3, units: "IP" });
 * console.log(results); // {tmp_cmf: 77.7, acceptability_cat_i: true, acceptability_cat_ii: true, ... }
 *
 * @example
 * const results = adaptive_en({ tdb: 25, tr: 25, t_running_mean: 9, v: 0.1 });
 * console.log(results); // {tmp_cmf: NaN, acceptability_cat_i: false, acceptability_cat_ii: false, ... }
 * // The adaptive thermal comfort model can only be used
 * // if the running mean temperature is between 10 °C and 33.5 °C.
 */
export function adaptive_en(params: AdaptiveEnParams): AdaptiveEnResult {
  // Every argument was positional before v2 (ADR 0002); a call still written
  // that way fails here, naming the shape it should have. So does an unknown
  // key (ADR 0008).
  _check_params_object(params, "adaptive_en", ADAPTIVE_EN_SCHEMA);
  let { tdb, tr, t_running_mean, v } = params;
  // Destructuring defaults also apply to a switch passed as undefined.
  const { units = "SI", limit_inputs = true, round_output = true } = params;
  validateInputs(
    {
      tdb,
      tr,
      t_running_mean,
      v,
      units: _upper_units(units),
      round_output,
    },
    ADAPTIVE_EN_SCHEMA,
  );

  const standard = Standard.iso_7730_2025;

  if (units.toUpperCase() === "IP") {
    ({
      tdb,
      tr,
      tmp_running_mean: t_running_mean,
      v,
    } = units_converter({ tdb, tr, tmp_running_mean: t_running_mean, v }));
  }

  const to = t_o(tdb, tr, v, standard);

  const ce = adaptive_cooling_effect(v, to);

  let t_cmf = SLOPE * t_running_mean + INTERCEPT;

  // The row is the channel for upstream's UserWarning, which JavaScript has
  // no warnings filter for (ADR 0001). Upstream checks only under
  // limit_inputs; the row is built on every call, so with the gate off it
  // says what the numbers were computed despite. The gate reads the rows.
  const warnings: ApplicabilityWarning[] = [];
  _valid_range(
    warnings,
    "t_running_mean",
    "input",
    t_running_mean,
    ADAPTIVE_EN_LIMITS.t_running_mean,
  );
  if (limit_inputs && warnings.length > 0) t_cmf = NaN;

  let t_cmf_i_lower = t_cmf - 3.0;
  let t_cmf_ii_lower = t_cmf - 4.0;
  let t_cmf_iii_lower = t_cmf - 5.0;
  let t_cmf_i_upper = t_cmf + 2.0 + ce;
  let t_cmf_ii_upper = t_cmf + 3.0 + ce;
  let t_cmf_iii_upper = t_cmf + 4.0 + ce;

  const acceptability_i = t_cmf_i_lower <= to && to <= t_cmf_i_upper;
  const acceptability_ii = t_cmf_ii_lower <= to && to <= t_cmf_ii_upper;
  const acceptability_iii = t_cmf_iii_lower <= to && to <= t_cmf_iii_upper;

  if (units.toUpperCase() === "IP") {
    ({
      tmp_cmf: t_cmf,
      tmp_cmf_cat_i_up: t_cmf_i_upper,
      tmp_cmf_cat_ii_up: t_cmf_ii_upper,
      tmp_cmf_cat_iii_up: t_cmf_iii_upper,
    } = units_converter(
      {
        tmp_cmf: t_cmf,
        tmp_cmf_cat_i_up: t_cmf_i_upper,
        tmp_cmf_cat_ii_up: t_cmf_ii_upper,
        tmp_cmf_cat_iii_up: t_cmf_iii_upper,
      },
      "SI",
    ));
    ({
      tmp_cmf_cat_i_low: t_cmf_i_lower,
      tmp_cmf_cat_ii_low: t_cmf_ii_lower,
      tmp_cmf_cat_iii_low: t_cmf_iii_lower,
    } = units_converter(
      {
        tmp_cmf_cat_i_low: t_cmf_i_lower,
        tmp_cmf_cat_ii_low: t_cmf_ii_lower,
        tmp_cmf_cat_iii_low: t_cmf_iii_lower,
      },
      "SI",
    ));
  }

  if (round_output) {
    t_cmf = round(t_cmf, 1);
    t_cmf_i_lower = round(t_cmf_i_lower, 1);
    t_cmf_ii_lower = round(t_cmf_ii_lower, 1);
    t_cmf_iii_lower = round(t_cmf_iii_lower, 1);
    t_cmf_i_upper = round(t_cmf_i_upper, 1);
    t_cmf_ii_upper = round(t_cmf_ii_upper, 1);
    t_cmf_iii_upper = round(t_cmf_iii_upper, 1);
  }

  return {
    tmp_cmf: t_cmf,
    acceptability_cat_i: acceptability_i,
    acceptability_cat_ii: acceptability_ii,
    acceptability_cat_iii: acceptability_iii,
    tmp_cmf_cat_i_up: t_cmf_i_upper,
    tmp_cmf_cat_ii_up: t_cmf_ii_upper,
    tmp_cmf_cat_iii_up: t_cmf_iii_upper,
    tmp_cmf_cat_i_low: t_cmf_i_lower,
    tmp_cmf_cat_ii_low: t_cmf_ii_lower,
    tmp_cmf_cat_iii_low: t_cmf_iii_lower,
    warnings,
  };
}
