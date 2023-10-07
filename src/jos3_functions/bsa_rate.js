import JOS3Defaults from "../jos3_functions/JOS3Defaults";
import { validate_body_parameters } from "./validate_body_parameters";
import { body_surface_area } from "../utilities/utilities";

/**
 * Calculates the body surface area rate based on the given height, weight and
 * BSA equation.
 *
 * @param {number} [height=JOS3Defaults.height] - The height of the person in
 * meters.
 * @param {number} [weight=JOS3Defaults.weight] - The weight of the person in
 * kilograms.
 * @param {string} [bsa_equation=JOS3Defaults.bsa_equation] - The BSA equation
 * to use for calculation.
 *
 * @returns {number} The body surface area rate.
 */
export function bsa_rate(
  height = JOS3Defaults.height,
  weight = JOS3Defaults.weight,
  bsa_equation = JOS3Defaults.bsa_equation,
) {
  validate_body_parameters(height, weight, bsa_equation);

  const bsa_all = body_surface_area(weight, height, bsa_equation);
  return bsa_all / JOS3Defaults.local_bsa.reduce((t, c) => t + c, 0);
}
