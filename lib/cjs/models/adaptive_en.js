"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_ce = exports.adaptive_en_array = exports.adaptive_en = void 0;
const t_o_js_1 = require("../psychrometrics/t_o.js");
const utilities_js_1 = require("../utilities/utilities.js");
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
 * Determines the adaptive thermal comfort based on EN 16798-1 2019 {@link #ref_3|[3]}
 *
 * Note: You can use this function to calculate if your conditions are within the EN
 * adaptive thermal comfort region. Calculations with comply with the EN 16798-1 2019 {@link #ref_3|[3]}.
 *
 * @see {@link adaptive_en_array} for a version that supports array arguments
 *
 * @public
 * @memberof models
 * @docname Adaptive EN
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
function adaptive_en(tdb, tr, t_running_mean, v, units = "SI", limit_inputs = true) {
    const standard = "ISO";
    if (units.toLowerCase() == "ip") {
        ({
            tdb,
            tr,
            tmp_running_mean: t_running_mean,
            v,
        } = (0, utilities_js_1.units_converter)({ tdb, tr, tmp_running_mean: t_running_mean, v }));
    }
    const to = (0, t_o_js_1.t_o)(tdb, tr, v, standard);
    const ce = get_ce(v, to);
    let t_cmf = 0.33 * t_running_mean + 18.8;
    if (limit_inputs) {
        const trm_valid = t_running_mean >= 10.0 && t_running_mean <= 33.5;
        if (!trm_valid)
            t_cmf = NaN;
    }
    let t_cmf_i_lower = t_cmf - 3.0;
    let t_cmf_ii_lower = t_cmf - 4.0;
    let t_cmf_iii_lower = t_cmf - 5.0;
    let t_cmf_i_upper = t_cmf + 2.0 + ce;
    let t_cmf_ii_upper = t_cmf + 3.0 + ce;
    let t_cmf_iii_upper = t_cmf + 4.0 + ce;
    const acceptability_i = t_cmf_i_lower <= to && to <= t_cmf_i_upper;
    const acceptability_ii = t_cmf_ii_lower <= to && to <= t_cmf_ii_upper;
    const acceptability_iii = t_cmf_iii_lower <= to && to <= t_cmf_iii_upper;
    if (units.toLocaleLowerCase() === "ip") {
        ({
            tmp_cmf: t_cmf,
            tmp_cmf_cat_i_up: t_cmf_i_upper,
            tmp_cmf_cat_ii_up: t_cmf_ii_upper,
            tmp_cmf_cat_iii_up: t_cmf_iii_upper,
        } = (0, utilities_js_1.units_converter)({
            tmp_cmf: t_cmf,
            tmp_cmf_cat_i_up: t_cmf_i_upper,
            tmp_cmf_cat_ii_up: t_cmf_ii_upper,
            tmp_cmf_cat_iii_up: t_cmf_iii_upper,
        }, "SI"));
        ({
            tmp_cmf_cat_i_low: t_cmf_i_lower,
            tmp_cmf_cat_ii_low: t_cmf_ii_lower,
            tmp_cmf_cat_iii_low: t_cmf_iii_lower,
        } = (0, utilities_js_1.units_converter)({
            tmp_cmf_cat_i_low: t_cmf_i_lower,
            tmp_cmf_cat_ii_low: t_cmf_ii_lower,
            tmp_cmf_cat_iii_low: t_cmf_iii_lower,
        }, "SI"));
    }
    return {
        tmp_cmf: (0, utilities_js_1.round)(t_cmf, 1),
        acceptability_cat_i: acceptability_i,
        acceptability_cat_ii: acceptability_ii,
        acceptability_cat_iii: acceptability_iii,
        tmp_cmf_cat_i_up: (0, utilities_js_1.round)(t_cmf_i_upper, 1),
        tmp_cmf_cat_ii_up: (0, utilities_js_1.round)(t_cmf_ii_upper, 1),
        tmp_cmf_cat_iii_up: (0, utilities_js_1.round)(t_cmf_iii_upper, 1),
        tmp_cmf_cat_i_low: (0, utilities_js_1.round)(t_cmf_i_lower, 1),
        tmp_cmf_cat_ii_low: (0, utilities_js_1.round)(t_cmf_ii_lower, 1),
        tmp_cmf_cat_iii_low: (0, utilities_js_1.round)(t_cmf_iii_lower, 1),
    };
}
exports.adaptive_en = adaptive_en;
/**
 * @typedef {object} AdaptiveEnArrayResult - a result set containing the results for {@link #adative_en_array|adaptive_en_array}
 * @property {number[]} tmp_cmf - Comfort temperature at that specific running mean temperature, default in [°C] or in [°F]
 * @property {boolean[]} acceptability_cat_i - If the indoor conditions comply with comfort category I
 * @property {boolean[]} acceptability_cat_ii - If the indoor conditions comply with comfort category II
 * @property {boolean[]} acceptability_cat_iii - If the indoor conditions comply with comfort category III
 * @property {number[]} tmp_cmf_cat_i_up - Upper acceptable comfort temperature for category I, default in [°C] or in [°F]
 * @property {number[]} tmp_cmf_cat_ii_up - Upper acceptable comfort temperature for category II, default in [°C] or in [°F]
 * @property {number[]} tmp_cmf_cat_iii_up - Upper acceptable comfort temperature for category III, default in [°C] or in [°F]
 * @property {number[]} tmp_cmf_cat_i_low - Lower acceptable comfort temperature for category I, default in [°C] or in [°F]
 * @property {number[]} tmp_cmf_cat_ii_low - Lower acceptable comfort temperature for category II, default in [°C] or in [°F]
 * @property {number[]} tmp_cmf_cat_iii_low - Lower acceptable comfort temperature for category III, default in [°C] or in [°F]
 * @public
 */
/**
 * Determines the adaptive thermal comfort based on EN 16798-1 2019 {@link #ref_3|[3]}
 *
 * Note: You can use this function to calculate if your conditions are within the EN
 * adaptive thermal comfort region. Calculations with comply with the EN 16798-1 2019 {@link #ref_3|[3]}.
 *
 * @public
 * @memberof models
 * @docname Adaptive EN (array version)
 *
 * @see {@link adaptive_en} for a version that supports scalar arguments
 *
 * @param {number[]} tdb - dry bulb air temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {number[]} tr - mean radiant temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {number[]} t_running_mean - running mean temperature, default in [°C] in [°C] in [°F] if `units` = 'IP'
 * The running mean temperature can be calculated using the function {@link #running_mean_outdoor_temperature|running_mean_outdoor_temperature}
 *
 * @param {number[]} v - air speed, default in [m/s] in [fps] if `units` = 'IP'
 *
 * Note: Indoor operative temperature correction is applicable for buildings equipped
 * with fans or personal systems providing building occupants with personal
 * control over air speed at occupant level.
 * For operative temperatures above 25°C the comfort zone upper limit can be
 * increased by 1.2 °C (0.6 < v < 0.9 m/s), 1.8 °C (0.9 < v < 1.2 m/s), 2.2 °C (v> 1.2 m/s)
 *
 * @param {"IP" | "SI"} [units="SI"] - select the SI (International System of Units) or the IP (Imperial Units) system.
 * @param {boolean} [limit_inputs=true] - By default, if the inputs are outsude the standard applicability limits the
 * function returns nan. If False returns pmv and ppd values even if input values are
 * outside the applicability limits of the model.
 *
 * @returns {AdaptiveEnArrayResult} result set
 *
 * @example
 * const results = adaptive_en([25,25], [25,25], [20,9], [0.1,0.1]);
 * console.log(results); // {tmp_cmf: [25.4, NaN], acceptability_cat_i: [true, true], acceptability_cat_ii: [true, true], ... }
 * console.log(results.acceptability_cat_i); // [true, true]
 * // The conditions you entered are considered to comply with Category I
 * // The adaptive thermal comfort model can only be used
 * // if the running mean temperature is between 10 °C and 30 °C
 */
function adaptive_en_array(tdb, tr, t_running_mean, v, units = "SI", limit_inputs = true) {
    const standard = "ISO";
    if (units.toLowerCase() == "ip") {
        ({
            tdb,
            tr,
            tmp_running_mean: t_running_mean,
            v,
        } = (0, utilities_js_1.units_converter_array)({
            tdb,
            tr,
            tmp_running_mean: t_running_mean,
            v,
        }));
    }
    const to = (0, t_o_js_1.t_o_array)(tdb, tr, v, standard);
    const ce = v.map((_v, index) => get_ce(_v, to[index]));
    let t_cmf = t_running_mean.map((_t_running_mean) => 0.33 * _t_running_mean + 18.8);
    if (limit_inputs) {
        const trm_valid = (0, utilities_js_1.valid_range)(t_running_mean, [10.0, 33.5]);
        trm_valid.forEach((_trm_valid, index) => {
            if (isNaN(_trm_valid))
                t_cmf[index] = NaN;
        });
    }
    let t_cmf_i_lower = t_cmf.map((_t) => _t - 3.0);
    let t_cmf_ii_lower = t_cmf.map((_t) => _t - 4.0);
    let t_cmf_iii_lower = t_cmf.map((_t) => _t - 5.0);
    let t_cmf_i_upper = t_cmf.map((_t, index) => _t + 2.0 + ce[index]);
    let t_cmf_ii_upper = t_cmf.map((_t, index) => _t + 3.0 + ce[index]);
    let t_cmf_iii_upper = t_cmf.map((_t, index) => _t + 4.0 + ce[index]);
    const acceptability_i = to.map((_to, index) => t_cmf_i_lower[index] <= _to && _to <= t_cmf_i_upper[index]);
    const acceptability_ii = to.map((_to, index) => t_cmf_ii_lower[index] <= _to && _to <= t_cmf_ii_upper[index]);
    const acceptability_iii = to.map((_to, index) => t_cmf_iii_lower[index] <= _to && _to <= t_cmf_iii_upper[index]);
    if (units.toLocaleLowerCase() === "ip") {
        ({
            tmp_cmf: t_cmf,
            tmp_cmf_cat_i_up: t_cmf_i_upper,
            tmp_cmf_cat_ii_up: t_cmf_ii_upper,
            tmp_cmf_cat_iii_up: t_cmf_iii_upper,
        } = (0, utilities_js_1.units_converter_array)({
            tmp_cmf: t_cmf,
            tmp_cmf_cat_i_up: t_cmf_i_upper,
            tmp_cmf_cat_ii_up: t_cmf_ii_upper,
            tmp_cmf_cat_iii_up: t_cmf_iii_upper,
        }, "SI"));
        ({
            tmp_cmf_cat_i_low: t_cmf_i_lower,
            tmp_cmf_cat_ii_low: t_cmf_ii_lower,
            tmp_cmf_cat_iii_low: t_cmf_iii_lower,
        } = (0, utilities_js_1.units_converter_array)({
            tmp_cmf_cat_i_low: t_cmf_i_lower,
            tmp_cmf_cat_ii_low: t_cmf_ii_lower,
            tmp_cmf_cat_iii_low: t_cmf_iii_lower,
        }, "SI"));
    }
    // NOTE: even all these arrays are the same length and this could be done in one loop
    // doing it in seperate loops means that it is much more cache friendly which makes it faster
    for (let i = 0; i < t_cmf.length; ++i) {
        t_cmf[i] = (0, utilities_js_1.round)(t_cmf[i], 1);
    }
    for (let i = 0; i < t_cmf_i_lower.length; ++i) {
        t_cmf_i_lower[i] = (0, utilities_js_1.round)(t_cmf_i_lower[i], 1);
    }
    for (let i = 0; i < t_cmf_ii_lower.length; ++i) {
        t_cmf_ii_lower[i] = (0, utilities_js_1.round)(t_cmf_ii_lower[i], 1);
    }
    for (let i = 0; i < t_cmf_iii_lower.length; ++i) {
        t_cmf_iii_lower[i] = (0, utilities_js_1.round)(t_cmf_iii_lower[i], 1);
    }
    for (let i = 0; i < t_cmf_i_upper.length; ++i) {
        t_cmf_i_upper[i] = (0, utilities_js_1.round)(t_cmf_i_upper[i], 1);
    }
    for (let i = 0; i < t_cmf_ii_upper.length; ++i) {
        t_cmf_ii_upper[i] = (0, utilities_js_1.round)(t_cmf_ii_upper[i], 1);
    }
    for (let i = 0; i < t_cmf_iii_upper.length; ++i) {
        t_cmf_iii_upper[i] = (0, utilities_js_1.round)(t_cmf_iii_upper[i], 1);
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
exports.adaptive_en_array = adaptive_en_array;
/**
 *
 * @param {number} v
 * @param {number} to
 * @returns {number}
 */
function get_ce(v, to) {
    let ce = 0;
    if (v >= 0.6 && to >= 25.0) {
        if (v < 0.9) {
            ce = 1.2;
        }
        else if (v < 1.2) {
            ce = 1.8;
        }
        else {
            ce = 2.2;
        }
    }
    return ce;
}
exports.get_ce = get_ce;
