import { invalid_posture, lower_posture } from "./_posture.ts";
import type { JOS3Posture } from "./_posture.ts";

// Upstream lowers the posture (thermoregulation.py:253, :276, :299 at
// v4.6.2), so "Standing" is accepted, where this used to throw; its message
// is upstream's.
/**
 * Calculate radiative heat transfer coefficient (hr) [W/(m2*K)]
 *
 * @param {JOS3Posture} posture - Select posture from standing, sitting, lying, sedentary or supine, in any case.
 *
 * @returns {number[]} hr - Radiative heat transfer coefficient (hr) [W/(m2*K)].
 *
 * @throws {Error} If the posture is not one of the valid options.
 */
export function rad_coef(posture: JOS3Posture): number[] {
  const p = lower_posture(posture);
  if (p === "standing") {
    // Ichihara et al., 1997, https://doi.org/10.3130/aija.62.45_5
    return [
      4.89, 4.89, 4.32, 4.09, 4.32, 4.55, 4.43, 4.21, 4.55, 4.43, 4.21, 4.77,
      5.34, 6.14, 4.77, 5.34, 6.14,
    ];
  }
  if (p === "sitting" || p === "sedentary") {
    // Ichihara et al., 1997, https://doi.org/10.3130/aija.62.45_5
    return [
      4.96, 4.96, 3.99, 4.64, 4.21, 4.96, 4.21, 4.74, 4.96, 4.21, 4.74, 4.1,
      4.74, 6.36, 4.1, 4.74, 6.36,
    ];
  }
  if (p === "lying" || p === "supine") {
    // Kurazumi et al., 2008, https://doi.org/10.20718/jjpa.13.1_17
    return [
      5.475, 5.475, 3.463, 3.463, 3.463, 4.249, 4.835, 4.119, 4.249, 4.835,
      4.119, 4.44, 5.547, 6.085, 4.44, 5.547, 6.085,
    ];
  }
  throw invalid_posture(posture);
}
