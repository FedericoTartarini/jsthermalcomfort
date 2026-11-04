import { notOfType } from "../_internal/errors.ts";
import { round } from "../_internal/round.ts";

/**
 * Estimates the relative air speed which combines the average air speed of the
 * space plus the relative air speed caused by the body movement. Vag is assumed
 * to be 0 for metabolic rates equal and lower than 1 met and otherwise equal to
 * Vag = 0.3 (M - 1) (m/s)
 *
 * @public
 * @memberof environment
 * @docname Relative air speed
 *
 * @param {number} v - air spped measured by the sensor, [m/s]
 * @param {number} met - metabolic rate, [met]
 * @returns {number} relative air speed, [m/s]
 */
export function v_relative(v, met) {
  for (const [key, value] of Object.entries({ v, met })) {
    if (typeof value !== "number") throw notOfType(key, "a number");
  }
  if (met <= 1) return v;
  return _v_relative_single(v, met);
}

/**
 * @param {number} v
 * @param {number} met
 * @returns {number}
 */
function _v_relative_single(v, met) {
  return round(v + 0.3 * (met - 1), 3);
}
