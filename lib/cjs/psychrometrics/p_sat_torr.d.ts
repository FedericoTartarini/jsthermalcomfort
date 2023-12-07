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
export function p_sat_torr(tdb: number): number;
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
export function p_sat_torr_array(tdb: number[]): number[];
//# sourceMappingURL=p_sat_torr.d.ts.map