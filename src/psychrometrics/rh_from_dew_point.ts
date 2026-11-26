import { notOfType } from "../_internal/errors.ts";

/**
 * Calculates the relative humidity from the dew point temperature.
 *
 * Algebraic inverse of the Magnus formula used by {@link dew_point_tmp}, with
 * the same coefficients. The result is not clamped, so a dew point above `tdb`
 * reads above 100 %.
 *
 * @param {number} t_dp - dew point temperature, [°C]
 * @param {number} tdb - dry bulb air temperature, [°C]
 * @returns {number} - relative humidity, [%]
 *
 * @example
 * import { rh_from_dew_point } from "jsthermalcomfort";
 * const rh = rh_from_dew_point(11.9, 21);
 * console.log(rh); // 56.059759430531365
 */
export function rh_from_dew_point(t_dp: number, tdb: number): number {
  for (const [key, value] of Object.entries({ t_dp, tdb })) {
    if (typeof (value as unknown) !== "number")
      throw notOfType(key, "a number");
  }
  // dew_point_tmp solves t_dp = 243.12 · γ / (17.62 − γ) with
  // γ = ln(rh / 100) + 17.62 · tdb / (243.12 + tdb).
  const gamma_m = (17.62 * t_dp) / (243.12 + t_dp);
  const gamma_sat = (17.62 * tdb) / (243.12 + tdb);

  return 100 * Math.exp(gamma_m - gamma_sat);
}
