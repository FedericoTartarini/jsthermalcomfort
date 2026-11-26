import { notOfType } from "../_internal/errors.ts";

/**
 * Estimates the saturation vapor pressure in [torr].
 *
 * @param tdb - dry bulb air temperature, [C]
 * @returns saturation vapor pressure [torr]
 */
export function p_sat_torr(tdb: number): number {
  if (typeof (tdb as unknown) !== "number") throw notOfType("tdb", "a number");
  return Math.exp(18.6686 - 4030.183 / (tdb + 235.0));
}
