import { Default } from "../Default.ts";
import { ewa, np_average, py_max } from "../../_internal/numpy.ts";
import type { NumOrArray } from "../../_internal/numpy.ts";

/**
 * Fixes hc values to fit two-node-model's values
 * (`pythermalcomfort/jos3_functions/thermoregulation.py:337-356` at v4.6.2).
 *
 * @param {number[]} hc - Convective heat transfer coefficient (hc) [W/(m2*K)], 17 values.
 * @param {number[]} v - Air velocity [m/s], 17 values.
 *
 * @returns {number[]} Fixed convective heat transfer coefficient (hc) [W/(m2*K)].
 *
 * @throws {TypeError} If hc or v is not 17 values, as numpy's average raises.
 */
export function fixed_hc(hc: readonly number[], v: NumOrArray): number[] {
  const mean_hc = np_average(hc, Default.local_bsa);
  const mean_va = np_average(v, Default.local_bsa);
  // Python's max: 3 when the coefficient is NaN, where Math.max gives NaN.
  const mean_hc_whole = py_max(3, 8.600001 * mean_va ** 0.53);
  return ewa((h) => (h * mean_hc_whole) / mean_hc, hc);
}
