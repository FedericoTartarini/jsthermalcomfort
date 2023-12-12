"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.athb_array = exports.athb = void 0;
const pmv_ppd_js_1 = require("./pmv_ppd.js");
const utilities_js_1 = require("../utilities/utilities.js");
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
 * @see {@link athb_array} for a version that supports arrays.
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
 * @returns { number } athb_pmv - Predicted Mean Vote calculated with the Adaptive Thermal Heat Balance framework
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
 * console.log(athb_result); // Output: 0.2
 */
function athb(tdb, tr, vr, rh, met, t_running_mean) {
    const met_adapted = met - (0.234 * t_running_mean) / 58.2;
    const clo_adapted = Math.pow(10, -0.17168 -
        0.000485 * t_running_mean +
        0.08176 * met_adapted -
        0.00527 * t_running_mean * met_adapted);
    const pmv_res = (0, pmv_ppd_js_1.pmv_calculation)(tdb, tr, vr, rh, met_adapted, clo_adapted, 0);
    const ts = 0.303 * Math.exp(-0.036 * met_adapted * 58.15) + 0.028;
    const l_adapted = pmv_res / ts;
    return (0, utilities_js_1.round)(1.484 +
        0.0276 * l_adapted -
        0.9602 * met_adapted -
        0.0342 * t_running_mean +
        0.0002264 * l_adapted * t_running_mean +
        0.018696 * met_adapted * t_running_mean -
        0.0002909 * l_adapted * met_adapted * t_running_mean, 3);
}
exports.athb = athb;
/**
 * Return the PMV value calculated with the Adaptive Thermal Heat Balance
 * Framework {@link #ref_27|[27]}. The adaptive thermal heat balance (ATHB) framework
 * introduced a method to account for the three adaptive principals, namely
 * physiological, behavioral, and psychological adaptation, individually
 * within existing heat balance models. The objective is a predictive model of
 * thermal sensation applicable during the design stage or in international
 * standards without knowing characteristics of future occupants.
 *
 * This is a version that supports arrays.
 * @see {@link athb} for a version that supports scalar arguments.
 *
 * @public
 * @memberof models
 * @docname Adaptive Thermal Heat Balance (athb) (array version)
 *
 * @param { number[] } tdb - dry bulb air temperature, in [°C]
 * @param { number[] } tr - mean radiant temperature, in [°C]
 * @param { number[] } vr - relative air speed, in [m/s]
 *
 * Note: vr is the relative air speed caused by body movement and not the air
 * speed measured by the air speed sensor. The relative air speed is the sum of the
 * average air speed measured by the sensor plus the activity-generated air speed
 * (Vag). Where Vag is the activity-generated air speed caused by motion of
 * individual body parts. vr can be calculated using the function
 * jsthermalcomfort.utilities.v_relative.
 *
 * @param { number[] } rh - relative humidity, [%]
 * @param { number[] } met - metabolic rate, [met]
 * @param { number[] } t_running_mean - running mean temperature, in [°C]
 *
 * The running mean temperature can be calculated using the function
 * jsthermalcomfort.utilities.running_mean_outdoor_temperature.
 *
 * @returns { number[] } athb_pmv - Predicted Mean Vote calculated with the Adaptive Thermal Heat Balance framework
 *
 * @example
 * const tdb = [25, 27];
 * const tr = [25, 25];
 * const vr = [0.1, 0.1];
 * const rh = [50, 50];
 * const met = [1.1, 1.1];
 * const t_running_mean = [20, 20];
 *
 * const athb_array_result = athb_array(tdb, tr, vr, rh, met, t_running_mean);
 * console.log(athb_array_result); // Output: [0.2, 0.209]
 */
function athb_array(tdb, tr, vr, rh, met, t_running_mean) {
    //assume all parameters have same length, and it should have same length when use this API
    const met_adapted = met.map((metValue, index) => metValue - (0.234 * t_running_mean[index]) / 58.2);
    const clo_adapted = met_adapted.map((metValue, index) => Math.pow(10, -0.17168 -
        0.000485 * t_running_mean[index] +
        0.08176 * metValue -
        0.00527 * t_running_mean[index] * metValue));
    const pmv_res = tdb.map((tdbValue, i) => (0, pmv_ppd_js_1.pmv_calculation)(tdbValue, tr[i], vr[i], rh[i], met_adapted[i], clo_adapted[i], 0));
    const ts = met_adapted.map((metValue) => 0.303 * Math.exp(-0.036 * metValue * 58.15) + 0.028);
    const l_adapted = pmv_res.map((pmv_res_Value, i) => pmv_res_Value / ts[i]);
    return l_adapted.map((lValue, i) => (0, utilities_js_1.round)(1.484 +
        0.0276 * lValue -
        0.9602 * met_adapted[i] -
        0.0342 * t_running_mean[i] +
        0.0002264 * lValue * t_running_mean[i] +
        0.018696 * met_adapted[i] * t_running_mean[i] -
        0.0002909 * lValue * met_adapted[i] * t_running_mean[i], 3));
}
exports.athb_array = athb_array;
