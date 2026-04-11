/**
 * Checks whether a value is a valid finite number.
 *
 * Rejects non-number types, NaN, and Infinity. Used as an input-validation
 * guard at the entry of model functions so callers receive a predictable
 * NaN-shaped result instead of propagating unexpected values through the
 * calculation.
 *
 * @public
 * @ignore
 * @param {unknown} value - value to check
 * @returns {boolean} true if value is a finite number
 */
export function isValidNumber(value) {
  return typeof value === "number" && isFinite(value);
}

/**
 * Checks whether every provided value is a valid finite number.
 *
 * @public
 * @ignore
 * @param {...unknown} values - values to check
 * @returns {boolean} true if every value satisfies {@link isValidNumber}
 */
export function allValidNumbers(...values) {
  return values.every(isValidNumber);
}
