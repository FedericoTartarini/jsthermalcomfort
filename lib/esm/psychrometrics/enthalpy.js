"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enthalpy = void 0;
const utilities_js_1 = require("../utilities/utilities.js");
/**
 * Calculates air enthalpy
 *
 * @public
 * @memberof psychrometrics
 *
 * @param {number} tdb air temperature [C]
 * @param {number} hr - humidity ratio [kg water/kg dry air]
 * @returns {number} enthalpy [J/kg dry air]
 */
function enthalpy(tdb, hr) {
    const cp_air = 1004;
    const h_fg = 2501000;
    const cp_vapor = 1805.0;
    const dryAir = cp_air * tdb;
    const satVap = h_fg + cp_vapor * tdb;
    const h = dryAir + hr * satVap;
    return (0, utilities_js_1.round)(h, 2);
}
exports.enthalpy = enthalpy;
