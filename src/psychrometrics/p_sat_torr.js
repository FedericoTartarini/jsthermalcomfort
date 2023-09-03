/**
 * Estimates the saturation vapour pressure in [torr].
 *
 * @param {number} tdb  - dry bulb air temperature [C]
 * @returns {number} saturation vapour pressure [torr]
 */
export function p_sat_torr(tdb) {
  return Math.exp(18.6686 - 4030.183 / (tdb + 235.0));
}
