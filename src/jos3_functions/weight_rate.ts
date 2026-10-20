import { Default } from "./Default.ts";
import { require_numeric } from "../_internal/numpy.ts";

// Upstream does not validate the weight here (construction.py:190-203 at
// v4.6.2), so neither does this any more.
/**
 * Calculate the ratio of the body weight to the standard body (74.43 kg).
 *
 * The standard values of local body weights are as as follows:
 *   weight_local = [
 *       3.18, 0.84, 12.4, 11.03, 17.57,
 *       2.16, 1.37, 0.34, 2.16, 1.37, 0.34,
 *       7.01, 3.34, 0.48, 7.01, 3.34, 0.48
 *   ]
 *
 * The data have been derived from 65MN.
 * The weight of neck is extracted from the weight of 65MN's head based on
 * the local body surface area of Smith's model.
 *
 * @param {number} weight - The body weight [kg].
 *
 * @returns {number} the ratio of the body weight to the standard body (74.43 kg).
 *
 * @throws {TypeError} For a weight that is not a number, as upstream's
 * division raises.
 */
export function weight_rate(weight: number): number {
  require_numeric(weight, "/", "arithmetic");
  return weight / Default.weight;
}
