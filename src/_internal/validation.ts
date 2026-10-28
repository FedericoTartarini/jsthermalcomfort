import { classifyFromBins } from "./classifierBins.ts";
import type { ClassifierBins } from "./classifierBins.ts";
import { deepFreeze } from "./modelInfo.ts";
import type {
  ApplicabilityWarning,
  Bound,
  ModelWarning,
  UnitSymbol,
} from "./modelInfo.ts";

// The counterparts of upstream's `_internal/validation.py`, with upstream's
// docstrings. The old forms, `_legacy_valid_range` and `_check_params_object`,
// which no model calls any more, sit at the end of the file until the
// contract ticket removes them.

/** Where a range row's quantity comes from (see {@link ModelWarning}). */
type Role = Extract<ModelWarning, { kind: "range" }>["role"];

/**
 * Filter values based on a valid range, warning on out-of-range entries.
 *
 * @param x - Value to validate.
 * @param valid - Inclusive lower and upper bounds of the applicability range.
 * @param param_name - Label for the parameter, the range row's `key`.
 * @param role - The range row's `role`.
 * @param unit - The range row's `unit`, the unit upstream compares in.
 * @param warnings - The call's rows.
 * @returns `x`, or NaN where it is out of range.
 *
 * @remarks
 * Appends a `range` row to `warnings` where `x` falls outside `valid`, in
 * place of upstream's `UserWarning`.
 */
export function _valid_range(
  x: number,
  valid: Bound,
  param_name: string,
  role: Role,
  unit: UnitSymbol | null,
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
 * Stress category thresholds shared by the Heat Index models (e.g. Rothfusz, Schoen).
 * Each model prepends its own "no risk" floor, since that lower bound depends on the
 * model's applicability range, e.g. {27.0: "no risk", **HEAT_INDEX_STRESS_CATEGORIES}.
 */
export const HEAT_INDEX_STRESS_CATEGORIES = deepFreeze({
  edges: [32.0, 41.0, 54.0, 1000.0],
  labels: ["caution", "extreme caution", "danger", "extreme danger"],
} as const satisfies Pick<ClassifierBins, "edges" | "labels">);

/**
 * Map a temperature to stress categories.
 *
 * @param value - Temperature to map.
 * @param bins - Bin edges, the categories they map to, and `right`: if true,
 * intervals include the right bin edge.
 * @returns Stress category for the input temperature. NaN for unmapped.
 * @throws `RangeError` if the edges are not strictly increasing.
 *
 * @example
 * ```ts
 * const bins = {
 *   edges: [15, 25, 35],
 *   labels: ["low", "medium", "high"],
 *   right: true,
 * };
 * [20, 25, 30].map((t) => _mapping(t, bins)); // ["medium", "medium", "high"]
 * ```
 */
export function _mapping(value: number, bins: ClassifierBins): string | number {
  return classifyFromBins(value, bins);
}

/**
 * The old form of upstream's `_valid_range`, which no model calls any more;
 * {@link _valid_range} replaces it. Checks one quantity against
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
 * The old params-object check, which no model calls any more; the input
 * definition's parse makes it for a migrated model. Throws a
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
