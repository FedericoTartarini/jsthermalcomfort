import { validateInputs } from "../utilities/utilities.js";

/**
 * Estimate work capacity under heat stress using Dunne et al. (2013),
 * Reductions in labour capacity from heat stress under climate warming.
 * Uses the same equation as pythermalcomfort.models.work_capacity_dunne.
 * Capacity is clipped to [0, 100] percent and is not rounded.
 * 100% means work is unaffected by heat; 0% means no work is done.
 * Inputs are scalar; use Array.map() for multiple WBGT readings.
 *
 * @public
 * @memberof models
 * @docname Work Capacity (Dunne)
 * @param {number} wbgt - Wet bulb globe temperature, [°C], as a finite scalar.
 * @param {string} [work_intensity="heavy"] - "heavy", "moderate" or "light",
 * case-insensitive. Moderate and light work scale heavy-work capacity by 2 and 4.
 * @returns {{capacity: number}} Estimated work capacity, [%].
 * @throws {TypeError} If wbgt is not a finite number or work_intensity is not a string.
 * @throws {RangeError} If work_intensity is not one of the supported levels.
 * @example
 * work_capacity_dunne(25); // { capacity: 100 }
 * work_capacity_dunne(30, "moderate").capacity; // approximately 53.7991
 * [20, 25, 35].map((t) => work_capacity_dunne(t).capacity); // [100, 100, 0]
 */
export function work_capacity_dunne(wbgt, work_intensity = "heavy") {
  validateInputs({ wbgt }, { wbgt: { type: "number" } });
  if (typeof work_intensity !== "string") {
    throw new TypeError('Parameter "work_intensity" must be a string');
  }
  const intensity = work_intensity.toLowerCase();
  if (!["heavy", "moderate", "light"].includes(intensity)) {
    throw new RangeError(
      'Parameter "work_intensity" must be heavy, moderate or light',
    );
  }
  const factors = { heavy: 1, moderate: 2, light: 4 };
  const base = Math.min(
    100,
    Math.max(0, 100 - 25 * Math.max(0, wbgt - 25) ** (2 / 3)),
  );
  return { capacity: Math.min(100, Math.max(0, base * factors[intensity])) };
}
