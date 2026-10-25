import { classifyFromBins } from "./classifierBins.ts";
import type { ClassifierBins } from "./classifierBins.ts";
import type { ApplicabilityWarning, Bound, ModelWarning } from "./modelDocs.ts";

// The counterparts of upstream's `_internal/validation.py`. The old forms the
// models not yet migrated call, `_legacy_valid_range` and
// `_check_params_object`, sit at the end of the file until the contract ticket
// removes them.

/** Where a range row's quantity comes from (see {@link ModelWarning}). */
type Role = Extract<ModelWarning, { kind: "range" }>["role"];

/**
 * Filter values based on a valid range, warning on out-of-range entries.
 *
 * Upstream's `_valid_range`. Where upstream emits a `UserWarning`, this
 * appends a `range` row to `warnings`, the channel a result carries instead
 * (deviation _shared-3). Upstream's frame inspection, which reads the name
 * from the caller's source, has no counterpart, so `param_name` is required.
 *
 * @param x - Value to validate.
 * @param valid - Inclusive lower and upper bounds of the applicability range;
 * a missing side is unbounded, as upstream's `np.inf`.
 * @param param_name - Label for the parameter: the row's `key`, the name
 * upstream gives the check.
 * @param role - The row's `role`.
 * @param unit - The row's `unit`, the unit upstream compares in.
 * @param warnings - The call's rows, appended to.
 * @returns `x`, or NaN where it is out of range. NaN is not out of range, as
 * upstream's comparisons are false for it.
 */
export function _valid_range(
  x: number,
  valid: Bound,
  param_name: string,
  role: Role,
  unit: string | null,
  warnings: ModelWarning[],
): number {
  const out_of_range =
    x < (valid.min ?? -Infinity) || x > (valid.max ?? Infinity);
  if (!out_of_range) return x;
  warnings.push(
    Object.freeze({
      kind: "range",
      key: param_name,
      role,
      value: x,
      unit,
      bound: valid,
    }),
  );
  return NaN;
}

/**
 * Map a temperature array to stress categories.
 *
 * Upstream's `_mapping`, built on {@link classifyFromBins}, which is
 * `np.digitize` (ADR 0026): the bins hold the dictionary's keys as `edges`,
 * its values as `labels`, and upstream's `right`.
 *
 * @param value - Temperature to map.
 * @param bins - The bin edges, the categories and `right`.
 * @returns Stress category for the input temperature. NaN for unmapped.
 */
export function _mapping(
  value: number,
  bins: Readonly<ClassifierBins>,
): string | number {
  return classifyFromBins(value, bins);
}

/**
 * The old form of upstream's `_valid_range`, which the models not yet
 * migrated call; {@link _valid_range} replaces it. Checks one quantity against
 * an inclusive bound and pushes one {@link ApplicabilityWarning} row onto
 * `warnings` where it is outside, and the caller's gate reads the rows.
 *
 * A missing `min` or `max` is unbounded on that side, as upstream's
 * `(27.0, np.inf)`. A NaN value is not outside the bound, so it adds no row.
 *
 * @param warnings - the call's rows, appended to
 * @param key - the quantity's key in the model's `*_INFO`
 * @param role - where the quantity comes from
 * @param value - the quantity, in SI
 * @param bound - the bound, the object the model's `*_INFO` references
 * @returns false exactly when a row was pushed
 */
export function _legacy_valid_range(
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
 * The old params-object check, which the models not yet migrated call; the
 * input definition's parse makes it for a migrated model. Throws a
 * `TypeError` unless `params` is an object: every v1 model takes one params
 * object keyed like upstream's keyword arguments (ADR 0002), so a call still
 * written positionally fails here, naming the shape it should have.
 *
 * @param params - what the model was called with
 * @param name - the model's function name, for the message
 */
export function _check_params_object(params: unknown, name: string): void {
  if (typeof params !== "object" || params === null) {
    throw new TypeError(
      `${name} takes one params object, got ${String(params)}`,
    );
  }
}
