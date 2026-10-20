import { ewa } from "../../_internal/numpy.ts";
import type { NumOrArray } from "../../_internal/numpy.ts";

// Was a closure inside conv_coef; upstream's module-level function
// (thermoregulation.py:143-201 at v4.6.2), one file per function.
/**
 * Calculate the forced convection heat transfer coefficient.
 *
 * Ichihara et al., 1997, https://doi.org/10.3130/aija.62.45_5
 *
 * @param {number | number[]} v - Air velocity [m/s].
 *
 * @returns {number[]} Forced convection heat transfer coefficient body segments.
 */
export function forced_convection(v: NumOrArray): number[] {
  const hc_a = [
    15.0, 15.0, 11.0, 17.0, 13.0, 17.0, 17.0, 20.0, 17.0, 17.0, 20.0, 14.0,
    15.8, 15.1, 14.0, 15.8, 15.1,
  ];
  const hc_b = [
    0.62, 0.62, 0.67, 0.49, 0.6, 0.59, 0.61, 0.6, 0.59, 0.61, 0.6, 0.61, 0.74,
    0.62, 0.61, 0.74, 0.62,
  ];
  return ewa((a, b, x) => a * x ** b, hc_a, hc_b, v);
}
