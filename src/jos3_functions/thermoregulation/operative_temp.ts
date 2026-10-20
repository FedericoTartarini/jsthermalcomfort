import { ew, py_div } from "../_numpy.ts";
import type { NumOrArray } from "../_numpy.ts";

/**
 * Calculate operative temperature [°C]
 * (`pythermalcomfort/jos3_functions/thermoregulation.py:377-397` at v4.6.2).
 *
 * @param {number | number[]} tdb - Air temperature [°C]
 * @param {number | number[]} tr - Mean radiant temperature [°C]
 * @param {number | number[]} hc - Convective heat transfer coefficient [W/(m2*K)]
 * @param {number | number[]} hr - Radiative heat transfer coefficient [W/(m2*K)]
 *
 * @returns {number | number[]} Operative temperature [°C]: a number for numbers, an array otherwise.
 *
 * @throws {RangeError} If hc + hr is 0 and every input is a number, as
 * Python's division raises a ZeroDivisionError (ADR 0012); with an array
 * the element is ±Infinity or NaN, as numpy's.
 */
export function operative_temp(
  tdb: number,
  tr: number,
  hc: number,
  hr: number,
): number;
export function operative_temp(
  tdb: NumOrArray,
  tr: NumOrArray,
  hc: NumOrArray,
  hr: NumOrArray,
): number[];
export function operative_temp(
  tdb: NumOrArray,
  tr: NumOrArray,
  hc: NumOrArray,
  hr: NumOrArray,
): number | number[] {
  const scalar = [tdb, tr, hc, hr].every((x) => typeof x === "number");
  return ew(
    (t, r, c, h) =>
      scalar ? py_div(c * t + h * r, c + h) : (c * t + h * r) / (c + h),
    tdb,
    tr,
    hc,
    hr,
  );
}
