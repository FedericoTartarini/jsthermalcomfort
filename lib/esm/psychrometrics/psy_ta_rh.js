"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.psy_ta_rh = void 0;
const p_sat_js_1 = require("./p_sat.js");
const t_dp_js_1 = require("./t_dp.js");
const t_wb_js_1 = require("./t_wb.js");
const enthalpy_js_1 = require("./enthalpy.js");
/**
 * @typedef {object} PsyTaRhReturnType
 * @property {number} p_vap - partial pressure of water vapor in moist air, [Pa]
 * @property {number} hr - humidity ratio, [kg water/kg dry air]
 * @property {number} t_wb - wet bulb temperature, [°C]
 * @property {number} t_dp - dew point temperature, [°C]
 * @property {number} h - enthalpy [J/kg dry air]
 * @public
 */
/**
 * Calculates psychrometric values of air based on dry bulb air temperature and
 * relative humidity.
 *
 * @public
 * @memberof psychrometrics
 *
 * @param {number} tdb - air temperature, [°C]
 * @param {number} rh - relative humidity, [%]
 * @param {number} [p_atm = 101325] - atmospheric pressure, [Pa]
 *
 * @returns {PsyTaRhReturnType} object with calculated psychrometrics values
 *
 * @example
 * import { psy_ta_rh } from "jsthermalcomfort";
 * const results = psy_ta_rh(21, 56);
 * console.log(results); // { p_sat: 2487.7, p_vap: 1393.112, hr: -2.2041754048718936, t_wb: 15.4, t_dp: 11.9, h: -5575107.96 }
 */
function psy_ta_rh(tdb, rh, p_atm = 101325) {
    const p_saturation = (0, p_sat_js_1.p_sat)(tdb);
    const p_vap = (rh / 100) * p_saturation;
    const hr = (0.62198 * p_vap) / (p_atm - p_vap);
    const tdp = (0, t_dp_js_1.t_dp)(tdb, rh);
    const twb = (0, t_wb_js_1.t_wb)(tdb, rh);
    const h = (0, enthalpy_js_1.enthalpy)(tdb, hr);
    return {
        p_sat: p_saturation,
        t_wb: twb,
        t_dp: tdp,
        p_vap,
        hr,
        h,
    };
}
exports.psy_ta_rh = psy_ta_rh;
