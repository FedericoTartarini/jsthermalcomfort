import { Default } from "../Default.ts";
import { ewa, np_average } from "../_numpy.ts";

/**
 * Fixes hr values to fit two-node-model's values
 * (`pythermalcomfort/jos3_functions/thermoregulation.py:359-374` at v4.6.2).
 *
 * @param {number[]} hr - Radiative heat transfer coefficient (hr) [W/(m2*K)], 17 values.
 * @return {number[]} Fixed radiative heat transfer coefficient (hr) [W/(m2*K)].
 *
 * @throws {TypeError} If hr is not 17 values, as numpy's average raises.
 */
export function fixed_hr(hr: readonly number[]): number[] {
  const mean_hr = np_average(hr, Default.local_bsa);
  return ewa((h) => (h * 4.7) / mean_hr, hr);
}
