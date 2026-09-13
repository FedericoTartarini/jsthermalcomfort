/**
 * Calculates the relative humidity from the dew point temperature.
 *
 * Algebraic inverse of the Magnus formula used by {@link t_dp}, with the same
 * coefficients, before its 0.1 °C rounding. The result is not clamped, so a
 * dew point above `tdb` reads above 100 %.
 *
 * @public
 * @memberof psychrometrics
 *
 * @param {number} t_dp - dew point temperature, [°C]
 * @param {number} tdb - dry bulb air temperature, [°C]
 * @returns {number} - relative humidity, [%]
 *
 * @example
 * import { rh_from_dew_point } from "jsthermalcomfort";
 * const rh = rh_from_dew_point(11.9, 21);
 * console.log(rh); // 55.9...
 */
export function rh_from_dew_point(t_dp: number, tdb: number): number {
  // Same coefficients as t_dp.
  const c = 257.14;
  const b = 18.678;
  const d = 234.5;

  // t_dp solves t_dp = c · γ / (b − γ) with
  // γ = ln(rh / 100 · exp((b − tdb / d) · tdb / (c + tdb))).
  const gamma_m = (b * t_dp) / (c + t_dp);
  const gamma_sat = (b - tdb / d) * (tdb / (c + tdb));

  return 100 * Math.exp(gamma_m - gamma_sat);
}
