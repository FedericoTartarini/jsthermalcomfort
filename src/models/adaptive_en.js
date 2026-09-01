import { t_o } from "../psychrometrics/t_o.js";
import {
  units_converter,
  round,
  validateInputs,
} from "../utilities/utilities.js";
import { attachModelDocs } from "./modelDocs.js";

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
 * @public
 */

/**
 * Category-band offsets from `t_cmf` [°C]. `id` matches the return-field
 * stem (`acceptability_cat_i`, `tmp_cmf_cat_i_low`). Upper bound is before `ce`.
 *
 * @type {readonly AdaptiveOffset[]}
 */
const ADAPTIVE_EN_OFFSETS = [
  { id: "cat_i", lower: -3, upper: 2 },
  { id: "cat_ii", lower: -4, upper: 3 },
  { id: "cat_iii", lower: -5, upper: 4 },
];

/** @type {RunningMeanLimits} */
const T_RUNNING_MEAN_LIMITS = { min: 10, max: 33.5 };

function offsetById(id) {
  const offset = ADAPTIVE_EN_OFFSETS.find((item) => item.id === id);
  if (!offset) {
    throw new Error(`Missing adaptive EN offset: ${id}`);
  }
  return offset;
}

/**
 * @param {number} v
 * @param {number} to
 * @returns {number}
 */
export function get_ce(v, to) {
  let ce = 0;
  if (v >= 0.6 && to >= 25.0) {
    if (v < 0.9) {
      ce = 1.2;
    } else if (v < 1.2) {
      ce = 1.8;
    } else {
      ce = 2.2;
    }
  }
  return ce;
}

/**
 * Determines the adaptive thermal comfort based on EN 16798-1 2019 {@link #ref_3|[3]}
 *
 * Note: You can use this function to calculate if your conditions are within the EN
 * adaptive thermal comfort region. Calculations with comply with the EN 16798-1 2019 {@link #ref_3|[3]}.
 *
 *
 * @public
 * @memberof models
 * @docname Adaptive EN
 *
 * @property {string} label - Display name (`@docname`)
 * @property {string} description - Leading JSDoc summary
 * @property {AdaptiveOffset[]} offsets - Category-band offsets from `t_cmf`, [°C]
 * @property {RunningMeanLimits} t_running_mean_limits - Prevailing-mean outdoor temperature applicability, [°C]
 *
 * @param {number} tdb - dry bulb air temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {number} tr - mean radiant temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {number} t_running_mean - running mean temperature, default in [°C] in [°C] in [°F] if `units` = 'IP'
 * The running mean temperature can be calculated using the function {@link #running_mean_outdoor_temperature|running_mean_outdoor_temperature}
 *
 * @param {number} v - air speed, default in [m/s] in [fps] if `units` = 'IP'
 *
 * Note: Indoor operative temperature correction is applicable for buildings equipped
 * with fans or personal systems providing building occupants with personal
 * control over air speed at occupant level.
 * For operative temperatures above 25°C the comfort zone upper limit can be
 * increased by 1.2 °C (0.6 < v < 0.9 m/s), 1.8 °C (0.9 < v < 1.2 m/s), 2.2 °C (v > 1.2 m/s)
 *
 * @param {"IP" | "SI"} [units="SI"] - select the SI (International System of Units) or the IP (Imperial Units) system.
 * @param {boolean} [limit_inputs=true] - By default, if the inputs are outsude the standard applicability limits the
 * function returns nan. If False returns pmv and ppd values even if input values are
 * outside the applicability limits of the model.
 * @param {boolean} [round_output=true] - if true, rounds the returned comfort temperature and bounds to one decimal place in the output unit (rounding is applied after any IP unit conversion); if false, returns the unrounded values.
 *
 * @returns {AdaptiveEnResult} result set
 *
 * @example
 * const results = adaptive_en(25, 25, 20, 0.1);
 * console.log(results); // {tmp_cmf: 25.4, acceptability_cat_i: true, acceptability_cat_ii: true, ... }
 * console.log(results.acceptability_cat_i); // true
 * // The conditions you entered are considered to comply with Category I
 *
 * @example
 * // for users who wants to use the IP system
 * const results = adaptive_en(77, 77, 68, 0.3, 'IP');
 * console.log(results); // {tmp_cmf: 77.7, acceptability_cat_i: true, acceptability_cat_ii: true, ... }
 *
 * @example
 * const results = adaptive_en(25, 25, 9, 0.1);
 * console.log(results); // {tmp_cmf: NaN, acceptability_cat_i: true, acceptability_cat_ii: true, ... }
 * // The adaptive thermal comfort model can only be used
 * // if the running mean temperature is between 10 °C and 30 °C
 */
const ADAPTIVE_EN_SCHEMA = {
  tdb: { type: "number" },
  tr: { type: "number" },
  t_running_mean: { type: "number" },
  v: { type: "number" },
  units: { enum: ["SI", "IP"] },
  limit_inputs: { type: "boolean" },
  round_output: { type: "boolean", required: false },
};

export function adaptive_en(
  tdb,
  tr,
  t_running_mean,
  v,
  units = "SI",
  limit_inputs = true,
  round_output = true,
) {
  validateInputs(
    {
      tdb,
      tr,
      t_running_mean,
      v,
      units: units.toUpperCase(),
      limit_inputs,
      round_output,
    },
    ADAPTIVE_EN_SCHEMA,
  );

  const standard = "ISO";

  if (units.toLowerCase() == "ip") {
    ({
      tdb,
      tr,
      tmp_running_mean: t_running_mean,
      v,
    } = units_converter({ tdb, tr, tmp_running_mean: t_running_mean, v }));
  }

  const to = t_o(tdb, tr, v, standard);

  const ce = get_ce(v, to);

  let t_cmf = 0.33 * t_running_mean + 18.8;

  if (limit_inputs) {
    const trm_valid =
      t_running_mean >= T_RUNNING_MEAN_LIMITS.min &&
      t_running_mean <= T_RUNNING_MEAN_LIMITS.max;
    if (!trm_valid) t_cmf = NaN;
  }

  const offsetI = offsetById("cat_i");
  const offsetII = offsetById("cat_ii");
  const offsetIII = offsetById("cat_iii");
  let t_cmf_i_lower = t_cmf + offsetI.lower;
  let t_cmf_ii_lower = t_cmf + offsetII.lower;
  let t_cmf_iii_lower = t_cmf + offsetIII.lower;
  let t_cmf_i_upper = t_cmf + offsetI.upper + ce;
  let t_cmf_ii_upper = t_cmf + offsetII.upper + ce;
  let t_cmf_iii_upper = t_cmf + offsetIII.upper + ce;

  const acceptability_i = t_cmf_i_lower <= to && to <= t_cmf_i_upper;
  const acceptability_ii = t_cmf_ii_lower <= to && to <= t_cmf_ii_upper;
  const acceptability_iii = t_cmf_iii_lower <= to && to <= t_cmf_iii_upper;

  if (units.toLocaleLowerCase() === "ip") {
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
  };
}

attachModelDocs(
  adaptive_en,
  "Adaptive EN",
  "Determines the adaptive thermal comfort based on EN 16798-1 2019.",
);
adaptive_en.offsets = ADAPTIVE_EN_OFFSETS;
adaptive_en.t_running_mean_limits = T_RUNNING_MEAN_LIMITS;
