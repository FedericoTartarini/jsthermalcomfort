import { clo_area_factor } from "./clo_area_factor.ts";
import { ew, py_div } from "../../_internal/numpy.ts";
import type { NumOrArray } from "../../_internal/numpy.ts";

// Upstream's message (thermoregulation.py:480-481 at v4.6.2), a ValueError
// for a value out of range, so a RangeError (ADR 0012); it used to read
// "Input parameter hc must be non-negative.". Upstream's i_clo and
// lewis_rate have no defaults (:450-455), so neither have these.
/**
 * Calculate total evaporative thermal resistance (between the skin and ambient air).
 *
 * @param {number | number[]} hc - Convective heat transfer coefficient (hc) [W/(m2*K)].
 * @param {number | number[]} clo - Clothing insulation [clo].
 * @param {number | number[]} i_clo - Clothing vapor permeation efficiency [-].
 * @param {number} lewis_rate - Lewis rate [K/kPa].
 *
 * @returns {number | number[]} r_et - Total evaporative thermal resistance: a number for numbers, an array otherwise.
 *
 * @throws {RangeError} If hc is negative; and if a divisor is 0 and its
 * operands are numbers, as Python's division raises a ZeroDivisionError.
 */
export function wet_r(
  hc: number,
  clo: number,
  i_clo: number,
  lewis_rate: number,
): number;
export function wet_r(
  hc: NumOrArray,
  clo: NumOrArray,
  i_clo: NumOrArray,
  lewis_rate: number,
): number[];
export function wet_r(
  hc: NumOrArray,
  clo: NumOrArray,
  i_clo: NumOrArray,
  lewis_rate: number,
): number | number[] {
  if (typeof hc === "number" ? hc < 0 : hc.some((v) => v < 0)) {
    throw new RangeError("Input parameters hc must be non-negative.");
  }

  const fcl = clo_area_factor(clo);
  const r_cl = ew((c) => 0.155 * c, clo);
  const r_ea = ew(
    (c) =>
      typeof hc === "number" ? py_div(1, lewis_rate * c) : 1 / (lewis_rate * c),
    hc,
  );
  const r_ecl = ew(
    (r, i) =>
      typeof r_cl === "number" && typeof i_clo === "number"
        ? py_div(r, lewis_rate * i)
        : r / (lewis_rate * i),
    r_cl,
    i_clo,
  );
  return ew((a, f, e) => a / f + e, r_ea, fcl, r_ecl);
}
