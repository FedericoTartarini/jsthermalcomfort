import type { ApplicabilityWarning, Bound } from "../models/modelDocs.ts";

/**
 * Upstream's `_valid_range` (`pythermalcomfort/_internal/validation.py`):
 * checks one quantity against an inclusive bound. Where upstream emits a
 * `UserWarning` and returns the value NaN-masked, this pushes one row onto
 * `warnings`, the channel a result carries instead (JavaScript has no
 * warnings filter), and the caller's gate reads the rows.
 *
 * A missing `min` or `max` is unbounded on that side, as upstream's
 * `(27.0, np.inf)`. A NaN value is not outside the bound, so it adds no row.
 *
 * Private: not exported from the package root.
 *
 * @param {ApplicabilityWarning[]} warnings - the call's rows, appended to
 * @param {string} key - the quantity's key in the model's `*_INFO`
 * @param {ApplicabilityWarning["role"]} role - where the quantity comes from
 * @param {number} value - the quantity, in SI
 * @param {Bound} bound - the bound, the object the model's `*_INFO` references
 * @returns {boolean} false exactly when a row was pushed
 */
export function _valid_range(
  warnings: ApplicabilityWarning[],
  key: string,
  role: ApplicabilityWarning["role"],
  value: number,
  bound: Bound,
): boolean {
  const out_of_range =
    value < (bound.min ?? -Infinity) || value > (bound.max ?? Infinity);
  if (out_of_range) warnings.push({ key, role, value, bound });
  return !out_of_range;
}

/**
 * Throws a `TypeError` unless `params` is an object: every v1 model takes one
 * params object keyed like upstream's keyword arguments (ADR 0002), so a call
 * still written positionally fails here, naming the shape it should have.
 * Upstream has no counterpart, as Python's keyword arguments need none.
 *
 * Private: not exported from the package root.
 *
 * @param {unknown} params - what the model was called with
 * @param {string} name - the model's function name, for the message
 */
export function _check_params_object(params: unknown, name: string): void {
  if (typeof params !== "object" || params === null) {
    throw new TypeError(
      `${name} takes one params object, got ${String(params)}`,
    );
  }
}
