"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.heat_index = void 0;
const utilities_js_1 = require("../utilities/utilities.js");
/**
 * Calculates the Heat Index (HI). It combines air temperature and relative humidity to determine an apparent temperature.
 * The HI equation {@link #ref_12|[12]} is derived by multiple regression analysis in temperature and relative humidity from the first version
 * of Steadman’s (1979) apparent temperature (AT) {@link #ref_13|[13]}.
 *
 * @public
 * @memberof models
 * @docname Heat Index
 *
 * @param {number} tdb Dry bulb air temperature, default in [°C] in [°F] if `units` = 'IP'.
 * @param {number} rh Relative humidity, [%].
 * @param {Object} [options] (Optional) Other parameters.
 * @param {boolean} [options.round=true] - If True rounds output value, if False it does not round it.
 * @param {"SI" | "IP"} [options.units="SI"] - Select the SI (International System of Units) or the IP (Imperial Units) system.
 *
 * @returns {number} Heat Index, default in [°C] in [°F] if `units` = 'IP'.
 *
 * @example
 * const hi = heat_index(25, 50); // returns 25.9
 *
 * @category Thermophysiological models
 */
function heat_index(tdb, rh, options = { round: true, units: "SI" }) {
    /**
     * @type {number}
     */
    let hi;
    let tdb_squared = Math.pow(tdb, 2);
    let rh_squared = Math.pow(rh, 2);
    if (options.units === undefined || options.units === "SI") {
        hi =
            -8.784695 +
                1.61139411 * tdb +
                2.338549 * rh -
                0.14611605 * tdb * rh -
                0.012308094 * tdb_squared -
                0.016424828 * rh_squared +
                0.002211732 * tdb_squared * rh +
                0.00072546 * tdb * rh_squared -
                0.000003582 * tdb_squared * rh_squared;
    }
    else {
        hi =
            -42.379 +
                2.04901523 * tdb +
                10.14333127 * rh -
                0.22475541 * tdb * rh -
                0.00683783 * tdb_squared -
                0.05481717 * rh_squared +
                0.00122874 * tdb_squared * rh +
                0.00085282 * tdb * rh_squared -
                0.00000199 * tdb_squared * rh_squared;
    }
    return options.round === undefined || options.round ? (0, utilities_js_1.round)(hi, 1) : hi;
}
exports.heat_index = heat_index;
