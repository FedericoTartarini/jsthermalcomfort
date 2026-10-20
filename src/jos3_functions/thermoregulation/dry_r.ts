import { clo_area_factor } from "./clo_area_factor.ts";
import { ew, py_div } from "../../_internal/numpy.ts";
import type { NumOrArray } from "../../_internal/numpy.ts";

// Upstream's message (thermoregulation.py:440-441 at v4.6.2), a ValueError
// for a value out of range, so a RangeError (ADR 0012).
/**
 * Calculate total sensible thermal resistance (between the skin and ambient air).
 *
 * @param {number | number[]} hc - Convective heat transfer coefficient (hc) [W/(m2*K)].
 * @param {number | number[]} hr - Radiative heat transfer coefficient (hr) [W/(m2*K)].
 * @param {number | number[]} clo - Clothing insulation [clo].
 *
 * @returns {number | number[]} Total sensible thermal resistance between skin and ambient: a number for numbers, an array otherwise.
 *
 * @throws {RangeError} If hc or hr is negative; and if hc + hr is 0 and
 * both are numbers, as Python's division raises a ZeroDivisionError.
 */
export function dry_r(hc: number, hr: number, clo: number): number;
export function dry_r(
  hc: NumOrArray,
  hr: NumOrArray,
  clo: NumOrArray,
): number[];
export function dry_r(
  hc: NumOrArray,
  hr: NumOrArray,
  clo: NumOrArray,
): number | number[] {
  const negative = (x: NumOrArray) =>
    typeof x === "number" ? x < 0 : x.some((v) => v < 0);
  if (negative(hc) || negative(hr)) {
    throw new RangeError("Input parameters hc and hr must be non-negative.");
  }

  const fcl = clo_area_factor(clo);
  const scalar = typeof hc === "number" && typeof hr === "number";
  const r_a = ew((c, h) => (scalar ? py_div(1, c + h) : 1 / (c + h)), hc, hr);
  const r_cl = ew((c) => 0.155 * c, clo);
  return ew((a, f, c) => a / f + c, r_a, fcl, r_cl);
}
