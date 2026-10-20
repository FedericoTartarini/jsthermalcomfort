import { Default } from "./Default.ts";
import { bsa_rate } from "./bsa_rate.ts";

// Upstream does not validate the body here (construction.py:146-187 at
// v4.6.2), so neither does this any more.
/**
 * Calculate local body surface area (bsa) [m2].
 *
 * The local body surface area has been derived from 65MN.
 * The head have been divided to head and neck based on Smith's model.
 *     head = 0.1396*0.1117/0.1414 (65MN_Head * Smith_Head / Smith_Head+neck)
 *     neck = 0.1396*0.0297/0.1414 (65MN_Head * Smith_Neck / Smith_Head+neck)
 *
 * @param {number} height - Body height [m]
 * @param {number} weight - Body weight [kg]
 * @param {string} bsa_equation - The equation name
 * of bsa calculation. Choose a name from "dubois", "takahira", "fujimoto",
 * or "kurazumi".
 *
 * @returns {number[]} local_bsa of length 17 - Local body surface area (bsa) [m2]
 */
export function local_bsa(
  height: number,
  weight: number,
  bsa_equation: string,
): number[] {
  const bsa_ratio = bsa_rate(height, weight, bsa_equation);
  return Default.local_bsa.map((x) => x * bsa_ratio);
}
