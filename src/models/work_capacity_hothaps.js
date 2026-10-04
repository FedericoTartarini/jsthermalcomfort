import { validateInputs } from "../utilities/utilities.js";

const PARAMETERS = {
  heavy: { divisor: 30.94, exponent: 16.64 },
  moderate: { divisor: 32.93, exponent: 17.81 },
  light: { divisor: 34.64, exponent: 22.72 },
};

/** @typedef {number | NumericInput[]} NumericInput */
/** @typedef {number | boolean | WbgtInput[]} WbgtInput */

/**
 * Estimates work capacity from WBGT using the Hothaps model.
 * Follows pythermalcomfort's parameterization from
 * {@link https://doi.org/10.1016/j.gloenvcha.2020.102087|Orlov et al. (2020)}
 * For non-negative WBGT, capacity decreases from 100% towards 10%.
 * Negative WBGT produces NaN; results are not rounded.
 *
 * @public
 * @memberof models
 * @docname Work capacity (Hothaps)
 * @param {WbgtInput} wbgt - Wet bulb globe temperature, [°C].
 * Accepts numbers or rectangular numeric arrays, including NaN and infinities.
 * Booleans are treated as 0/1 for compatibility with Python.
 * @param {string} [work_intensity="heavy"] - Work intensity: "heavy",
 * "moderate", or "light" (case-insensitive).
 * @returns {{capacity: NumericInput}} Work capacity, [%], preserving input shape.
 * @throws {TypeError} If WBGT contains non-numeric values,
 * or work_intensity is not a string.
 * @throws {Error} If work_intensity is not a supported intensity.
 * @example
 * const result = work_capacity_hothaps(30);
 * console.log(result.capacity); // approximately 66.30
 */
export function work_capacity_hothaps(wbgt, work_intensity = "heavy") {
  if (typeof work_intensity !== "string") {
    throw new TypeError('Parameter "work_intensity" must be a string');
  }
  const intensity = work_intensity.toLowerCase();
  validateInputs(
    { work_intensity: intensity },
    { work_intensity: { enum: Object.keys(PARAMETERS) } },
  );
  const { divisor, exponent } = PARAMETERS[intensity];
  const shape = (value) => {
    if (!Array.isArray(value)) {
      if (typeof value !== "number" && typeof value !== "boolean")
        throw new TypeError("wbgt must be numeric");
      return "";
    }
    const shapes = Array.from(value, shape);
    if (shapes.some((item) => item !== shapes[0])) {
      throw new RangeError("wbgt arrays must have a rectangular shape");
    }
    return `${value.length},${shapes[0] ?? ""}`;
  };
  shape(wbgt);
  const calculate = (value) => {
    if (Array.isArray(value)) return value.map(calculate);
    if (typeof value === "boolean") value = value ? 1 : 0;
    return Math.min(
      100,
      Math.max(0, 100 * (0.1 + 0.9 / (1 + (value / divisor) ** exponent))),
    );
  };
  return { capacity: calculate(wbgt) };
}
