import { Default } from "./Default.ts";
import { body_surface_area } from "../utilities/utilities.js";
import { np_sum, require_numeric } from "../_internal/numpy.ts";

// Upstream does not validate the body here (construction.py:98-143 at
// v4.6.2); the call to validate_body_parameters that passed bsa_equation in
// the age slot is gone.
/**
 * Calculate the ratio of body surface area (BSA) to the standard body
 * (`pythermalcomfort/jos3_functions/construction.py:98-143` at v4.6.2).
 *
 * This function computes the ratio of an individual's body surface area to
 * that of a standard body, based on the given height, weight, and BSA
 * calculation equation.
 *
 * @param {number} height - The height of the person in meters.
 * @param {number} weight - The weight of the person in kilograms.
 * @param {string} bsa_equation - The equation name for BSA calculation. Choose
 * a name from "dubois", "takahira", "fujimoto", or "kurazumi".
 *
 * @returns {number} The ratio of the individual's BSA to the standard body BSA.
 *
 * @throws {Error} For an unknown `bsa_equation`, from `body_surface_area`,
 * as upstream raises a ValueError (ADR 0012).
 * @throws {TypeError} For a height or weight that is not a number, as
 * upstream's power raises.
 */
export function bsa_rate(
  height: number,
  weight: number,
  bsa_equation: string,
): number {
  // body_surface_area raises the ValueError for the formula first, then
  // computes weight**... before height**... (utilities.py:105-116).
  if (["dubois", "takahira", "fujimoto", "kurazumi"].includes(bsa_equation)) {
    require_numeric(weight, "** or pow()", "arithmetic");
    require_numeric(height, "** or pow()", "arithmetic");
  }
  // body_surface_area's type names the four formulas; an unknown one
  // reaches it and raises there, as upstream's does.
  const bsa_all = body_surface_area(
    weight,
    height,
    bsa_equation as Parameters<typeof body_surface_area>[2],
  );
  return bsa_all / np_sum(Default.local_bsa); // The bsa ratio to the standard body (1.87m2)
}
