import { require_numeric } from "../_internal/numpy.ts";

// Upstream's messages (construction.py:48-60 at v4.6.2); the weight and fat
// ones used to read "[20, 200]" and "Body Fat must be ...".
/**
 * Validate the parameters: height, weight, age, and body fat percentage
 * (`pythermalcomfort/jos3_functions/construction.py:16-60` at v4.6.2).
 *
 * @param {number} height - The height of the person in meters.
 * @param {number} weight - The weight of the person in kilograms.
 * @param {number} age - The age of the person in years.
 * @param {number} body_fat - The body fat percentage as a fraction of total body mass.
 *
 * @throws {RangeError} If any of the parameters are out of the specified
 * range, as upstream raises a ValueError (ADR 0012). A NaN is out of range,
 * as upstream's chained comparison is false for it.
 * @throws {TypeError} If a parameter is not a number, as upstream's
 * comparison raises.
 */
export function validate_body_parameters(
  height: number,
  weight: number,
  age: number,
  body_fat: number,
): void {
  require_numeric(height, "<=", "comparison");
  if (!(0.5 <= height && height <= 3.0)) {
    throw new RangeError("Height must be in the range [0.5, 3.0] meters.");
  }

  require_numeric(weight, "<=", "comparison");
  if (!(20.0 <= weight && weight <= 200.0)) {
    throw new RangeError(
      "Weight must be in the range [20.0, 200.0] kilograms.",
    );
  }

  require_numeric(age, "<=", "comparison", "int");
  if (!(5 <= age && age <= 100)) {
    throw new RangeError("Age must be in the range [5, 100] years.");
  }

  require_numeric(body_fat, "<=", "comparison", "int");
  if (!(1 <= body_fat && body_fat <= 90)) {
    throw new RangeError(
      "Body fat percentage must be in the range [1, 90] (1% to 90%).",
    );
  }
}
