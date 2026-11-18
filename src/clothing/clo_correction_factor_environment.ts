import { notOfType } from "../_internal/errors.ts";
import {
  _correction_normal_clothing,
  _correction_nude,
} from "./_correction_clothing.ts";

/**
 * Return the correction factor for the total insulation of the clothing ensemble
 * (`I`<sub>T</sub>) or the basic/intrinsic insulation (`I`<sub>cl</sub>).
 *
 * This correction factor takes into account of the fact that the values of
 * (`I`<sub>T</sub>) and (`I`<sub>cl</sub>) are estimated in static conditions. In real
 * environments the person may be walking, activity may pump air through the clothing,
 * etc.
 *
 * @param vr - relative air speed, [m/s]
 * @param v_walk - walking speed, [m/s]
 * @param i_cl - intrinsic insulation of the clothing ensemble, this is the thermal insulation
 * from the skin surface to the outer clothing surface [clo]
 * @returns correction factor for the total insulation of the clothing ensemble
 * (`I`<sub>T,r</sub> / (`I`<sub>T</sub>)) or the basic/intrinsic insulation
 * (`I`<sub>cl,r</sub> / (`I`<sub>cl</sub>))
 */
export function clo_correction_factor_environment(
  vr: number,
  v_walk: number,
  i_cl: number,
): number {
  for (const [key, value] of Object.entries({ vr, v_walk, i_cl })) {
    if (typeof (value as unknown) !== "number")
      throw notOfType(key, "a number");
  }

  function correction_low_clothing(
    _vr: number,
    _vw: number,
    _i_cl: number,
  ): number {
    return (
      ((0.6 - _i_cl) * _correction_nude(_vr, _vw) +
        _i_cl * _correction_normal_clothing(_vr, _vw)) /
      0.6
    );
  }

  if (i_cl === 0) return _correction_nude(vr, v_walk);
  if (i_cl <= 0.6) return correction_low_clothing(vr, v_walk, i_cl);
  return _correction_normal_clothing(vr, v_walk);
}
