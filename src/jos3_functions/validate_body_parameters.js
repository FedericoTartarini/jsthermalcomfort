import JOS3Defaults from "./JOS3Defaults.js";

/**
 * Validate the parameters: height, weight, age, and body fat percentage.
 *
 * @param {number} height - The height of the person in meters.
 * @param {number} weight - The weight of the person in kilograms.
 * @param {number} age - The age of the person in years.
 * @param {number} body_fat - The body fat percentage as a fraction of total body mass.

 * @throws {Error} If any of the parameters are out of the specified range.
 */
export function validate_body_parameters(
  height = JOS3Defaults.height,
  weight = JOS3Defaults.weight,
  age = JOS3Defaults.age,
  body_fat = JOS3Defaults.body_fat,
) {
  if (height < 0.5 || height > 3.0) {
    throw new Error("Height must be in the range [0.5, 3.0] meters.");
  }

  if (weight < 20 || weight > 200) {
    throw new Error("Weight must be in the range [20, 200] kilograms.");
  }

  if (age < 5 || age > 100) {
    throw new Error("Age must be in the range [5, 100] years.");
  }

  if (body_fat < 1 || body_fat > 90) {
    throw new Error("Body Fat must be in the range [1, 90] (1% to 90%).");
  }
}
