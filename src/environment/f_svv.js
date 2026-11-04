import { notOfType } from "../_internal/errors.ts";

/**
 * Calculates the sky-vault view fraction
 *
 * @public
 * @memberof environment
 * @docname Sky-vault view fraction
 *
 * @param {number} w - width of the window, [m]
 * @param {number} h - height of the window, [m]
 * @param {number} d - distance between the occupant and the window, [m]
 *
 * @returns {number} sky-vault view faction ranges between 0 and 1
 */
export function f_svv(w, h, d) {
  for (const [key, value] of Object.entries({ w, h, d })) {
    if (typeof value !== "number") throw notOfType(key, "a number");
  }
  let h_degrees = Math.atan(h / (2 * d)) * (180 / Math.PI);
  let w_degrees = Math.atan(w / (2 * d)) * (180 / Math.PI);
  return (h_degrees * w_degrees) / 16200;
}
