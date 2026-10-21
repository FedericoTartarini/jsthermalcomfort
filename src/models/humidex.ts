import { round, validateInputs } from "../utilities/utilities.js";
import { dew_point_tmp } from "../_internal/dew_point_tmp.ts";
import { deepFreeze } from "./modelDocs.ts";
import { _check_params_object } from "../_internal/validation.ts";
import type { ClassifierBins } from "./classifierBins.ts";
import type { ApplicabilityWarning, ModelInfo } from "./modelDocs.ts";

// A type alias, as the JSDoc typedef it replaces emitted, so the result stays
// assignable to Record<string, unknown>; an interface is not. The field text
// is upstream's Humidex (pythermalcomfort/classes_return.py:312-324 at
// v4.6.2).
/**
 * @typedef {object} HumidexResult - a result set containing the humidex and
 * discomfort level.
 * @property {number} humidex - Humidex value, [°C].
 * @property {string} discomfort - Degree of comfort or discomfort as defined in Havenith and Fiala (2016).
 * @property { ApplicabilityWarning[] } warnings - Applicability bounds the call broke; see `ApplicabilityWarning`. Always empty: upstream checks no applicability range for the humidex.
 * @public
 */
export type HumidexResult = {
  humidex: number;
  discomfort: string;
  readonly warnings: ApplicabilityWarning[];
};

/**
 * The params of `humidex`: upstream's keyword parameters, quantities and
 * switches alike, with upstream's defaults (ADR 0002). Documented on the
 * function's `params`.
 */
export interface HumidexParams {
  tdb: number;
  rh: number;
  // Upstream's HumidexModels values (classes_input.py:460-462), compared
  // exactly, as upstream compares them (ADR 0007).
  model?: "rana" | "masterson";
  round_output?: boolean;
}

/**
 * Discomfort bins for the humidex (right-inclusive), in °C: upstream's edges
 * and labels (humidex.py:91-96 at v4.6.2). A value on an edge belongs to the
 * lower category:
 * - humidex <= 30: "Little or no discomfort"
 * - 30 < humidex <= 35: "Noticeable discomfort"
 * - 35 < humidex <= 40: "Evident discomfort"
 * - 40 < humidex <= 45: "Intense discomfort; avoid exertion"
 * - 45 < humidex <= 54: "Dangerous discomfort"
 * - humidex > 54: "Heat stroke probable"
 *
 * Upstream sets the category with masks, not bins, and `humidex` keeps them.
 * These bins are an addition upstream does not export (ADR 0001's second
 * reason): a consumer that draws or labels the humidex's discomfort bands
 * classifies a value with them, as with the other models' exported bins.
 * The top edge is Infinity, not a finite value as in
 * `HEAT_INDEX_STRESS_CATEGORY_BINS`, because upstream gives every humidex
 * above 54 "Heat stroke probable". The bins give NaN for a NaN or +Infinity
 * humidex, as `classifyFromBins` does for any bins, where `humidex` returns
 * "Heat stroke probable" (upstream's default, humidex.py:91).
 */
export const HUMIDEX_DISCOMFORT_BINS: Readonly<ClassifierBins> = Object.freeze({
  edges: [30, 35, 40, 45, 54, Infinity],
  labels: [
    "Little or no discomfort",
    "Noticeable discomfort",
    "Evident discomfort",
    "Intense discomfort; avoid exertion",
    "Dangerous discomfort",
    "Heat stroke probable",
  ],
  right: true,
});

/**
 * Model metadata for the humidex.
 *
 * Experimental — the shape of `ModelInfo` may change before release.
 *
 * `standards` is empty: upstream names no standard. No quantity has an
 * applicability bound, since upstream checks none and only raises for an
 * rh outside 0 to 100 % (humidex.py:70-71 at v4.6.2), so there is no
 * `HUMIDEX_LIMITS`. `discomfort` is classified by
 * `HUMIDEX_DISCOMFORT_BINS`, which give every finite humidex the category
 * the model gives it.
 *
 * @public
 */
export const HUMIDEX_INFO: ModelInfo = deepFreeze({
  name: "humidex",
  label: "Humidex",
  description:
    "How hot, humid weather is felt by the average person, with the degree of discomfort.",
  standards: [],
  inputs: {
    tdb: { unit: "°C" },
    rh: { unit: "%" },
  },
  outputs: {
    humidex: { unit: "°C" },
    discomfort: { unit: null, classifier: HUMIDEX_DISCOMFORT_BINS },
  },
});

// A non-finite number throws a TypeError here (ADR 0001, reason three), where
// upstream returns a NaN humidex with "Heat stroke probable" for a NaN or
// ±inf tdb and a NaN rh, and raises a ValueError for a ±inf rh. A boolean
// quantity, which upstream reads as 1 or 0, throws a TypeError too:
// quantities are numbers (ADR 0005). round_output is validated, as upstream
// gives it to HumidexInputs (humidex.py:61-65), whose base class requires a
// bool (classes_input.py:79, :123-129). model is declared here and checked
// below, after rh, in upstream's order (humidex.py:70-76).
const HUMIDEX_SCHEMA = {
  tdb: { type: "number" },
  rh: { type: "number" },
  model: {},
  round_output: { type: "boolean" },
};

