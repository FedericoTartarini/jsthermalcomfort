import { v_relative } from "../environment/v_relative.ts";
import { met_to_w_m2 } from "../utilities/constants.ts";
import { Standard } from "../utilities/options.ts";
import { notOfType } from "../_internal/errors.ts";
import { clo_area_factor } from "./clo_area_factor.ts";
import { clo_insulation_air_layer } from "./clo_insulation_air_layer.ts";
import { clo_total_insulation } from "./clo_total_insulation.ts";

/**
 * Estimates the dynamic intrinsic clothing insulation (I_cl,r). The activity
 * as well as the air speed modify the insulation characteristics of the
 * clothing. Consequently, ISO 7730 states that I_cl shall be corrected
 * [7730ISO2005](../../docs/references.md#7730iso2005)
 * [7730ISO2025](../../docs/references.md#7730iso2025). Both editions of ISO
 * 7730 give the correction equations in their (informative) Annex C, adapted
 * from the ISO 9920:2007 standard [ISO9920](../../docs/references.md#iso9920),
 * which is what is implemented here.
 *
 * Note: the walking speed is not a function input; it is estimated from the
 * metabolic rate using the formula given in ISO 7730 Annex C / ISO 9920 for
 * when the actual walking speed is undefined: v_walk = 0.0052 × (M − 58),
 * clipped to 0–0.7 m/s, where M is the metabolic rate in W/m2. This is a
 * different formula from `v_relative`'s activity-generated
 * air speed (0.3 × (met − 1)), which is used in the whole-body PMV heat
 * balance rather than for the clothing dynamic insulation correction.
 *
 * This is the correction ISO 7730 applies, so its result is the `clo` that
 * {@link models!pmv_ppd_iso} takes. For ASHRAE 55 use
 * {@link clo_dynamic_ashrae}. Same name, parameters and
 * values as pythermalcomfort's `clothing.clo_dynamic_iso`: `v` is the air
 * speed, and the relative air speed is derived from it with `v_relative`.
 *
 * @param {number} clo - clothing insulation, [clo]
 * @param {number} met - metabolic rate, [met]
 * @param {number} v - air speed, [m/s]
 * @param {number} [i_a=0.7] - thermal insulation of the boundary (surface) air layer around the outer clothing
 * or, when nude, around the skin surface, [clo]
 * @param {"9920-2007"} [standard="9920-2007"] - version of the ISO standard to use. Currently, the only
 * option available is "9920-2007"; any other value throws
 * @returns {number} dynamic clothing insulation, [clo]
 *
 * @example
 * import { clo_dynamic_iso } from "jsthermalcomfort";
 * console.log(clo_dynamic_iso(1, 1.2, 0.2)); // 0.9548...
 */
export function clo_dynamic_iso(
  clo: number,
  met: number,
  v: number,
  i_a = 0.7,
  // Upstream's `model`; this library names the option `standard` (ADR 0003).
  standard: typeof Standard.iso_9920_2007 = Standard.iso_9920_2007,
): number {
  for (const [key, value] of Object.entries({ clo, met, v, i_a })) {
    if (typeof (value as unknown) !== "number")
      throw notOfType(key, "a number");
  }
  if (typeof (standard as unknown) !== "string") {
    throw notOfType("standard", "a string");
  }
  return clo_dynamic_iso_vr(clo, met, v_relative(v, met), i_a, standard);
}

/**
 * Estimates the dynamic intrinsic clothing insulation (I_cl,r) by ISO 7730
 * Annex C / ISO 9920, from the relative air speed. This is
 * {@link clo_dynamic_iso} for a caller that holds the
 * relative air speed `vr` and not the air speed `v`:
 * `clo_dynamic_iso(clo, met, v)` is
 * `clo_dynamic_iso_vr(clo, met, v_relative(v, met))`. The walking speed is
 * estimated from the metabolic rate as it is there.
 *
 * pythermalcomfort has no counterpart: its `clo_dynamic_iso` takes `v` and
 * derives `vr` inside. This is everything that function does after that step,
 * exported because the CBE Thermal Comfort Tool lets a person enter `vr`
 * (ADR 0001: a deviation may add an export).
 *
 * @param {number} clo - clothing insulation, [clo]
 * @param {number} met - metabolic rate, [met]
 * @param {number} vr - relative air speed, [m/s]
 * @param {number} [i_a=0.7] - thermal insulation of the boundary (surface) air layer around the outer clothing
 * or, when nude, around the skin surface, [clo]
 * @param {"9920-2007"} [standard="9920-2007"] - version of the ISO standard to use. Currently, the only
 * option available is "9920-2007"; any other value throws
 * @returns {number} dynamic clothing insulation, [clo]
 *
 * @example
 * import { clo_dynamic_iso_vr } from "jsthermalcomfort";
 * console.log(clo_dynamic_iso_vr(1, 1.2, 0.26)); // 0.9548...
 */
export function clo_dynamic_iso_vr(
  clo: number,
  met: number,
  vr: number,
  i_a = 0.7,
  standard: typeof Standard.iso_9920_2007 = Standard.iso_9920_2007,
): number {
  for (const [key, value] of Object.entries({ clo, met, vr, i_a })) {
    if (typeof (value as unknown) !== "number")
      throw notOfType(key, "a number");
  }
  if (typeof (standard as unknown) !== "string") {
    throw notOfType("standard", "a string");
  }
  if (standard.toLowerCase() !== Standard.iso_9920_2007)
    throw new RangeError(
      `Dynamic clothing insulation calculations can only be performed in compliance with ISO ${Standard.iso_9920_2007}`,
    );

  const f_cl = clo_area_factor(clo);
  const i_t = clo + i_a / f_cl;
  // walking speed when undefined, per ISO 7730 Annex C / ISO 9920: vw = 0.0052 * (M - 58),
  // clipped to [0, 0.7] m/s; M is the metabolic rate in W/m2
  const v_walk = Math.min(Math.max(0.0052 * (met * met_to_w_m2 - 58), 0), 0.7);
  const i_t_r = clo_total_insulation(i_t, vr, v_walk, i_a, clo);
  const i_a_r = clo_insulation_air_layer(vr, v_walk, i_a);
  return i_t_r - i_a_r / f_cl;
}
