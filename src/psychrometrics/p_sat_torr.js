/**
 * Estimates the saturation vapour pressure in [torr].
 *
 * Estimates the saturation vapour pressure in [torr].
 *
 * @param {number} dryBulbAirTemp  - dry bulb air temperature [C]
 * @returns {number} saturation vapour pressure [torr]
 */
export function p_sat_torr(dryBulbAirTemp) {
  return Math.exp(18.6686 - 4030.183 / (dryBulbAirTemp + 235.0));
}
