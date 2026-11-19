import { notOfType } from "../_internal/errors.ts";
import { _correction_nude } from "./_correction_clothing.ts";

/**
 * Calculate the insulation of the boundary air layer (`I`<sub>a,r</sub>).
 *
 * The static
 * boundary air value is 0.7 clo (0.109 m2K/W) for air velocities around 0.1 m/s to
 * 0.15 m/s. Thus, for static conditions, the standard recommends using the value of
 * 0.7 clo (0.109 m2K/W) for the boundary air layer insulation. For walking conditions,
 * the boundary air layer insulation is calculated based on the walking speed (v_walk)
 * and the relative air speed (vr). This equation is extracted from the ISO 9920:2009
 * standard [ISO9920](../../docs/references.md#iso9920) Section 6.
 *
 * @param vr - relative air speed, [m/s]
 * @param v_walk - walking speed, [m/s]
 * @param i_a_static - static boundary air layer insulation, [clo]
 * @returns boundary air layer insulation, [clo]
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
