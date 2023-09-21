"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.t_wb = void 0;
/**
 * Calculates the wet-bulb temperature using the Stull equation {@link #ref_6|[6]}.
 *
 * @public
 * @memberof psychrometrics
 *
 * @param {number} tdb - air temperature, [°C]
 * @param {number} rh - relative humidity, [%]
 * @returns {number} - wet-bulb temperature, [°C]
 */
function t_wb(tdb, rh) {
    const twb = Math.round((tdb * Math.atan(0.151977 * Math.pow(rh + 8.313659, 0.5)) +
        Math.atan(tdb + rh) -
        Math.atan(rh - 1.676331) +
        0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh) -
        4.686035) *
        10) / 10;
    return twb;
}
exports.t_wb = t_wb;
