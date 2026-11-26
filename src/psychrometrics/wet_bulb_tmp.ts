import { notOfType } from "../_internal/errors.ts";

/**
 * Calculate the wet-bulb temperature using the Stull equation [Stull2011](../../docs/references.md#stull2011).
 *
 * @param tdb - air temperature, [°C]
 * @param rh - relative humidity, [%]
 * @returns wet-bulb temperature, [°C]
 */
export function wet_bulb_tmp(tdb: number, rh: number): number {
  if (typeof (tdb as unknown) !== "number") throw notOfType("tdb", "a number");
  if (typeof (rh as unknown) !== "number") throw notOfType("rh", "a number");

  return (
    tdb * Math.atan(0.151977 * (rh + 8.313659) ** 0.5) +
    Math.atan(tdb + rh) -
    Math.atan(rh - 1.676331) +
    0.00391838 * rh ** 1.5 * Math.atan(0.023101 * rh) -
    4.686035
  );
}
