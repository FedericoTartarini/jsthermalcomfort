import { notOfType } from "../_internal/errors.ts";

/**
 * Calculate saturated vapor pressure using Antoine equation [kPa].
 *
 * @param tdb - Temperature [°C].
 * @returns Saturated vapor pressure [kPa].
 */
export function antoine(tdb: number): number {
  if (typeof (tdb as unknown) !== "number") throw notOfType("tdb", "a number");
  return Math.E ** (16.6536 - 4030.183 / (tdb + 235));
}
