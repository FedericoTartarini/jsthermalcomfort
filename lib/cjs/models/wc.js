"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wc = void 0;
const utilities_js_1 = require("../utilities/utilities.js");
/**
 * Calculates the Wind Chill Index (WCI) in accordance with the ASHRAE 2017 Handbook Fundamentals - Chapter 9 {@link #ref_18|[18]}.
 *
 * The wind chill index (WCI) is an empirical index based on cooling measurements taken on a cylindrical flask partially
 * filled with water in Antarctica (Siple and Passel 1945). For a surface temperature of 33°C, the index describes the
 * rate of heat loss from the cylinder via radiation and convection as a function of ambient temperature and wind velocity.
 *
 * This formulation has been met with some valid criticism. WCI is unlikely to be an accurate measure of heat loss from
 * exposed flesh, which differs from plastic in terms of curvature, roughness, and radiation exchange qualities, and is
 * always below 33°C in a cold environment. Furthermore, the equation’s values peak at 90 km/h and then decline as velocity
 * increases. Nonetheless, this score reliably represents the combined effects of temperature and wind on subjective discomfort
 * for velocities below 80 km/h {@link #ref_18|[18]}.
 *
 * @public
 * @memberof models
 * @docname Wind chill index
 *
 * @param {number} tdb - dry bulb air temperature,[°C]
 * @param {number} v - wind speed 10m above ground level, [m/s]
 * @param {object} [kwargs] (Optional) Other parameters.
 * @param {boolean} [kwargs.round=true] - If True rounds output value, if False it does not round it.
 * @returns {{wci: number}} wind chill index, [W/m2]
 */
function wc(tdb, v, kwargs = { round: true }) {
    let wci = (10.45 + 10 * Math.pow(v, 0.5) - v) * (33 - tdb);
    // the factor 1.163 is used to convert to W/m2
    wci = wci * 1.163;
    if (kwargs.round) {
        wci = (0, utilities_js_1.round)(wci, 1);
    }
    return { wci: wci };
}
exports.wc = wc;
