import type { ClassifierBins } from "./classifierBins.ts";
import type { Standard } from "../utilities/options.ts";

// The model info every model publishes (`*_INFO`), the inputs and outputs types
// derived from it, the warnings rows (ADRs 0022-0024) and `deepFreeze`, with
// the old forms the models not yet migrated use at the end.

/** One of the identifiers in `Standard`, e.g. `"7730-2025"` or `"55-2023"`. */
export type StandardId = (typeof Standard)[keyof typeof Standard];

/**
 * A unit symbol, as upstream's docstrings write it: the units the models use.
 * A model that needs a new one adds it here, so a misspelt unit fails to
 * compile.
 */
export type UnitSymbol =
  | "°C"
  | "%"
  | "m/s"
  | "met"
  | "clo"
  | "W/m²"
  | "°"
  | "Pa"
  | "kPa"
  | "m²"
  | "kg/h/m²"
  | "mL/h/m²";

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
 * One row of a model's outputs' `warnings`: what upstream reports with
 * `warnings.warn` (ADR 0024, deviation _shared-3).
 *
 * A `range` row is one bound a call broke, where upstream's `_valid_range`
 * (or a check like it) warns:
 *
 * - `key` is the name upstream gives the check, verbatim (`"tdb"`,
 *   `"tr - tdb"`, `"pa (kPa)"`), so rows with the same key are told apart by
 *   `role` and `unit`;
 * - `role` is `input` for a quantity as the caller gave it, `derived` for one
 *   computed from the inputs, `output` for an output upstream checks;
 * - `value` is the value upstream compared, and `unit` and `bound` are
 *   upstream's, with no conversion. A fixed `bound` is the frozen object the
 *   model's `*_INFO` references.
 *
 * Range rows are returned whatever `limit_inputs` is: with it on they are why
 * the outputs are NaN, with it off they are what the numbers were computed
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
      readonly unit: UnitSymbol | null;
      readonly bound: Bound;
    }
  | { readonly kind: "notice"; readonly message: string };

/**
 * What every model's outputs extend, as upstream's return dataclasses extend
 * `AutoStrMixin` (ADR 0023). The outputs are frozen, their rows included.
 */
export interface ModelOutputs {
  /** Added: the call's {@link ModelWarning} rows, in the order of its checks. */
  readonly warnings: readonly ModelWarning[];
}

/**
 * One returned value in `INFO.outputs`; `INFO.inputs` describes the inputs
 * (`InputsInfo`).
 *
 * `kind` is its value kind, a number (`numeric`), a boolean (`bool`) or a
 * label (`label`). `masked` adds the NaN `number` of a masked output, so a
 * masked `label` is `string | number` (ADR 0023).
 *
 * `unit` is the unit of measurement, or `null` if dimensionless.
 *
 * `applicability` is the range over which the model is applicable. It is an
 * **applicability gate, not a clamp**. Outside it, and only when `limit_inputs`
 * is enabled, the model returns NaN — it does not constrain the value to the
 * bound. On an output such as `pmv_ppd_iso`'s `pmv`, read it as "outputs
 * outside this band are suppressed", not "the output is guaranteed to fall
 * inside it". A front end should surface it as a condition on the answer rather
 * than as a slider limit.
 *
 * `classifier`, if present, holds the bins used to turn this continuous output
 * into a categorical label. Pass it to `classifyFromBins` rather than
 * reimplementing the edge handling.
 */
export interface OutputField {
  readonly kind: "numeric" | "bool" | "label";
  readonly masked?: true;
  readonly unit: UnitSymbol | null;
  readonly applicability?: Bound;
  readonly classifier?: ClassifierBins;
}

/**
 * One quantity in `INFO.derived`, computed from the inputs and checked by the
 * model. `unit` and `applicability` read as an {@link OutputField}'s do: the
 * bound is a gate, not a clamp.
 */
export interface DerivedField {
  readonly unit: UnitSymbol | null;
  readonly applicability?: Bound;
}

/** A number, upstream's `numeric_field`, which the parse requires finite. */
export interface NumericField {
  readonly kind: "numeric";
  readonly unit: UnitSymbol | null;
  readonly applicability?: Bound;
  readonly default?: number;
}

/** A switch, a field upstream marks `is_bool`, such as `limit_inputs`. */
export interface BoolField {
  readonly kind: "bool";
  readonly default: boolean;
}

/**
 * A string option, which takes one of `allowed` in any case, and fails with
 * `message`, upstream's own text for that check (ADR 0022): `units`, a plain
 * field that `BaseInputs` checks by its name (`classes_input.py:95, :114-121`),
 * `solar_gain`'s `posture`, which the model checks itself
 * (`models/solar_gain.py:207-212`), and a `choice_field`, which `BaseInputs`
 * checks against its `allowed` (`classes_input.py:23, :155-159`).
 *
 * `nullable` marks a `choice_field`: `BaseInputs` skips one that is `None`
 * (`classes_input.py:138-139`), so `null` passes the parse unchanged.
 */
