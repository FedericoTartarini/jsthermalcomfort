/**
 * Estimates the saturation vapour pressure in [torr].
 *
 * @public
 * @memberof psychrometrics
 *
 * @see {@link p_sat_torr_array} for a version that supports arrays
 *
 * @param {number} tdb  - dry bulb air temperature [C]
 * @returns {number} saturation vapour pressure [torr]
 */
export function p_sat_torr(tdb) {
    return Math.exp(18.6686 - 4030.183 / (tdb + 235.0));
}
/**
 * Estimates the saturation vapour pressure in [torr].
 *
 *
 * @public
 * @memberof psychrometrics
 *
 * @see {@link p_sat_torr} for a version that supports scalar arguments
 *
 * @param {number[]} tdb  - dry bulb air temperature [C]
 * @returns {number[]} saturation vapour pressure [torr]
 */
export function p_sat_torr_array(tdb) {
    return tdb.map(p_sat_torr);
}
