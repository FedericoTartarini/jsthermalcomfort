import { ew } from "../_numpy.ts";

// New: upstream's tetens (thermoregulation.py:539-552 at v4.6.2), which the
// library lacked. Upstream's model does not call it.
/**
 * Calculate saturated vapor pressure using Tetens equation [kPa].
 *
 * @param {number | number[]} x - Temperature [°C].
 * @returns {number | number[]} Saturated vapor pressure [kPa].
 */
export function tetens(x: number): number;
export function tetens(x: readonly number[]): number[];
export function tetens(x: number | readonly number[]): number | number[] {
  return ew((t) => 0.61078 * 10 ** ((7.5 * t) / (t + 237.3)), x);
}
