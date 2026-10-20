import { ewa } from "../_numpy.ts";
import type { NumOrArray } from "../_numpy.ts";
import { natural_convection } from "./natural_convection.ts";
import { forced_convection } from "./forced_convection.ts";
import type { JOS3Posture } from "./_posture.ts";

// Upstream's conv_coef takes no defaults (thermoregulation.py:204-237 at
// v4.6.2); its docstring's "The default is ..." lines describe none.
/**
 * Calculate convective heat transfer coefficient (hc) [W/(m2*K)]
 *
 * @param {JOS3Posture} posture - Select posture from standing, sitting, lying, sedentary or supine, in any case.
 * @param {number | number[]} v - Air velocity [m/s]. If an array is input, its length should be 17.
 * @param {number | number[]} tdb - Air temperature [°C]. If an array is input, its length should be 17.
 * @param {number | number[]} t_skin - Skin temperature [°C]. If an array is input, its length should be 17.
 *
 * @returns {number[]} Convective heat transfer coefficient (hc) [W/(m2*K)].
 *
 * @see {@link https://doi.org/10.3130/aija.62.45_5 | Ichihara et al., 1997}
 * @see {@link https://doi.org/10.20718/jjpa.13.1_17 | Kurazumi et al., 2008}
 */
export function conv_coef(
  posture: JOS3Posture,
  v: NumOrArray,
  tdb: NumOrArray,
  t_skin: NumOrArray,
): number[] {
  const hc_natural = natural_convection(posture, tdb, t_skin);
  const hc_forced = forced_convection(v);
  // np.where(v < 0.2, hc_natural, hc_forced)
  return ewa((x, n, f) => (x < 0.2 ? n : f), v, hc_natural, hc_forced); // hc [W/(m2*K))]
}
