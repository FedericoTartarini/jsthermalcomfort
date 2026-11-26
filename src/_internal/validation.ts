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
 * Stress category thresholds of the Heat Index, [°C]. HEAT_INDEX_RISK_CATEGORIES below
 * adds the "no risk" floor that the Rothfusz and Schoen models use.
 */
export const HEAT_INDEX_STRESS_CATEGORIES = deepFreeze({
  edges: [32.0, 41.0, 54.0, 1000.0],
  labels: ["caution", "extreme caution", "danger", "extreme danger"],
} as const satisfies Pick<ClassifierBins, "edges" | "labels">);

/**
 * Return a condition as 1.0 where it holds and 0.0 where it does not.
 *
 * Every yes/no model output uses this form, so it can hold NaN where the inputs are
 * outside the model's applicability limits. A boolean array cannot.
 *
 * @param condition - The condition to report.
 * @param valid - Where False, the result is NaN.
 * @returns 1.0, 0.0 or NaN.
 */
export function _as_flag(condition: boolean, valid?: boolean): number {
  const flag = Number(condition);
  if (valid === undefined) return flag;
  return valid ? flag : NaN;
}

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

/** Shared by the Rothfusz and Schoen Heat Index models. Below 27 °C there is no risk. */
export const HEAT_INDEX_RISK_CATEGORIES = deepFreeze({
  edges: [27.0, ...HEAT_INDEX_STRESS_CATEGORIES.edges],
  labels: ["no risk", ...HEAT_INDEX_STRESS_CATEGORIES.labels],
  right: true,
} as const satisfies ClassifierBins);
