import { round, validateInputs } from "../utilities/utilities.js";
import { pmv_calculation } from "./pmv_ppd.js";

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
 * This is a version that supports scalar arguments.
 *
 * @public
 * @memberof models
 * @docname Adaptive Thermal Heat Balance (athb)
 *
 * @param { number } tdb - dry bulb air temperature, in [°C]
 * @param { number } tr - mean radiant temperature, in [°C]
 * @param { number } vr - relative air speed, in [m/s]
 *
 * Note: vr is the relative air speed caused by body movement and not the air
 * speed measured by the air speed sensor. The relative air speed is the sum of the
 * average air speed measured by the sensor plus the activity-generated air speed
 * (Vag). Where Vag is the activity-generated air speed caused by motion of
 * individual body parts. vr can be calculated using the function jsthermalcomfort.utilities.v_relative.
 *
 * @param { number } rh - relative humidity, [%]
 * @param { number } met - metabolic rate, [met]
 * @param { number } t_running_mean - running mean temperature, in [°C]
 *
 * The running mean temperature can be calculated using the function
 * jsthermalcomfort.utilities.running_mean_outdoor_temperature.
 *
 * @returns { AthbResult } set containing results for the model
 *
 * @example
 * const tdb = 25;
 * const tr = 25;
 * const vr = 0.1;
 * const rh = 50;
 * const met = 1.1;
 * const t_running_mean = 20;
 *
 * const athb_result = athb(tdb, tr, vr, rh, met, t_running_mean);
 * console.log(athb_result); // Output: {athb_pmv: 0.2}
 */
const ATHB_SCHEMA = {
  tdb: { type: "number" },
  tr: { type: "number" },
  vr: { type: "number" },
  rh: { type: "number" },
  met: { type: "number" },
  t_running_mean: { type: "number" },
};

export function athb(tdb, tr, vr, rh, met, t_running_mean) {
  validateInputs({ tdb, tr, vr, rh, met, t_running_mean }, ATHB_SCHEMA);

  const met_adapted = met - (0.234 * t_running_mean) / 58.2;

  const clo_adapted = Math.pow(
    10,
    -0.17168 -
      0.000485 * t_running_mean +
      0.08176 * met_adapted -
      0.00527 * t_running_mean * met_adapted,
  );

  const pmv_res = pmv_calculation(tdb, tr, vr, rh, met_adapted, clo_adapted, 0);
  const ts = 0.303 * Math.exp(-0.036 * met_adapted * 58.15) + 0.028;
  const l_adapted = pmv_res / ts;

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
