import { classifyFromBins } from "./classifierBins.ts";
import type { ClassifierBins } from "./classifierBins.ts";
import { deepFreeze } from "./modelInfo.ts";
import type { Bound, ModelWarning, UnitSymbol } from "./modelInfo.ts";

// The counterparts of upstream's `_internal/validation.py`, with upstream's
// docstrings.

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
