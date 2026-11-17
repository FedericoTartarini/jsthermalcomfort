import { notOfType } from "../_internal/errors.ts";
import {
  _correction_normal_clothing,
  _correction_nude,
} from "./_correction_clothing.ts";

/**
 * Calculates the total insulation of the clothing ensemble (I_T,r), which is
 * the actual thermal insulation from the body surface to the environment,
 * considering all clothing, enclosed air layers, and boundary air layers under
 * given environmental conditions and activities. It accounts for the effects
 * of movements and wind. The ISO 9920 standard provides different equations to
 * calculate it as a function of the total thermal insulation of clothing
 * (I_T), the insulation of the boundary air layer (I_a), the walking speed
 * (v_walk), and the relative air speed (v_r). These different equations are
 * used if the person is clothed in normal clothing (0.6 clo < I_cl < 1.4 clo
 * or 1.2 clo < I_T < 2.0 clo), nude (I_cl = 0 clo), and if the person is
 * clothed in very light clothing (I_cl < 0.6 clo). The equation for high
 * clothing (I_T > 2.0 clo) is not implemented, so the applicability of this
 * function is limited to 0 clo < I_T < 2.0 clo. All the inputs this function
 * requires are in the ISO 9920:2009 standard, Annex A.
 *
 * Same name, parameters and values as pythermalcomfort's
 * `clothing.clo_total_insulation`.
 *
 * @param {number} i_t - total thermal insulation of clothing under static reference conditions, [clo]
 * @param {number} vr - relative air speed, [m/s]
 * @param {number} v_walk - walking speed, [m/s]
 * @param {number} i_a_static - static boundary air layer insulation, [clo]
 * @param {number} i_cl - intrinsic insulation of the clothing ensemble, this is the thermal insulation
 * from the skin surface to the outer clothing surface, [clo]
 * @returns {number} total insulation of the clothing ensemble, [clo]
 *
 * @example
 * import { clo_total_insulation } from "jsthermalcomfort";
 * console.log(clo_total_insulation(1.0, 0.26, 0.06, 0.7, 0.3)); // 0.7927...
 */
export function clo_total_insulation(
  i_t: number,
  vr: number,
  v_walk: number,
  i_a_static: number,
  i_cl: number,
): number {
  for (const [key, value] of Object.entries({
    i_t,
    vr,
    v_walk,
    i_a_static,
    i_cl,
  })) {
    if (typeof (value as unknown) !== "number")
      throw notOfType(key, "a number");
  }
  const nude = i_a_static * _correction_nude(vr, v_walk);
  if (i_cl === 0) return nude;
  const normal_clothing = i_t * _correction_normal_clothing(vr, v_walk);
  if (i_cl <= 0.6) return ((0.6 - i_cl) * nude + i_cl * normal_clothing) / 0.6;
  return normal_clothing;
}
