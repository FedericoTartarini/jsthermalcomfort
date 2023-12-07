"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.t_dp = void 0;
const utilities_js_1 = require("../utilities/utilities.js");
/**
 * Calculates the dew point temperature.
 *
 * @param {number} tdb - dry bulb air temperature, [°C]
 * @param {number} rh - relative humidity, [%]
 * @returns {number} - dew point temperature, [°C]
 */
function t_dp(tdb, rh) {
    const c = 257.14;
    const b = 18.678;
    const d = 234.5;
    const gamma_m = Math.log((rh / 100) * Math.exp((b - tdb / d) * (tdb / (c + tdb))));
    return (0, utilities_js_1.round)((c * gamma_m) / (b - gamma_m), 1);
}
exports.t_dp = t_dp;
