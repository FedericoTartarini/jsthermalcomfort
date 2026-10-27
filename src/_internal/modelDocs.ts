import type { ClassifierBins } from "./classifierBins.ts";
import type { InputsInfo } from "./define.ts";
import type { Standard } from "../utilities/options.ts";

// The types of the model info every model publishes (`*_INFO`), of the result
// every model returns and of its warnings rows (ADRs 0023, 0024), plus
// `deepFreeze`, which locks them.
// The old forms that the models not yet migrated still return,
// `ApplicabilityWarning` and `LegacyModelInfo`, sit at the end of the file
// until the contract ticket removes them.

/** One of the identifiers in `Standard`, e.g. `"7730-2025"` or `"55-2023"`. */
export type StandardId = (typeof Standard)[keyof typeof Standard];

/**
 * A bound on a variable (minimum and/or maximum), inclusive. A missing side is
 * unbounded, as upstream's `np.inf` is.
 *
 * Readonly, because the runtime value is frozen. Without that, a consumer could
 * write `INFO.inputs.tdb.applicability.min = 5`, type-check cleanly, and then
 * throw at runtime — an ES module is always strict, so the assignment is not
 * silently ignored.
 */
export interface Bound {
  readonly min?: number;
  readonly max?: number;
}

/**
 * One row of a result's `warnings`: what upstream reports with
 * `warnings.warn` (ADR 0024, deviation _shared-3).
 *
 * A `range` row is one bound a call broke, where upstream's `_valid_range`
 * (or a check like it) warns:
 *
 * - `key` is the name upstream gives the check, verbatim (`"tdb"`,
 *   `"tr - tdb"`, `"pa (kPa)"`), so rows with the same key are told apart by
 *   `role` and `unit`;
 * - `role` is `input` for a quantity as the caller gave it, `derived` for one
 *   computed from the inputs, `output` for a result upstream checks;
 * - `value` is the value upstream compared, and `unit` and `bound` are
 *   upstream's, with no conversion. A fixed `bound` is the frozen object the
 *   model's `*_INFO` references.
 *
 * Range rows are returned whatever `limit_inputs` is: with it on they are why
 * the result is NaN, with it off they are what the numbers were computed
 * despite.
 *
 * A `notice` row carries the text of any other upstream `warnings.warn`,
 * verbatim, such as a solver falling back. Nothing is printed to the console.
 */
export type ModelWarning =
  | {
      readonly kind: "range";
      readonly key: string;
      readonly role: "input" | "derived" | "output";
      readonly value: number;
      readonly unit: string | null;
      readonly bound: Bound;
    }
  | { readonly kind: "notice"; readonly message: string };

/**
 * What every model's result extends, as upstream's result dataclasses extend
 * `AutoStrMixin` (ADR 0023). A result is frozen, its rows included.
 */
export interface ModelResult {
  /** Added: the call's {@link ModelWarning} rows, in the order of its checks. */
  readonly warnings: readonly ModelWarning[];
}

export type { ClassifierBins };

/**
 * Metadata for a single output or derived variable of a model; `INFO.inputs`
 * describes the inputs (`InputsInfo`).
 *
 * `unit` is the unit of measurement, or `null` if dimensionless.
 *
 * `applicability` is the range over which the model is applicable. It is an
 * **applicability gate, not a clamp**. Outside it, and only when `limit_inputs`
 * is enabled, the model returns NaN — it does not constrain the value to the
 * bound. On an output such as `pmv_ppd_iso`'s `pmv`, read it as "results
 * outside this band are suppressed", not "the output is guaranteed to fall
 * inside it". A front end should surface it as a condition on the answer rather
 * than as a slider limit.
 *
 * `classifier`, if present, holds the bins used to turn this continuous output
 * into a categorical label. Pass it to `classifyFromBins` rather than
 * reimplementing the edge handling.
 */
export interface OutputInfo {
  readonly unit: string | null;
  readonly applicability?: Bound;
  readonly classifier?: ClassifierBins;
}

/**
 * Metadata describing a thermal comfort model: its `*_INFO` (ADR 0024,
 * deviation _shared-4). Its shape is stable within the major version.
 *
 * `name` is pythermalcomfort's function name for the model:
 * `HEAT_INDEX_ROTHFUSZ_INFO.name` is `"heat_index_rothfusz"`, and
 * `name.toUpperCase() + "_INFO"` is this object's own export name. A front end
 * can key a model by it without keeping its own copy of the string. `label` is
 * a short display name.
 *
 * `inputs` describes the model's inputs: every keyword argument, in
 * upstream's order, with its kind (`numeric` or `bool`), unit, applicability
 * and default. The model validates its inputs against it, and its inputs type
 * is derived from it. `outputs` are the returned values. `derived` covers quantities
 * computed from the inputs rather than supplied by the caller, keyed by
 * upstream's name for the check, as the `warnings` rows are.
 *
 * `standards` lists the editions this function accepts, default first; empty
 * for a model with no standard. Every entry is a `Standard` value.
 */
export interface ModelInfo {
  readonly name: string;
  readonly label: string;
  readonly standards: readonly StandardId[];
  readonly inputs: InputsInfo;
  readonly outputs: Readonly<Record<string, OutputInfo>>;
  readonly derived?: Readonly<Record<string, OutputInfo>>;
}

/**
 * Deep-freezes an object and all nested objects, preventing accidental mutations.
 *
 * Used to lock down model metadata so consumers and the runtime cannot diverge.
 * Handles cycles via WeakSet tracking and recurses into already-frozen objects
 * to ensure their properties are also frozen.
 *
 * @param obj - The object to freeze.
 * @returns The same object, now frozen.
 */
export function deepFreeze<T extends object>(
  obj: T,
  visited = new WeakSet<object>(),
): Readonly<T> {
  // Prevent infinite recursion on circular references
  if (visited.has(obj)) {
    return obj;
  }
  visited.add(obj);

  // Freeze the object itself
  Object.freeze(obj);

  // Recursively freeze all owned properties, symbol-keyed ones included,
  // regardless of current frozen state
  Reflect.ownKeys(obj).forEach((prop) => {
    const value = (obj as Record<PropertyKey, unknown>)[prop];
    // Only recurse if it's an object (including arrays)
    if (value !== null && typeof value === "object") {
      deepFreeze(value, visited);
    }
  });

  return obj;
}

/**
 * The old form of a range row, which the models not yet migrated return;
 * {@link ModelWarning} replaces it.
 *
 * `key` names the quantity, `value` is what the call had for it (SI, and for a
 * `derived` or `output` row the unrounded value the gate compared), and `bound`
 * is the range it fell outside. `role` says where the quantity comes from.
 * Reported whatever `limit_inputs` is.
 */
export interface ApplicabilityWarning {
  readonly key: string;
  readonly role: "input" | "derived" | "output";
  readonly value: number;
  readonly bound: Bound;
}

/**
 * The old form of model info, which the models not yet migrated publish;
 * {@link ModelInfo} replaces it. `inputs` lists physical quantities only, and
 * `description` is a sentence about the model.
 */
export interface LegacyModelInfo {
  readonly name: string;
  readonly label: string;
  readonly description: string;
  readonly standards: readonly StandardId[];
  readonly inputs: Readonly<
    Record<string, Pick<OutputInfo, "unit" | "applicability">>
  >;
  readonly outputs: Readonly<Record<string, OutputInfo>>;
  readonly derived?: Readonly<Record<string, OutputInfo>>;
}
