import { notOfType } from "../_internal/errors.ts";

/**
 * Calculate the dew point temperature.
 *
 * The equation uses the Magnus formula with coefficients from
 * the 2024 edition of the Guide to Instruments and Methods of
 * Observation. [WMO2024](../../docs/references.md#wmo2024).
 *
 * @param tdb - Dry bulb air temperature, [°C]
 * @param rh - Relative humidity, [%]
 * @returns Dew point temperature, [°C]
 * @throws `RangeError` If relative humidity is outside the range [0, 100]%.
 *
 * @example
 * ```ts
 * import { dew_point_tmp } from "jsthermalcomfort/psychrometrics";
 *
 * const tdb = 25.0; // dry bulb temperature in °C
 * const rh = 60.0; // relative humidity in %
 * const t_d = dew_point_tmp(tdb, rh);
 * ```
 */
export function dew_point_tmp(tdb: number, rh: number): number {
  if (typeof (tdb as unknown) !== "number") throw notOfType("tdb", "a number");
  if (typeof (rh as unknown) !== "number") throw notOfType("rh", "a number");

  if (rh < 0 || rh > 100) {
    throw new RangeError("Relative humidity must be between 0 and 100%.");
  }

  const e_w = 6.112 * Math.exp((17.62 * tdb) / (243.12 + tdb)); // saturation vapor pressure in hPa
  const e_s = (rh / 100) * e_w; // actual vapor pressure in hPa
  return (243.12 * Math.log(e_s / 6.112)) / (17.62 - Math.log(e_s / 6.112));
}
