import { notOfType } from "../_internal/errors.ts";
import {
  _correction_normal_clothing,
  _correction_nude,
} from "./_correction_clothing.ts";

/**
 * Calculate the total insulation of the clothing ensemble (`I`<sub>T,r</sub>).
 *
 * The clothing ensemble (`I`<sub>T,r</sub>) which is
 * the actual thermal insulation from the body surface to the environment, considering
 * all clothing, enclosed air layers, and boundary air layers under given environmental
 * conditions and activities. It accounts for the effects of movements and wind. The
 * ISO 9920 standard [ISO9920](../../docs/references.md#iso9920) provides different equations to calculate it as a
 * function of the total thermal insulation of clothing (`I`<sub>T</sub>), the insulation
 * of the boundary air layer (`I`<sub>a</sub>), the walking speed (`v`<sub>walk</sub>), and the
 * relative air speed (`v`<sub>r</sub>). These different equations are used if the person
 * is clothed in normal clothing (0.6 clo < (`I`<sub>cl</sub>) < 1.4 clo or 1.2 clo <
 * (`I`<sub>T</sub>) < 2.0 clo), nude (`I`<sub>cl</sub> = 0 clo), and if the person is clothed
 * in very light clothing (`I`<sub>cl</sub> < 0.6 clo). Here we have not implemented the
 * equation for high clothing (`I`<sub>T</sub> > 2.0 clo). Hence the applicability of this
 * function is limited to 0 clo < (`I`<sub>T</sub>) < 2.0 clo. You can find all the inputs
 * required in this function in the ISO 9920:2009 standard [ISO9920](../../docs/references.md#iso9920) Annex A.
 *
 * @param i_t - total thermal insulation of clothing under static reference conditions [clo]
 * @param vr - relative air speed, [m/s]
 * @param v_walk - walking speed, [m/s]
 * @param i_a_static - static boundary air layer insulation, [clo]
 * @param i_cl - intrinsic insulation of the clothing ensemble, this is the thermal insulation
 * from the skin surface to the outer clothing surface [clo]
 * @returns total insulation of the clothing ensemble, [clo]
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
