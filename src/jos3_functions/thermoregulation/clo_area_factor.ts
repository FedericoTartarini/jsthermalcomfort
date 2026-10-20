import { ew } from "../_numpy.ts";

/**
 * Calculate clothing area factor
 * (`pythermalcomfort/jos3_functions/thermoregulation.py:400-414` at v4.6.2).
 *
 * @param {number | number[]} clo - Clothing insulation [clo].
 *
 * @returns {number | number[]} clothing area factor [-]: a number for a number, an array for an array.
 */
export function clo_area_factor(clo: number): number;
export function clo_area_factor(clo: readonly number[]): number[];
export function clo_area_factor(
  clo: number | readonly number[],
): number | number[];
export function clo_area_factor(
  clo: number | readonly number[],
): number | number[] {
  // np.where(clo < 0.5, clo * 0.2 + 1, clo * 0.1 + 1.05)
  return ew((c) => (c < 0.5 ? c * 0.2 + 1 : c * 0.1 + 1.05), clo);
}
