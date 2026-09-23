import { t_o } from "../psychrometrics/t_o.js";
import {
  check_standard_compliance,
  round,
  units_converter,
  validateInputs,
  ASHRAE_55_LIMITS,
  Standard,
} from "../utilities/utilities.js";
import { adaptive_cooling_effect } from "./adaptive_cooling_effect.ts";
import { deepFreeze } from "./modelDocs.ts";
import type { ModelInfo } from "./modelDocs.ts";

// Comfort temperature as a linear function of the running mean outdoor
// temperature, t_cmf = SLOPE * t_running_mean + INTERCEPT, as upstream names them.
const SLOPE = 0.31;
const INTERCEPT = 17.8;
// Half-widths of the 80 % and 90 % acceptability bands around t_cmf, which
// upstream writes inline (adaptive_ashrae.py:150-153).
const ACCEPTABILITY_80_OFFSET = 3.5;
const ACCEPTABILITY_90_OFFSET = 2.5;

// A type alias, as the JSDoc typedef it replaces emitted, so the result stays
// assignable to Record<string, unknown>; an interface is not.
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
export type AdaptiveAshraeResult = {
  tmp_cmf: number;
  tmp_cmf_80_low: number;
  tmp_cmf_80_up: number;
  tmp_cmf_90_low: number;
  tmp_cmf_90_up: number;
  acceptability_80: boolean;
  acceptability_90: boolean;
};

/**
 * The params of `adaptive_ashrae`: upstream's keyword parameters, quantities
 * and switches alike, with upstream's defaults (ADR 0002). Documented on the
 * function's `params`.
 */
export interface AdaptiveAshraeParams {
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
export const ADAPTIVE_ASHRAE_INFO: ModelInfo = deepFreeze({
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
 * @param {Object} params - the model's parameters, named as in pythermalcomfort.
 * @param {number} params.tdb - dry bulb air temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {number} params.tr - mean radiant temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {number} params.t_running_mean - running mean temperature, default in [°C] in [°C] in [°F] if `units` = 'IP'
 * The running mean temperature can be calculated using the function {@link #running_mean_outdoor_temperature|running_mean_outdoor_temperature}
 * @param {number} params.v - air speed, default in [m/s] in [fps] if `units` = 'IP'
 * @param {"SI" | "IP"} [params.units="SI"] - select the SI (International System of Units) or the IP (Imperial Units) system.
 * @param {boolean} [params.limit_inputs=true] - By default, if the inputs are outsude the standard applicability limits the
 * function returns nan. If False returns pmv and ppd values even if input values are
 * outside the applicability limits of the model.
 * @param {boolean} [params.round_output=true] - if true, rounds `tmp_cmf` to one decimal place in SI before the comfort bounds are derived, so `tmp_cmf_80_low`, `tmp_cmf_80_up`, `tmp_cmf_90_low`, `tmp_cmf_90_up`, `acceptability_80` and `acceptability_90` inherit that rounding; if false, returns them at full precision. Under `units` = 'IP' the rounded SI value is then converted to °F, so IP outputs carry the extra decimals from the °C-to-°F conversion.
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
 * const results = adaptive_ashrae({ tdb: 25, tr: 25, t_running_mean: 20, v: 0.1 });
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
 * const results = adaptive_ashrae({ tdb: 77, tr: 77, t_running_mean: 68, v: 0.3, units: "IP" });
 * console.log(results);
 * // {tmp_cmf: 75.2, tmp_cmf_80_low: 68.9, tmp_cmf_80_up: 81.5,
 * //  tmp_cmf_90_low: 70.7, tmp_cmf_90_up: 79.7, acceptability_80: true,
 * //  acceptability_90: true}
 *
 * @example
 * import { adaptive_ashrae } from "jsthermalcomfort/models";
 * const results = adaptive_ashrae({ tdb: 25, tr: 25, t_running_mean: 9, v: 0.1 });
 * console.log(results);
 * // {tmp_cmf: NaN, tmp_cmf_80_low: NaN, ...}
 * // The adaptive thermal comfort model can only be used
 * // if the running mean temperature is higher than 10°C
 */
// A non-finite number throws a TypeError here, where upstream lets it
// propagate (ADR 0001, reason three). limit_inputs is not validated, as
// upstream's ASHRAEInputs is not given it.
const ADAPTIVE_ASHRAE_SCHEMA = {
  tdb: { type: "number" },
  tr: { type: "number" },
  t_running_mean: { type: "number" },
  v: { type: "number" },
  units: { enum: ["SI", "IP"] },
  round_output: { type: "boolean" },
};

export function adaptive_ashrae(
  params: AdaptiveAshraeParams,
): AdaptiveAshraeResult {
  // Every argument was positional before v2 (ADR 0002); a call still written
  // that way fails here, naming the shape it should have.
  if (typeof params !== "object" || params === null) {
    throw new TypeError(
      `adaptive_ashrae takes one params object, got ${String(params)}`,
    );
  }
  let { tdb, tr, t_running_mean, v } = params;
  // Destructuring defaults also apply to a switch passed as undefined.
  const { units = "SI", limit_inputs = true, round_output = true } = params;
  validateInputs(
    {
      tdb,
      tr,
      t_running_mean,
      v,
      units: units.toUpperCase(),
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
  const ce = adaptive_cooling_effect(v, to);
  // Relation between comfort and outdoor temperature
  let t_cmf = SLOPE * t_running_mean + INTERCEPT;

  if (limit_inputs) {
    const warnings = check_standard_compliance(standard, { tdb, tr, v });
    const trm_valid =
      t_running_mean >= ADAPTIVE_ASHRAE_LIMITS.t_running_mean.min &&
      t_running_mean <= ADAPTIVE_ASHRAE_LIMITS.t_running_mean.max;
    if (warnings.length > 0 || !trm_valid) t_cmf = NaN;
  }

  // Rounded in SI before the bounds and the acceptability are derived, and not
  // rounded again after the IP conversion, as upstream does (ADR 0001 reverts
  // issue #179, which rounded last).
  if (round_output) t_cmf = round(t_cmf, 1);

  let tmp_cmf_80_low = t_cmf - ACCEPTABILITY_80_OFFSET;
  let tmp_cmf_90_low = t_cmf - ACCEPTABILITY_90_OFFSET;
  let tmp_cmf_80_up = t_cmf + ACCEPTABILITY_80_OFFSET + ce;
  let tmp_cmf_90_up = t_cmf + ACCEPTABILITY_90_OFFSET + ce;

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
