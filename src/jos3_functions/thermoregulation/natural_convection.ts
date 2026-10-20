import { ewa } from "../../_internal/numpy.ts";
import type { NumOrArray } from "../../_internal/numpy.ts";
import { invalid_posture, lower_posture } from "./_posture.ts";
import type { JOS3Posture } from "./_posture.ts";

// Was a closure inside conv_coef; upstream's module-level function
// (thermoregulation.py:16-140 at v4.6.2), one file per function.
/**
 * Calculate the natural convection heat transfer coefficient based on posture.
 *
 * @param {JOS3Posture} posture - The posture of the subject. Valid options
 * are "standing", "sitting", "lying", "sedentary", "supine", in any case.
 * @param {number | number[]} tdb - Dry bulb temperature [°C].
 * @param {number | number[]} t_skin - Skin temperature [°C].
 *
 * @returns {number[]} hc_natural - Natural convection heat transfer coefficient body segments.
 *
 * @throws {Error} If the posture is not one of the valid options.
 */
export function natural_convection(
  posture: JOS3Posture,
  tdb: NumOrArray,
  t_skin: NumOrArray,
): number[] {
  const p = lower_posture(posture);
  if (p === "standing") {
    // Ichihara et al., 1997, https://doi.org/10.3130/aija.62.45_5
    return [
      4.48, 4.48, 2.97, 2.91, 2.85, 3.61, 3.55, 3.67, 3.61, 3.55, 3.67, 2.8,
      2.04, 2.04, 2.8, 2.04, 2.04,
    ];
  }
  if (p === "sitting" || p === "sedentary") {
    // Ichihara et al., 1997, https://doi.org/10.3130/aija.62.45_5
    return [
      4.75, 4.75, 3.12, 2.48, 1.84, 3.76, 3.62, 2.06, 3.76, 3.62, 2.06, 2.98,
      2.98, 2.62, 2.98, 2.98, 2.62,
    ];
  }
  if (p === "lying" || p === "supine") {
    // Kurazumi et al., 2008, https://doi.org/10.20718/jjpa.13.1_17
    // The values are applied under cold environment.
    const hc_a = [
      1.105, 1.105, 1.211, 1.211, 1.211, 0.913, 2.081, 2.178, 0.913, 2.081,
      2.178, 0.945, 0.385, 0.2, 0.945, 0.385, 0.2,
    ];
    const hc_b = [
      0.345, 0.345, 0.046, 0.046, 0.046, 0.373, 0.85, 0.297, 0.373, 0.85, 0.297,
      0.447, 0.58, 0.966, 0.447, 0.58, 0.966,
    ];
    return ewa(
      (a, b, t, s) => a * Math.abs(t - s) ** b,
      hc_a,
      hc_b,
      tdb,
      t_skin,
    );
  }
  throw invalid_posture(posture);
}
