import JOS3Defaults from "./JOS3Defaults.js";
import { bsa_rate } from "./bsa_rate.js";
import { validate_body_parameters } from "./validate_body_parameters.js";

/**
 * Calculate the ratio of basal blood flow (BFB) of the standard body (290 L/h).
 *
 * @param {number} height - Body height [m]. The default is 1.72.
 * @param {number} weight - Body weight [kg]. The default is 74.43.
 * @param {string} bsa_equation - The equation name of bsa calculation. Choose a name from "dubois", "takahira", "fujimoto", or "kurazumi". The default is "dubois".
 * @param {number} age - age [years]. The default is 20.
 * @param {number} ci - Cardiac index [L/min/㎡]. The default is 2.59.
 *
 * @returns {number} - Basal blood flow rate.
 */
export function bfb_rate(
  height = JOS3Defaults.height,
  weight = JOS3Defaults.weight,
  bsa_equation = JOS3Defaults.bsa_equation,
  age = JOS3Defaults.age,
  ci = JOS3Defaults.cardiac_index,
) {
  validate_body_parameters(height, weight, age);

  ci *= 60;

  if (age < 50) {
    ci *= 1;
  } else if (age < 60) {
    ci *= 0.85;
  } else if (age < 70) {
    ci *= 0.75;
  } else {
    // age >= 70
    ci *= 0.7;
  }

  const bfb_all =
    ci *
    bsa_rate(height, weight, bsa_equation) *
    JOS3Defaults.local_bsa.reduce((t, c) => t + c, 0);
  return bfb_all / JOS3Defaults.blood_flow_rate;
}
