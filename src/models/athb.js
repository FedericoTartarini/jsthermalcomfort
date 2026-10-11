import { round, validateInputs } from "../utilities/utilities.js";
import { pmv_calculation } from "./pmv_ppd.js";

const PMV_ATHB_SCHEMA = {
  tdb: { type: "number" },
  tr: { type: "number" },
  vr: { type: "number" },
  rh: { type: "number" },
  met: { type: "number" },
  t_running_mean: { type: "number" },
  clo: { type: "number", required: false },
};

/**
 * @typedef {Object} AthbResult
 * @property {number} athb_pmv - Predicted Mean Vote calculated with the Adaptive Thermal Heat Balance framework
 * @public
 */
/**
 * Return the PMV value calculated with the Adaptive Thermal Heat Balance
 * Framework {@link #ref_27|[27]}. The adaptive thermal heat balance (ATHB) framework
 * introduced a method to account for the three adaptive principals, namely
 * physiological, behavioral, and psychological adaptation, individually
 * within existing heat balance models. The objective is a predictive model of
 * thermal sensation applicable during the design stage or in international
 * standards without knowing characteristics of future occupants.
 *
 * Accepts scalar inputs. For multiple readings, use Array.map() over this function.
 * The result is rounded to 3 decimal places.
 *
 * @public
 * @memberof models
 * @docname Adaptive Thermal Heat Balance (ATHB)
 *
 * @param {number} tdb - Dry bulb air temperature, [°C].
 * @param {number} tr - Mean radiant temperature, [°C].
 * @param {number} vr - Relative air speed, [m/s].
 *
 * Note: vr is the relative air speed caused by body movement and not the air
 * speed measured by the air speed sensor. The relative air speed is the sum of the
 * average air speed measured by the sensor plus the activity-generated air speed
 * (Vag). Where Vag is the activity-generated air speed caused by motion of
 * individual body parts. vr can be calculated using the function jsthermalcomfort.utilities.v_relative.
 *
 * @param {number} rh - Relative humidity, [%].
 * @param {number} met - Metabolic rate, [met].
 * @param {number} t_running_mean - Running mean temperature, [°C].
 *
 * Note: The running mean temperature can be calculated using the function
 * jsthermalcomfort.utilities.running_mean_outdoor_temperature.
 *
 * @param {number|false} [clo] - Clothing insulation, [clo]. If omitted or `false`,
 * the clothing insulation value will be calculated using the equation provided in the paper.
 * Defaults to `undefined`, which behaves like pythermalcomfort's default `False`.
 *
 * @returns {AthbResult} set containing results for the model
 * @throws {TypeError} If an input is not a finite scalar number, or if `clo` is
 * neither a finite number, `undefined` nor `false`.
 *
 * @example
 * import { pmv_athb } from "jsthermalcomfort";
 * const result = pmv_athb(25, 25, 0.1, 50, 1.1, 20);
 * console.log(result); // { athb_pmv: 0.17 }
 *
 * // with a fixed clothing insulation value
 * const result_clo = pmv_athb(25, 25, 0.1, 50, 1.1, 20, 0.5);
 * console.log(result_clo); // { athb_pmv: 0.061 }
 */
export function pmv_athb(tdb, tr, vr, rh, met, t_running_mean, clo) {
  if (clo === false) clo = undefined;

  validateInputs(
    { tdb, tr, vr, rh, met, t_running_mean, clo },
    PMV_ATHB_SCHEMA,
  );

  const met_adapted = met - (0.234 * t_running_mean) / 58.2;

  let clo_adapted = clo;
  if (clo_adapted === undefined) {
    // Adapted clothing insulation level through behavioral adaptation
    clo_adapted = Math.pow(
      10,
      -0.17168 -
        0.000485 * t_running_mean +
        0.08176 * met_adapted -
        0.00527 * t_running_mean * met_adapted,
    );
  }

  const pmv_res = pmv_calculation(tdb, tr, vr, rh, met_adapted, clo_adapted, 0);
  const ts = 0.303 * Math.exp(-0.036 * met_adapted * 58.15) + 0.028;
  const l_adapted = pmv_res / ts;

  // Predicted thermal sensation vote
  return {
    athb_pmv: round(
      1.484 +
        0.0276 * l_adapted -
        0.9602 * met_adapted -
        0.0342 * t_running_mean +
        0.0002264 * l_adapted * t_running_mean +
        0.018696 * met_adapted * t_running_mean -
        0.0002909 * l_adapted * met_adapted * t_running_mean,
      3,
    ),
  };
}

/**
 * Backwards-compatible alias for {@link pmv_athb}.
 * This name is deprecated in favor of `pmv_athb` for consistency with pythermalcomfort,
 * but will continue to be supported indefinitely.
 *
 * @public
 * @memberof models
 * @deprecated Use {@link pmv_athb} instead. This alias will not be removed.
 *
 * @param {number} tdb - Dry bulb air temperature, [°C].
 * @param {number} tr - Mean radiant temperature, [°C].
 * @param {number} vr - Relative air speed, [m/s].
 * @param {number} rh - Relative humidity, [%].
 * @param {number} met - Metabolic rate, [met].
 * @param {number} t_running_mean - Running mean temperature, [°C].
 * @param {number|false} [clo] - Clothing insulation, [clo]. If omitted or `false`,
 * the clothing insulation value will be calculated using the equation provided in the paper.
 *
 * @returns {AthbResult} set containing results for the model
 *
 * @example
 * const result = athb(25, 25, 0.1, 50, 1.1, 20);
 * console.log(result); // { athb_pmv: 0.17 }
 */
export const athb = pmv_athb;
