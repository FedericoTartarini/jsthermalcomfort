import { notOfType } from "../_internal/errors.ts";

/**
 * Calculate the body surface area (BSA) in square meters.
 *
 * @param weight - Body weight in kilograms.
 * @param height - Body height in meters.
 * @param formula - Formula used to calculate the body surface area. Default is "dubois".
 * Choose one from BodySurfaceAreaEquations.
 * @returns Body surface area in square meters.
 * @throws `RangeError` If the specified formula is not recognized.
 *
 * @example
 * Calculate BSA using the DuBois formula:
 *
 * ```ts
 * import { body_surface_area } from "jsthermalcomfort/utilities";
 *
 * const bsa = body_surface_area(70, 1.75, "dubois");
 * console.log(bsa);
 * ```
 */
export function body_surface_area(
  weight: number,
  height: number,
  formula = "dubois",
): number {
  for (const [key, value] of Object.entries({ weight, height })) {
    if (typeof (value as unknown) !== "number") {
      throw notOfType(key, "a number");
    }
  }
  if (typeof (formula as unknown) !== "string") {
    throw notOfType("formula", "a string");
  }
  if (formula === "dubois") {
    return 0.202 * weight ** 0.425 * height ** 0.725;
  }
  if (formula === "takahira") {
    return 0.2042 * weight ** 0.425 * height ** 0.725;
  }
  if (formula === "fujimoto") {
    return 0.1882 * weight ** 0.444 * height ** 0.663;
  }
  if (formula === "kurazumi") {
    return 0.244 * weight ** 0.383 * height ** 0.693;
  }
  const invalid_formula_msg = `Formula '${formula}' for calculating body surface area is not recognized.`;
  throw new RangeError(invalid_formula_msg);
}