// ADR 0013. Upstream's docstring example says
// `humidex(tdb=[25, 30], rh=[50, 60], round_output=False)` prints
// `[28.2, 39.1]` (humidex.py:55-56); upstream 4.6.2 returns
// [28.227037412839586, 38.55535958479931]. The example below is that call for
// the second point, as this function takes scalars (ADR 0005).
/**
 * Calculates the humidex (short for "humidity index"). It has been
 * developed by the Canadian Meteorological service. It was introduced in 1965
 * and then it was revised by Masterson and Richardson (1979) {@link #ref_14|[14]}. It aims
 * to describe how hot, humid weather is felt by the average person. The
 * Humidex differs from the heat index in being related to the dew point
 * rather than relative humidity {@link #ref_15|[15]}.
 *
 * @public
 * @memberof models
 * @docname Humidex
 *
 * @param {Object} params - the model's parameters, named as in pythermalcomfort.
 * @param {number} params.tdb - Dry bulb air temperature, [°C].
 * @param {number} params.rh - Relative humidity, [%].
 * @param {"rana" | "masterson"} [params.model="rana"] - The model to be used for the calculation. Options are 'rana' and 'masterson'. Defaults to 'rana'.
 *
 * Note: The 'rana' model is the Humidex model proposed by [Rana et al. (2013)](https://doi.org/10.1016/j.enbuild.2013.04.019).
 * The 'masterson' model is the Humidex model proposed by Masterson and Richardson (1979) {@link #ref_14|[14]}.
 *
 * @param {boolean} [params.round_output=true] - If True, rounds output value. If False, it does not round it. Defaults to True.
 *
 * @throws {RangeError} when `rh` is outside [0, 100].
 * @throws {Error} when `model` is neither 'rana' nor 'masterson'.
 *
 * @returns {HumidexResult} the humidex and its discomfort category.
 *
 * @example
 * const result = humidex({ tdb: 25, rh: 50 });
 * console.log(result.humidex); // 28.2
 * console.log(result.discomfort); // Little or no discomfort
 *
 * @example
 * const result = humidex({ tdb: 30, rh: 60, round_output: false });
 * console.log(result.humidex); // 38.55535958479931
 * console.log(result.discomfort); // Evident discomfort
 */
export function humidex(params: HumidexParams): HumidexResult {
  // tdb and rh were positional before v2 (ADR 0002); a call still written
  // that way fails here, naming the shape it should have. So does an unknown
  // key (ADR 0008).
  _check_params_object(params, "humidex", HUMIDEX_SCHEMA);
  const { tdb, rh } = params;
  // Destructuring defaults also apply to a default passed as undefined.
  const { model = "rana", round_output = true } = params;
  validateInputs({ tdb, rh, round_output }, HUMIDEX_SCHEMA);

  if (rh > 100 || rh < 0) {
    throw new RangeError("Relative humidity must be between 0 and 100%");
  }

  // Upstream looks model up in a dict (humidex.py:73), which raises a
  // TypeError for an unhashable list or dict, and a ValueError for any other
  // value that is not a member (ADR 0012: Error).
  if (typeof model === "object" && model !== null) {
    throw new TypeError(
      `unhashable type: '${Array.isArray(model) ? "list" : "dict"}'`,
    );
  }
  if (model !== "rana" && model !== "masterson") {
    throw new Error(
      "Invalid model. The model must be either 'rana' or 'masterson'",
    );
  }

  let hi =
    tdb +
    (5 / 9) * ((6.112 * 10 ** ((7.5 * tdb) / (237.7 + tdb)) * rh) / 100 - 10);
  if (model === "masterson") {
    // ADR 0004 names the humidex at rh 0 among the disputed values that
    // follow upstream: the dew point there is NaN, and so is the humidex,
    // which upstream classifies as "Heat stroke probable" below.
    // ADR 0009: Math.exp and Math.log here and in dew_point_tmp differ from
    // numpy's by an ulp on some arguments. In a 54,642-case sweep against
    // upstream 4.6.2, 316 of 11,854 unrounded Masterson results were not
    // bit-identical, by at most 4.0e-13 (tdb 78.84987885033297,
    // rh 67.42745516229786). Near a 0.05 tie such a difference can move the
    // rounded humidex by 0.1, and at a category edge the category with it:
    // at tdb 30.716639528095126, rh 40, upstream returns 35.1, "Evident
    // discomfort", and this returns 35.0, "Noticeable discomfort".
    hi =
      tdb +
      (5 / 9) *
        (6.11 *
          Math.exp(
            5417.753 * (1 / 273.15 - 1 / (dew_point_tmp(tdb, rh) + 273.15)),
          ) -
          10);
  }

  // np.around(hi, 1) (humidex.py:88-89): round is half to even.
  if (round_output) {
    hi = round(hi, 1);
  }

  // Classified after rounding, as upstream does (:88-96). Every comparison
  // is false for NaN, so a NaN humidex keeps the default, as upstream's
  // np.full_like does.
  let discomfort = "Heat stroke probable";
  if (hi <= 30) {
    discomfort = "Little or no discomfort";
  } else if (hi <= 35) {
    discomfort = "Noticeable discomfort";
  } else if (hi <= 40) {
    discomfort = "Evident discomfort";
  } else if (hi <= 45) {
    discomfort = "Intense discomfort; avoid exertion";
  } else if (hi <= 54) {
    discomfort = "Dangerous discomfort";
  }

  // The consumer contract's rows (ADR 0001): upstream checks no applicability
  // range here and emits no UserWarning, so there is never a row.
  const warnings: ApplicabilityWarning[] = [];

  return { humidex: hi, discomfort, warnings };
}
