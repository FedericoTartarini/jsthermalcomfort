import { t_o } from "../psychrometrics/t_o.js";
import {
  check_standard_compliance,
  round,
  units_converter,
  validateInputs,
  ASHRAE_55_LIMITS,
  Standard,
} from "../utilities/utilities.js";
import { get_ce } from "./adaptive_en.js";
import { deepFreeze } from "./modelDocs.ts";

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
 * Applicability limit of the adaptive model's own input, in SI units.
 *
 * `tdb`, `tr` and `v` are gated by `check_standard_compliance`, whose numbers
 * `ASHRAE_55_LIMITS` holds; the running mean outdoor temperature is gated by
 * this model alone, so its bound lives here. Same arrangement as
 * `HEAT_INDEX_ROTHFUSZ_LIMITS`: frozen, referenced by identity from
 * `ADAPTIVE_ASHRAE_INFO` and read by the gate below, so the metadata and the
 * NaN cannot disagree. Exported for that identity test, deliberately not
 * added to `src/models/index.js`.
 */
export const ADAPTIVE_ASHRAE_LIMITS = Object.freeze({
  t_running_mean: Object.freeze({ min: 10, max: 33.5 }),
});

/**
 * Model metadata for the ASHRAE 55 adaptive model.
 *
 * Experimental — the shape of `ModelInfo` may change before release.
 *
 * `v` is bounded by `ASHRAE_55_LIMITS.vr`: `_ashrae_compliance` applies the
 * same 0–2 m/s limit to `v` and `vr`, and the table names the PMV input.
 * The acceptability outputs are booleans, so they carry no unit and no
 * classifier.
 *
 * @type {import("./modelDocs.ts").ModelInfo}
 * @public
 */
export const ADAPTIVE_ASHRAE_INFO = deepFreeze({
  label: "Adaptive (ASHRAE 55)",
  description:
    "Adaptive comfort temperature and its 80 % and 90 % acceptability ranges from the running mean outdoor temperature.",
  standards: [Standard.ashrae_55_2023],
  inputs: {
    tdb: { unit: "°C", applicability: ASHRAE_55_LIMITS.tdb },
    tr: { unit: "°C", applicability: ASHRAE_55_LIMITS.tr },
    t_running_mean: {
      unit: "°C",
      applicability: ADAPTIVE_ASHRAE_LIMITS.t_running_mean,
    },
    v: { unit: "m/s", applicability: ASHRAE_55_LIMITS.vr },
  },
  outputs: {
    tmp_cmf: { unit: "°C" },
    tmp_cmf_80_low: { unit: "°C" },
    tmp_cmf_80_up: { unit: "°C" },
    tmp_cmf_90_low: { unit: "°C" },
    tmp_cmf_90_up: { unit: "°C" },
    acceptability_80: { unit: null },
    acceptability_90: { unit: null },
  },
});

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
 * @param {number} tdb - dry bulb air temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {number} tr - mean radiant temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {number} t_running_mean - running mean temperature, default in [°C] in [°C] in [°F] if `units` = 'IP'
 * The running mean temperature can be calculated using the function {@link #running_mean_outdoor_temperature|running_mean_outdoor_temperature}
 * @param {number} v - air speed, default in [m/s] in [fps] if `units` = 'IP'
 * @param {"SI" | "IP"} units - select the SI (International System of Units) or the IP (Imperial Units) system.
 * @param {boolean} limit_inputs - By default, if the inputs are outsude the standard applicability limits the
 * function returns nan. If False returns pmv and ppd values even if input values are
 * outside the applicability limits of the model.
 * @param {boolean} [round_output=true] - if true, rounds the returned comfort temperature and bounds to one decimal place in the output unit (rounding is applied after any IP unit conversion); if false, returns the unrounded values. Note: `acceptability_80` and `acceptability_90` are always computed from unrounded values and are unaffected by this parameter.
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

  const standard = Standard.ashrae_55_2023;
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
      t_running_mean >= ADAPTIVE_ASHRAE_LIMITS.t_running_mean.min &&
      t_running_mean <= ADAPTIVE_ASHRAE_LIMITS.t_running_mean.max;
    if (warnings.length > 0 || !trm_valid) t_cmf = NaN;
  }

  let tmp_cmf_80_low = t_cmf - 3.5;
  let tmp_cmf_90_low = t_cmf - 2.5;
  let tmp_cmf_80_up = t_cmf + 3.5 + ce;
  let tmp_cmf_90_up = t_cmf + 2.5 + ce;

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

  if (round_output) {
    t_cmf = round(t_cmf, 1);
    tmp_cmf_80_low = round(tmp_cmf_80_low, 1);
    tmp_cmf_80_up = round(tmp_cmf_80_up, 1);
    tmp_cmf_90_low = round(tmp_cmf_90_low, 1);
    tmp_cmf_90_up = round(tmp_cmf_90_up, 1);
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
