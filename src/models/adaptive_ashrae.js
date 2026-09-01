import { t_o } from "../psychrometrics/t_o.js";
import {
  check_standard_compliance,
  round,
  units_converter,
  validateInputs,
} from "../utilities/utilities.js";
import { get_ce } from "./adaptive_en.js";
import { attachModelDocs } from "./modelDocs.js";

/**
 * @typedef {object} AdaptiveAshraeResult
 * @property {number} tmp_cmf - Comfort temperature a that specific running mean temperature, default in [°C] or in [°F]
 * @property {number} tmp_cmf_80_low - Lower acceptable comfort temperature for 80% occupants, default in [°C] or in [°F]
 * @property {number} tmp_cmf_80_up - Upper acceptable comfort temperature for 80% occupants, default in [°C] or in [°F]
 * @property {number} tmp_cmf_90_low - Lower acceptable comfort temperature for 90% occupants, default in [°C] or in [°F]
 * @property {number} tmp_cmf_90_up - Upper acceptable comfort temperature for 90% occupants, default in [°C] or in [°F]
 * @property {boolean} acceptability_80 - Acceptability for 80% occupants
 * @property {boolean} acceptability_90 - Acceptability for 90% occupants
 * @public
 */

/**
 * Acceptability-band offsets from `t_cmf` [°C]. `id` matches the return-field
 * stem (`acceptability_80`, `tmp_cmf_80_low`). Upper bound is before `ce`.
 *
 * @type {readonly AdaptiveOffset[]}
 */
const ADAPTIVE_ASHRAE_OFFSETS = [
  { id: "80", lower: -3.5, upper: 3.5 },
  { id: "90", lower: -2.5, upper: 2.5 },
];

/** @type {RunningMeanLimits} */
const T_RUNNING_MEAN_LIMITS = { min: 10, max: 33.5 };

function offsetById(id) {
  const offset = ADAPTIVE_ASHRAE_OFFSETS.find((item) => item.id === id);
  if (!offset) {
    throw new Error(`Missing adaptive ASHRAE offset: ${id}`);
  }
  return offset;
}

/**
 * Determines the adaptive thermal comfort based on ASHRAE 55. The adaptive
 * model relates indoor design temperatures or acceptable temperature ranges
 * to outdoor meteorological or climatological parameters. The adaptive model
 * can only be used in occupant-controlled naturally conditioned spaces that
 * meet all the following criteria:
 *
 * - There is no mechianical cooling or heating system in operation
 * - Occupants have a metabolic rate between 1.0 and 1.5 met
 * - Occupants are free to adapt their clothing within a range as wide as 0.5 and 1.0 clo
 * - The prevailing mean (runnin mean) outdoor temperature is between 10 and 33.5 °C
 *
 *
 * @public
 * @memberof models
 * @docname Adaptive ASHRAE
 *
 * @property {string} label - Display name (`@docname`)
 * @property {string} description - Leading JSDoc summary
 * @property {AdaptiveOffset[]} offsets - Acceptability-band offsets from `t_cmf`, [°C]
 * @property {RunningMeanLimits} t_running_mean_limits - Prevailing-mean outdoor temperature applicability, [°C]
 *
 * @param {number} tdb - dry bulb air temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {number} tr - mean radiant temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {number} t_running_mean - running mean temperature, default in [°C] in [°C] in [°F] if `units` = 'IP'
 * The running mean temperature can be calculated using the function {@link #running_mean_outdoor_temperature|running_mean_outdoor_temperature}
 * @param {number} v - air speed, default in [m/s] in [fps] if `units` = 'IP'
 * @param {"SI" | "IP"} units - select the SI (International System of Units) or the IP (Imperial Units) system.
 * @param {boolean} limit_inputs - By default, if the inputs are outsude the standard applicability limits the
 * function returns nan. If False returns pmv and ppd values even if input values are
 * outside the applicability limits of the model.
 * @param {boolean} [round_output=true] - if true, rounds `t_cmf` to one decimal place in SI before bounds are derived; if false, returns the unrounded values. Under `units = 'IP'` the rounded SI value is then converted to °F, so IP outputs carry the additional decimals from the °C-to-°F conversion.
 *
 * @returns {AdaptiveAshraeResult} set containing results for the model
 *
 * The ASHRAE 55 2020 limits are 10 < tdb [°C] < 40, 10 < tr [°C] < 40,
 * 0 < vr [m/s] < 2, 10 < t running mean [°C] < 33.5
 *
 * You can use this function to calculate if your conditions are within the `adaptive thermal comfort region`.
 * Calculations with comply with the ASHRAE 55 2020 Standard {@link #ref_1|[1]}.
 *
 * @example
 * import { adaptive_ashrae } from "jsthermalcomfort/models";
 * const results = adaptive_ashrae(25, 25, 20, 0.1);
 * console.log(results);
 * // {tmp_cmf: 24.0, tmp_cmf_80_low: 20.5, tmp_cmf_80_up: 27.5,
 * //   tmp_cmf_90_low: 21.5, tmp_cmf_90_up: 26.5, acceptability_80: true,
 * //   acceptability_90: true}
 * console.log(results.acceptability_80);
 * // true
 *
 * @example
 * import { adaptive_ashrae } from "jsthermalcomfort/models";
 * // For users who want to use the IP system
 * const results = adaptive_ashrae(77, 77, 68, 0.3, 'IP');
 * console.log(results);
 * // {tmp_cmf: 75.2, tmp_cmf_80_low: 68.9, tmp_cmf_80_up: 81.5,
 * //  tmp_cmf_90_low: 70.7, tmp_cmf_90_up: 79.7, acceptability_80: true,
 * //  acceptability_90: true}
 *
 * @example
 * import { adaptive_ashrae } from "jsthermalcomfort/models";
 * const results = adaptive_ashrae(25, 25, 9, 0.1);
 * console.log(results);
 * // {tmp_cmf: NaN, tmp_cmf_80_low: NaN, ...}
 * // The adaptive thermal comfort model can only be used
 * // if the running mean temperature is higher than 10°C
 */
