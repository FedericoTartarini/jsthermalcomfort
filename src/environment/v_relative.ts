import { notOfType } from "../_internal/errors.ts";
import { round } from "../_internal/round.ts";

/**
 * Estimates the relative air speed which combines the average air speed of the
 * space plus the relative air speed caused by the body movement. The same equation is
 * used in the ASHRAE 55:2023 and ISO 7730 [7730ISO2005](../../docs/references.md#7730iso2005)
 * [7730ISO2025](../../docs/references.md#7730iso2025) standards.
 *
 * @param v - air speed measured by the sensor, [m/s]
 * @param met - metabolic rate, [met]
 * @returns relative air speed, [m/s]
 */
export function v_relative(v: number, met: number): number {
  for (const [key, value] of Object.entries({ v, met })) {
    if (typeof (value as unknown) !== "number")
      throw notOfType(key, "a number");
  }
  return met > 1 ? round(v + 0.3 * (met - 1), 3) : v;
}