export interface ChoiceField {
  readonly kind: "choice";
  readonly allowed: readonly string[];
  readonly default?: string;
  readonly message: string;
  readonly nullable?: true;
}

/**
 * A model's `INFO.inputs`: upstream's keyword arguments, in its order, each
 * with its kind, unit, applicability and default.
 */
export type InputsInfo = Readonly<
  Record<string, NumericField | BoolField | ChoiceField>
>;

/**
 * A model's `INFO.outputs`: each field of upstream's return dataclass other
 * than `warnings`, in its order.
 */
export type OutputsInfo = Readonly<Record<string, OutputField>>;

/**
 * A model's `INFO.derived`: each quantity upstream checks after computing it,
 * keyed by upstream's name for the check.
 */
export type DerivedInfo = Readonly<Record<string, DerivedField>>;

/**
 * The value type of each kind. The input kinds take upstream's names: the
 * `numeric_field` and `choice_field` helpers (`classes_input.py:19, :23`) and
 * the `is_bool` metadata key (`classes_input.py:66, :125`). A `choice` is a
 * `string`: the parse accepts it in any case and returns it as given.
 */
interface KindValues {
  numeric: number;
  bool: boolean;
  choice: string;
  label: string;
}

type OptionalKey<I extends InputsInfo> = {
  [K in keyof I]: I[K] extends { readonly default: unknown } ? K : never;
}[keyof I];
type NullOf<F> = F extends { readonly nullable: true } ? null : never;
type InputValue<F extends InputsInfo[string]> = F extends ChoiceField
  ? F["allowed"][number] | NullOf<F>
  : KindValues[F["kind"]];
type Flatten<T> = { [K in keyof T]: T[K] } & {};

/**
 * The inputs object a model's `INFO` accepts, upstream's input dataclass. A
 * key with a default is optional, and `undefined` takes the default, as an
 * omitted keyword does (ADR 0019, whitelist item 6); a `choice` takes one of
 * its `allowed`, or `null` where it is `nullable`.
 */
export type InputsOf<M extends { readonly inputs: InputsInfo }> = Flatten<
  {
    -readonly [
      K in keyof M["inputs"] as K extends OptionalKey<M["inputs"]> ? never : K
    ]: InputValue<M["inputs"][K]>;
  } & {
    -readonly [
      K in keyof M["inputs"] as K extends OptionalKey<M["inputs"]> ? K : never
    ]?: InputValue<M["inputs"][K]> | undefined;
  }
>;

/** The inputs after the parse, each default applied. */
export type ResolvedOf<I extends InputsInfo> = {
  -readonly [K in keyof I]: KindValues[I[K]["kind"]] | NullOf<I[K]>;
};

/**
 * What a model returns, upstream's return dataclass: each field
 * `INFO.outputs` describes, `readonly` and typed by its kind, then
 * `warnings`; a `masked` field adds the NaN `number` (ADR 0023).
 */
export type OutputsOf<M extends { readonly outputs: OutputsInfo }> = Flatten<
  {
    readonly [K in keyof M["outputs"]]:
      | KindValues[M["outputs"][K]["kind"]]
      | (M["outputs"][K] extends { readonly masked: true } ? number : never);
  } & ModelOutputs
>;

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
 * upstream's order, with its kind (`numeric`, `bool` or `choice`), unit, applicability
 * and default. The model validates its inputs against it, and its inputs type
 * is derived from it. `outputs` are the returned values, in the order of
 * upstream's return dataclass, each with its kind (`numeric`, `bool` or
 * `label`) and unit, and the outputs type is derived from it. `derived` covers
 * quantities computed from the inputs rather than supplied by the caller,
 * keyed by upstream's name for the check, as the `warnings` rows are.
 *
 * A model with a `standard` input has a `standard` choice entry in `inputs`,
 * whose `allowed` lists the standards it accepts and whose `default` is
 * upstream's. A model without that entry takes no `standard` input.
 */
export interface ModelInfo {
  readonly name: string;
  readonly label: string;
  /**
   * The standards whose values (equations, limits, thresholds, tables) the
   * model takes. A model with a `standard` input takes the one passed, from
   * this same array, default first; `[]` where upstream names none.
   */
  readonly standards: readonly StandardId[];
  readonly inputs: InputsInfo;
  readonly outputs: OutputsInfo;
  readonly derived?: DerivedInfo;
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
    Record<
      string,
      { readonly unit: UnitSymbol | null; readonly applicability?: Bound }
    >
  >;
  readonly outputs: Readonly<
    Record<
      string,
      {
        readonly unit: UnitSymbol | null;
        readonly applicability?: Bound;
        readonly classifier?: ClassifierBins;
      }
    >
  >;
  readonly derived?: LegacyModelInfo["outputs"];
}