const ADAPTIVE_ASHRAE_SCHEMA = {
  tdb: { type: "number" },
  tr: { type: "number" },
  t_running_mean: { type: "number" },
  v: { type: "number" },
  units: { enum: ["SI", "IP"] },
  limit_inputs: { type: "boolean" },
  round_output: { type: "boolean", required: false },
};

export function adaptive_ashrae(
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
    ADAPTIVE_ASHRAE_SCHEMA,
  );

  const standard = "ASHRAE";
  if (units.toUpperCase() === "IP") {
    ({
      tdb,
      tr,
      tmp_running_mean: t_running_mean,
      v,
    } = units_converter({
      tdb,
      tr,
      tmp_running_mean: t_running_mean,
      v,
    }));
  }
  const to = t_o(tdb, tr, v, standard);
  // calculate cooling effect (ce) of elevated air speed when top > 25 degC.
  const ce = get_ce(v, to);
  // Relation between comfort and outdoor temperature
  let t_cmf = 0.31 * t_running_mean + 17.8;

  if (limit_inputs) {
    const warnings = check_standard_compliance(standard, { tdb, tr, v });
    const trm_valid =
      t_running_mean >= T_RUNNING_MEAN_LIMITS.min &&
      t_running_mean <= T_RUNNING_MEAN_LIMITS.max;
    if (warnings.length > 0 || !trm_valid) t_cmf = NaN;
  }

  if (round_output) {
    t_cmf = round(t_cmf, 1);
  }

  const offset80 = offsetById("80");
  const offset90 = offsetById("90");
  let tmp_cmf_80_low = t_cmf + offset80.lower;
  let tmp_cmf_90_low = t_cmf + offset90.lower;
  let tmp_cmf_80_up = t_cmf + offset80.upper + ce;
  let tmp_cmf_90_up = t_cmf + offset90.upper + ce;

  const acceptability_80 = tmp_cmf_80_low <= to && to <= tmp_cmf_80_up;
  const acceptability_90 = tmp_cmf_90_low <= to && to <= tmp_cmf_90_up;

  if (units.toUpperCase() === "IP") {
    ({
      tmp_cmf: t_cmf,
      tmp_cmf_80_low,
      tmp_cmf_80_up,
      tmp_cmf_90_low,
      tmp_cmf_90_up,
    } = units_converter(
      {
        tmp_cmf: t_cmf,
        tmp_cmf_80_low,
        tmp_cmf_80_up,
        tmp_cmf_90_low,
        tmp_cmf_90_up,
      },
      "SI",
    ));
  }

  return {
    tmp_cmf: t_cmf,
    tmp_cmf_80_low,
    tmp_cmf_80_up,
    tmp_cmf_90_low,
    tmp_cmf_90_up,
    acceptability_80,
    acceptability_90,
  };
}

attachModelDocs(
  adaptive_ashrae,
  "Adaptive ASHRAE",
  "Determines the adaptive thermal comfort based on ASHRAE 55.",
);
adaptive_ashrae.offsets = ADAPTIVE_ASHRAE_OFFSETS;
adaptive_ashrae.t_running_mean_limits = T_RUNNING_MEAN_LIMITS;
