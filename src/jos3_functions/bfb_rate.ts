import { Default } from "./Default.ts";
import { bsa_rate } from "./bsa_rate.ts";
import { np_sum, require_numeric } from "./_numpy.ts";

// Upstream does not validate the body here (construction.py:206-264 at
// v4.6.2), so neither does this any more.
/**
 * Calculate the ratio of basal blood flow (BFB) of the standard body (290 L/h).
 *
 * @param {number} height - Body height [m].
 * @param {number} weight - Body weight [kg].
 * @param {string} bsa_equation - The equation name of bsa calculation. Choose a name from "dubois", "takahira", "fujimoto", or "kurazumi".
 * @param {number} age - age [years].
 * @param {number} ci - Cardiac index [L/min/㎡].
 *
 * @returns {number} - Basal blood flow rate.
 *
 * @throws {TypeError} For an age or ci that is not a number, as upstream's
 * comparison or multiplication raises, and for a height or weight that is
 * not one (`bsa_rate`).
 */
export function bfb_rate(
  height: number,
  weight: number,
  bsa_equation: string,
  age: number,
  ci: number,
): number {
  // Upstream's `ci *= 60` repeats a string rather than raising; the TypeError
  // comes at `ci * bsa_ratio` (construction.py:263), after the age
  // comparison and bsa_rate.
  const ci_given: unknown = ci;
  ci *= 60; // Convert unit from L/min/m² to L/h/m²

  // Adjust cardiac index based on age
  require_numeric(age, "<", "comparison", "int");
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

  const bsa_ratio = bsa_rate(height, weight, bsa_equation);
  require_numeric(ci_given, "*", "arithmetic");
  const bfb_all = ci * bsa_ratio * np_sum(Default.local_bsa); // Total BFB in L/h
  return bfb_all / Default.blood_flow_rate; // Ratio to the standard body (290 L/h)
}
