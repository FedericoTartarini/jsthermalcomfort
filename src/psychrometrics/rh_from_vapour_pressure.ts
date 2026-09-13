import { p_sat } from "./p_sat.js";

/**
 * Calculates the relative humidity from the partial pressure of water vapour.
 *
 * Inverse of the `p_vap` returned by {@link psy_ta_rh}: `rh = 100 · p_vap / p_sat(tdb)`,
 * with the same {@link p_sat}. The result is not clamped, so a `p_vap` above
 * saturation reads above 100 %.
 *
 * @public
 * @memberof psychrometrics
 *
 * @param {number} p_vap - partial pressure of water vapour in moist air, [Pa]
 * @param {number} tdb - dry bulb air temperature, [°C]
 * @returns {number} - relative humidity, [%]
 *
 * @example
 * import { rh_from_vapour_pressure } from "jsthermalcomfort";
 * const rh = rh_from_vapour_pressure(1393.112, 21);
 * console.log(rh); // 56
 */
export function rh_from_vapour_pressure(p_vap: number, tdb: number): number {
  return (100 * p_vap) / p_sat(tdb);
}
