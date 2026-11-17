import { notOfType } from "../_internal/errors.ts";

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
 * @param {number} i_cl - intrinsic insulation of the clothing ensemble, [clo]
 * @returns {number} area factor of the clothing ensemble, [m2]
 *
 * @example
 * import { clo_area_factor } from "jsthermalcomfort";
 * console.log(clo_area_factor(1)); // 1.28
 */
export function clo_area_factor(i_cl: number): number {
  if (typeof (i_cl as unknown) !== "number")
    throw notOfType("i_cl", "a number");
  return 1 + 0.28 * i_cl;
}
