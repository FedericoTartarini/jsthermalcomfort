import { notOfType } from "../_internal/errors.ts";
import { _correction_nude } from "./_correction_clothing.ts";

/**
 * Calculates the insulation of the boundary air layer (I_a,r). The static
 * boundary air value is 0.7 clo (0.109 m2K/W) for air velocities around
 * 0.1 m/s to 0.15 m/s, which is the value the standard recommends for static
 * conditions. For walking conditions, the boundary air layer insulation is
 * calculated from the walking speed (v_walk) and the relative air speed (vr).
 * This equation is from the ISO 9920:2009 standard, Section 6.
 *
 * Same name, parameters and values as pythermalcomfort's
 * `clothing.clo_insulation_air_layer`.
 *
 * @param {number} vr - relative air speed, [m/s]
 * @param {number} v_walk - walking speed, [m/s]
 * @param {number} i_a_static - static boundary air layer insulation, [clo]
 * @returns {number} boundary air layer insulation, [clo]
 *
 * @example
 * import { clo_insulation_air_layer } from "jsthermalcomfort";
 * console.log(clo_insulation_air_layer(0.2, 1, 0.71)); // 0.5326...
 */
export function clo_insulation_air_layer(
  vr: number,
  v_walk: number,
  i_a_static: number,
): number {
  for (const [key, value] of Object.entries({ vr, v_walk, i_a_static })) {
    if (typeof (value as unknown) !== "number")
      throw notOfType(key, "a number");
  }
  return _correction_nude(vr, v_walk) * i_a_static;
}
