import { rh_from_vapour_pressure } from "./rh_from_vapour_pressure.ts";

/**
 * Converts the humidity ratio to relative humidity.
 *
 * Algebraic inverse of the `hr` returned by {@link psy_ta_rh}, through the
 * vapour pressure `p_vap = hr · p_atm / (0.62198 + hr)` and
 * `rh = 100 · p_vap / p_sat(tdb)`. Same name and signature as
 * pythermalcomfort's `hr_to_rh`. The result is not clamped.
 *
 * @public
 * @memberof psychrometrics
 *
 * @param {number} hr - humidity ratio, [kg water/kg dry air]
 * @param {number} tdb - dry bulb air temperature, [°C]
 * @param {number} [p_atm = 101325] - atmospheric pressure, [Pa]
 * @returns {number} - relative humidity, [%]
 *
 * @example
 * import { hr_to_rh } from "jsthermalcomfort";
 * const rh = hr_to_rh(0.00867078386190402, 21);
 * console.log(rh); // 56
 */
export function hr_to_rh(hr: number, tdb: number, p_atm = 101325): number {
  const p_vap = (hr * p_atm) / (0.62198 + hr);
  return rh_from_vapour_pressure(p_vap, tdb);
}
