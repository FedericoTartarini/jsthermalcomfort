import { notOfType } from "../_internal/errors.ts";

/**
 * Calculate the operative temperature in accordance with ISO 7726:1998
 * [7726ISO1998](../../docs/references.md#7726iso1998).
 *
 * @param tdb - air temperature, [°C]
 * @param tr - mean radiant temperature, [°C]
 * @param v - air speed, [m/s]
 * @param standard - either choose between ISO and ASHRAE
 * @returns operative temperature, [°C]
 */
export function operative_tmp(
  tdb: number,
  tr: number,
  v: number,
  standard = "ISO",
): number {
  for (const [key, value] of Object.entries({ tdb, tr, v })) {
    if (typeof (value as unknown) !== "number")
      throw notOfType(key, "a number");
  }
  if (typeof (standard as unknown) !== "string") {
    throw notOfType("standard", "a string");
  }
  if (standard.toLowerCase() === "iso") {
    return (tdb * Math.sqrt(10 * v) + tr) / (1 + Math.sqrt(10 * v));
  }
  if (standard.toLowerCase() === "ashrae") {
    let a = v < 0.6 ? 0.6 : 0.7;
    a = v < 0.2 ? 0.5 : a;
    return a * tdb + (1 - a) * tr;
  }
  const error_message =
    `Operative temperature can only be calculated in compliance with ISO or ASHRAE standards. ` +
    `Received standard: ${standard}`;
  throw new RangeError(error_message);
}
