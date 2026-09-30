import { round, Standard, v_relative } from "./utilities.js";

// pythermalcomfort's `clothing` package. The functions are members of this
// library's `utilities` namespace, as `v_relative` is (upstream's
// `environment`): the library has no `clothing` or `environment` namespace.

// pythermalcomfort.utilities.met_to_w_m2
const met_to_w_m2 = 58.15;

/**
 * Correction factor for the insulation of a nude person, ISO 9920.
 * pythermalcomfort's `_correction_nude`.
 */
function _correction_nude(_vr: number, _vw: number): number {
  return Math.exp(
    -0.533 * (_vr - 0.15) +
      0.069 * (_vr - 0.15) ** 2 -
      0.462 * _vw +
      0.201 * _vw ** 2,
  );
}

/**
 * Correction factor for normal clothing, ISO 9920. pythermalcomfort's
 * `_correction_normal_clothing`.
 */
function _correction_normal_clothing(_vr: number, _vw: number): number {
  return Math.exp(
    -0.281 * (_vr - 0.15) +
      0.044 * (_vr - 0.15) ** 2 -
      0.492 * _vw +
      0.176 * _vw ** 2,
  );
}

/**
 * Calculates the clothing area factor (f_cl) of the clothing ensemble as a
 * function of the intrinsic insulation of the clothing ensemble. This equation
 * is in accordance with the ISO 9920:2009 standard, Section 5. The standard
 * warns that the correlation between f_cl and i_cl is low, especially for
 * non-western clothing ensembles. The application of this equation is limited
 * to clothing ensembles with clo values between 0.2 and 1.7 clo.
 *
 * Same name, parameters and values as pythermalcomfort's
 * `clothing.clo_area_factor`.
 *
 * @public
 * @memberof utilities
 * @docname Clothing area factor
 *
 * @param {number} i_cl - intrinsic insulation of the clothing ensemble, [clo]
 * @returns {number} area factor of the clothing ensemble, [m2]
 *
 * @example
 * import { clo_area_factor } from "jsthermalcomfort";
 * console.log(clo_area_factor(1)); // 1.28
 */
export function clo_area_factor(i_cl: number): number {
  return 1 + 0.28 * i_cl;
}

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
 * @public
 * @memberof utilities
 * @docname Boundary air layer insulation
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
  return _correction_nude(vr, v_walk) * i_a_static;
}

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
 * @public
 * @memberof utilities
 * @docname Total clothing insulation
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
  const nude = i_a_static * _correction_nude(vr, v_walk);
  if (i_cl === 0) return nude;
  const normal_clothing = i_t * _correction_normal_clothing(vr, v_walk);
  if (i_cl <= 0.6) return ((0.6 - i_cl) * nude + i_cl * normal_clothing) / 0.6;
  return normal_clothing;
}

/**
 * Estimates the dynamic intrinsic clothing insulation (I_cl,r), which ASHRAE
 * 55:2023 refers to as I_cl,active. The activity as well as the air speed
 * modify the insulation characteristics of the clothing. Consequently, the
 * ASHRAE 55 standard provides a correction factor for the clothing insulation
 * (I_cl) based on the metabolic rate: above 1.2 met,
 * clo = I_cl × (0.6 + 0.4 / met).
 *
 * This is the correction ASHRAE 55 applies, so its result is the `clo` that
 * {@link #pmv_ppd_ashrae|pmv_ppd_ashrae} and the other ASHRAE 55 models take.
 * For ISO 7730 use {@link #clo_dynamic_iso|clo_dynamic_iso}. Same name,
 * parameters and values as pythermalcomfort's `clothing.clo_dynamic_ashrae`.
 *
 * @public
 * @memberof utilities
 * @docname Dynamic clothing (ASHRAE 55)
 *
 * @param {number} clo - clothing insulation, [clo]. This is the basic insulation (I_cl), also known
 * as the intrinsic clothing insulation value under reference conditions
 * @param {number} met - metabolic rate, [met]
 * @param {"55-2023"} [standard="55-2023"] - version of the ASHRAE 55 Standard to use. Currently, the only
 * option available is "55-2023"; any other value throws
 * @returns {number} dynamic clothing insulation (I_cl,r), [clo]
 *
 * @example
 * import { clo_dynamic_ashrae } from "jsthermalcomfort";
 * console.log(clo_dynamic_ashrae(1, 2)); // 0.8
 */
export function clo_dynamic_ashrae(
  clo: number,
  met: number,
  // Upstream's `model`; this library names the option `standard` (ADR 0003).
  standard: typeof Standard.ashrae_55_2023 = Standard.ashrae_55_2023,
): number {
  if (standard !== Standard.ashrae_55_2023)
    throw new Error(
      `PMV calculations can only be performed in compliance with ASHRAE ${Standard.ashrae_55_2023}`,
    );

  return met > 1.2 ? round(clo * (0.6 + 0.4 / met), 3) : clo;
}

/**
 * Estimates the dynamic intrinsic clothing insulation (I_cl,r). The activity
 * as well as the air speed modify the insulation characteristics of the
 * clothing. Consequently, ISO 7730 states that I_cl shall be corrected. Both
 * editions of ISO 7730 give the correction equations in their (informative)
 * Annex C, adapted from the ISO 9920:2007 standard, which is what is
 * implemented here.
 *
 * Note: the walking speed is not a function input; it is estimated from the
 * metabolic rate using the formula given in ISO 7730 Annex C / ISO 9920 for
 * when the actual walking speed is undefined: v_walk = 0.0052 × (M − 58),
 * clipped to 0–0.7 m/s, where M is the metabolic rate in W/m2. This is a
 * different formula from {@link #v_relative|v_relative}'s activity-generated
 * air speed (0.3 × (met − 1)), which is used in the whole-body PMV heat
 * balance rather than for the clothing dynamic insulation correction.
 *
 * This is the correction ISO 7730 applies, so its result is the `clo` that
 * {@link #pmv_ppd_iso|pmv_ppd_iso} takes. For ASHRAE 55 use
 * {@link #clo_dynamic_ashrae|clo_dynamic_ashrae}. Same name, parameters and
 * values as pythermalcomfort's `clothing.clo_dynamic_iso`: `v` is the air
 * speed, and the relative air speed is derived from it with `v_relative`.
 *
 * @public
 * @memberof utilities
 * @docname Dynamic clothing (ISO 7730)
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
  return clo_dynamic_iso_vr(clo, met, v_relative(v, met), i_a, standard);
}

/**
 * Estimates the dynamic intrinsic clothing insulation (I_cl,r) by ISO 7730
 * Annex C / ISO 9920, from the relative air speed. This is
 * {@link #clo_dynamic_iso|clo_dynamic_iso} for a caller that holds the
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
 * @public
 * @memberof utilities
 * @docname Dynamic clothing (ISO 7730) from the relative air speed
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
  if (standard !== Standard.iso_9920_2007)
    throw new Error(
      `PMV calculations can only be performed in compliance with ISO ${Standard.iso_9920_2007}`,
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
