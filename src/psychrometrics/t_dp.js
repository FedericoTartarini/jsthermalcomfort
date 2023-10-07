import { round } from "../utilities/utilities.js";

/**
 * Calculates the dew point temperature.
 *
 * @param {number} tdb - dry bulb air temperature, [°C]
 * @param {number} rh - relative humidity, [%]
 * @returns {number} - dew point temperature, [°C]
 */
export function t_dp(tdb, rh) {
  const c = 257.14;
  const b = 18.678;
  const d = 234.5;

  const gamma_m = Math.log(
    (rh / 100) * Math.exp((b - tdb / d) * (tdb / (c + tdb))),
  );

  return round((c * gamma_m) / (b - gamma_m), 1);
}
