import type { ClassifierBins } from "./classifierBins.ts";
import type { Standard } from "../utilities/options.ts";

// The model info every model publishes (`*_INFO`), the inputs and outputs types
// derived from it, the warnings rows (ADRs 0022-0024) and `deepFreeze`.

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
  | "hPa"
  | "kPa"
  | "m²"
  | "kg/h/m²"
  | "mL/h/m²"
  | "kg"
  | "m"
  | "min"
  | "g"
  | "W·min/m²"
  | "°C/m"
  | "km/h"
  | "W"
  | "l/(m² s)"
  | "h"
  | "cm"
  | "years"
  | "torr";

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
 * verbatim, such as a solver falling back, or of the warning a scipy routine
 * upstream calls emits, such as `fsolve` stopping short of convergence.
 * Nothing is printed to the console.
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
 * `kind` is its value kind, a number (`numeric`), a yes/no (`flag`, after
 * upstream's `_as_flag`, `_internal/validation.py:181`), a label (`label`), or
 * a label or a number (`label_or_numeric`, upstream's `str | float`, `ireq`'s
 * `dle_min`). A `flag` is a `boolean`: `true` where upstream returns 1.0,
 * `false` where it returns 0.0.
 *
 * `nullable` marks an output upstream can return as NaN, its "no value": the
 * output is then `null` in place of NaN, and its type adds `null`, so a nullable
 * `flag` is `boolean | null` and a nullable `label` `string | null` (decision
 * 310, ADR 0028). Check it explicitly (`result.tsv === null`): an untyped
 * JavaScript caller's arithmetic reads `null` as 0, `null * 2` being 0 where
 * `NaN * 2` is NaN (node v26.8.2).
 *
 * `unit` is the unit of measurement, or `null` if dimensionless.
 *
 * `applicability` is the range over which the model is applicable. It is an
 * **applicability gate, not a clamp**. Outside it, and only when `limit_inputs`
 * is enabled, the output is `null` — it does not constrain the value to the
 * bound. On an output such as `pmv_ppd_iso`'s `pmv`, read it as "outputs
 * outside this band are suppressed", not "the output is guaranteed to fall
 * inside it". A front end should surface it as a condition on the answer rather
 * than as a slider limit.
 *
 * `classifier`, if present, holds the bins used to turn this continuous output
 * into a categorical label. Pass it to `classifyFromBins` rather than
 * reimplementing the edge handling.
 *
 * `interval`, on a `flag` output, is the {@link Interval} of the quantity it
 * tests inside which it is `true`: `pmv_ppd_ashrae`'s `compliance` is `true` for
 * -0.5 < pmv < 0.5. Unlike `applicability`, it gates nothing.
 *
 * `series` marks a time series, a frozen array of its kind's values, one per
 * time step: `ridge_regression_predict_t_re_t_sk`'s `t_re` (decision 269).
 *
 * `none` marks a field that the model leaves at its dataclass's `None`
 * default, which the field then holds as `null`: `heat_index_lu`'s
 * `stress_category` (`classes_return.py:315`, `models/heat_index_lu.py:63`;
 * decision 279). Such a field is never computed, so it takes no `nullable`,
 * `series` or `classifier`.
 */
export interface OutputField {
  readonly kind: "numeric" | "flag" | "label" | "label_or_numeric";
  readonly nullable?: true;
  readonly series?: true;
  readonly none?: true;
  readonly unit: UnitSymbol | null;
  readonly applicability?: Bound;
  readonly classifier?: ClassifierBins;
  readonly interval?: Interval;
}

/**
 * An open interval: the values strictly between `min` and `max`, both ends
 * excluded, where a {@link Bound} includes them.
 */
export interface Interval {
  readonly min: number;
  readonly max: number;
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

/**
 * A number, upstream's `numeric_field`, which the parse requires finite.
 *
 * A `default` of `false` is upstream's `False` for a number the model computes
 * when it is not given, `pmv_athb`'s `clo` (`models/pmv_athb.py:18, :98`):
 * the key then takes `false` too, and only `false`, of the booleans. A
 * `default` of `null` is upstream's `None` for a number the model may go
 * without, `at`'s `q` (`models/at.py:14, :71-75`): the key then takes `null`
 * too.
 *
 * `integer` marks a number upstream types as `int`, `ridge_regression_predict_t_re_t_sk`'s
 * `duration` (`classes_input.py:60`): the parse then takes only an integer.
 *
 * `series` marks a time series, `two_nodes_gagge_sleep`'s `tdb`: the key
 * takes a number or an array of numbers, and the parse returns a frozen
 * array, a number as an array of one, as upstream's `np.atleast_1d` reads it
 * (`models/two_nodes_gagge_sleep.py:115`; decision 277).
 */
export interface NumericField {
  readonly kind: "numeric";
  readonly unit: UnitSymbol | null;
  readonly applicability?: Bound;
  readonly default?: number | false | null;
  readonly integer?: true;
  readonly series?: true;
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
 * (`models/solar_gain.py:210-215`), and a `choice_field`, which `BaseInputs`
 * checks against its `allowed` (`classes_input.py:23, :155-159`).
 *
 * Where upstream's text embeds the value given, `message` is a function of
 * that value, which the parse calls with `String(value)`:
 * `pmv_ppd_ashrae`'s `standard` reads "Model 'random' is not supported. …"
 * (`models/pmv_ppd_ashrae.py:182-188`).
 *
 * `nullable` marks a `choice_field`: `BaseInputs` skips one that is `None`
 * (`classes_input.py:138-139`), so `null` passes the parse unchanged.
 */
export interface ChoiceField {
  readonly kind: "choice";
  readonly allowed: readonly string[];
  readonly default?: string;
  readonly message: string | ((value: string) => string);
  readonly nullable?: true;
}

/**
 * An instance of a class, which the parse checks with `instanceof`, as
 * upstream checks `isinstance`, and fails with `message`, upstream's own text
 * for that check, as a `TypeError`: `sports_heat_stress_risk`'s `sport`, a
 * `_SportsValues` (`classes_input.py:1262-1265`). It takes no default, as
 * `sport` has none.
 */
export interface InstanceField {
  readonly kind: "instance";
  readonly of: abstract new (...args: never) => object;
  readonly default?: never;
  readonly message: string;
}

/**
 * A model's `INFO.inputs`: upstream's keyword arguments, in its order, each
 * with its kind, unit, applicability and default.
 */
export type InputsInfo = Readonly<
  Record<string, NumericField | BoolField | ChoiceField | InstanceField>
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
 * `numeric_field` and `choice_field` helpers (`classes_input.py:19, :23`),
 * the `is_bool` metadata key (`classes_input.py:66, :125`) and the
 * `isinstance` check (`classes_input.py:1262`). A `choice` is a `string`: the
 * parse accepts it in any case and returns it as given. An `instance` is an
 * instance of its entry's class (`KindValue`). A `flag` output is a
 * `boolean`, where upstream's `_as_flag` returns 1.0 or 0.0, and a
 * `label_or_numeric` output a `string` or a `number`, upstream's `str | float`.
 */
interface KindValues {
  numeric: number;
  bool: boolean;
  flag: boolean;
  choice: string;
  instance: object;
  label: string;
  label_or_numeric: string | number;
}

type OptionalKey<I extends InputsInfo> = {
  [K in keyof I]: I[K] extends { readonly default: unknown } ? K : never;
}[keyof I];
type NullOf<F> = F extends
  { readonly nullable: true } | { readonly default: null }
  ? null
  : never;
type FalseOf<F> = F extends { readonly default: false } ? false : never;
type KindValue<F extends InputsInfo[string]> = F extends InstanceField
  ? InstanceType<F["of"]>
  : KindValues[F["kind"]];
type InputValue<F extends InputsInfo[string], Series> = F extends ChoiceField
  ? F["allowed"][number] | NullOf<F>
  : F extends { readonly series: true }
    ? Series
    : KindValue<F> | FalseOf<F> | NullOf<F>;
type Flatten<T> = { [K in keyof T]: T[K] } & {};

/**
 * The inputs object a model's `INFO` accepts, upstream's input dataclass. A
 * key with a default is optional, and `undefined` takes the default, as an
 * omitted keyword does (ADR 0019, whitelist item 6); a `choice` takes one of
 * its `allowed`, or `null` where it is `nullable`; a `numeric` whose default
 * is `false` or `null` takes that value too; an `instance` takes an instance
 * of its `of`; a `series` takes `Series`, by default a number or an array of
 * them, and `number` for a call of one time step (decision 277).
 */
export type InputsOf<
  M extends { readonly inputs: InputsInfo },
  Series extends number | readonly number[] = number | readonly number[],
> = Flatten<
  {
    -readonly [
      K in keyof M["inputs"] as K extends OptionalKey<M["inputs"]> ? never : K
    ]: InputValue<M["inputs"][K], Series>;
  } & {
    -readonly [
      K in keyof M["inputs"] as K extends OptionalKey<M["inputs"]> ? K : never
    ]?: InputValue<M["inputs"][K], Series> | undefined;
  }
>;

/**
 * The inputs after the parse, each default applied, a `series` as a frozen
 * array.
 */
export type ResolvedOf<I extends InputsInfo> = {
  -readonly [K in keyof I]: I[K] extends { readonly series: true }
    ? readonly number[]
    : KindValue<I[K]> | NullOf<I[K]> | FalseOf<I[K]>;
};

/**
 * What a model returns, upstream's return dataclass: each field
 * `INFO.outputs` describes, `readonly` and typed by its kind, then
 * `warnings`; a `nullable` field adds `null`, its "no value" (decision 310), a
 * `none` field is `null`, and a `series` field is a readonly array of those
 * values.
 * A numeric series takes `Series`, by default `readonly number[]`, each value
 * `number | null` where it is nullable:
 * `number | readonly number[]` for a model that returns a number for one time
 * step, as `two_nodes_gagge_sleep` does (decisions 276, 277).
 */
export type OutputsOf<
  M extends { readonly outputs: OutputsInfo },
  Series extends number | readonly number[] = readonly number[],
> = Flatten<
  {
    readonly [K in keyof M["outputs"]]: M["outputs"][K] extends {
      readonly series: true;
    }
      ? M["outputs"][K] extends {
          readonly kind: "numeric";
          readonly nullable?: undefined;
        }
        ? Series
        : M["outputs"][K] extends { readonly kind: "numeric" }
          ? Series extends number
            ? number | null
            : readonly (number | null)[]
          : readonly (
              | KindValues[M["outputs"][K]["kind"]]
              | (M["outputs"][K] extends { readonly nullable: true }
                  ? null
                  : never)
            )[]
      : M["outputs"][K] extends { readonly none: true }
        ? null
        : | KindValues[M["outputs"][K]["kind"]]
          | (M["outputs"][K] extends { readonly nullable: true }
              ? null
              : never);
  } & ModelOutputs
>;

/**
 * The value type of each output kind as a model computes it, upstream's
 * representation, before {@link buildOutputs} converts it: a `flag` is 1.0 or
 * 0.0, as upstream's `_as_flag` returns it.
 */
interface ComputedKindValues {
  numeric: number;
  flag: number;
  label: string;
  label_or_numeric: string | number;
}

type ComputedValue<F extends OutputField> = F extends {
  readonly none: true;
}
  ? null
  : | ComputedKindValues[F["kind"]]
    | (F extends { readonly nullable: true } ? number : never);

/**
 * The values a model computes, one per `INFO.outputs` key, which
 * {@link buildOutputs} takes: upstream's representation, a nullable output's
 * NaN included, a `series` output a number or an array of them.
 */
export type ComputedOutputsOf<M extends { readonly outputs: OutputsInfo }> = {
  readonly [K in keyof M["outputs"]]: M["outputs"][K] extends {
    readonly series: true;
  }
    ? ComputedValue<M["outputs"][K]> | readonly ComputedValue<M["outputs"][K]>[]
    : ComputedValue<M["outputs"][K]>;
};

/**
 * Returns a model's outputs, as `parseInputs` takes its inputs: the one
 * place where the values a model computes, in upstream's representation,
 * become its public outputs (decision 314, ADR 0028).
 *
 * The outputs are built in `INFO.outputs`' order, then `warnings`, and each is
 * converted by its entry:
 *
 * - an output declared `nullable` that is NaN becomes `null`, as does each NaN
 *   element of a nullable time series;
 * - a `flag`'s 1.0 becomes `true` and its 0.0 `false`;
 * - any other value is returned as it is, a NaN in an output not declared
 *   `nullable` included, which the parity suite then reports.
 *
 * "No value" is `null`, never NaN, and is checked explicitly
 * (`result.tsv === null`), since an untyped JavaScript caller's arithmetic
 * reads `null` as 0: `null * 2` is 0 where `NaN * 2` is NaN (node v26.8.2).
 *
 * The outputs, `warnings` and each time series are frozen.
 *
 * @param info - The model's `*_INFO`, whose `outputs` drive the conversion.
 * @param values - The values the model computed, one per `INFO.outputs` key.
 * @param warnings - The call's {@link ModelWarning} rows.
 * @returns The outputs, then `warnings`, frozen.
 */
export function buildOutputs<M extends { readonly outputs: OutputsInfo }>(
  info: M,
  values: ComputedOutputsOf<M>,
  warnings: readonly ModelWarning[],
): OutputsOf<M> {
  const computed = values as Readonly<Record<string, unknown>>;
  const outputs: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(info.outputs)) {
    const value = computed[key];
    outputs[key] = Array.isArray(value)
      ? Object.freeze(value.map((item: unknown) => toOutput(item, field)))
      : toOutput(value, field);
  }
  outputs.warnings = Object.freeze(warnings);
  return Object.freeze(outputs) as OutputsOf<M>;
}

/** Converts one computed value by its `INFO.outputs` entry. */
function toOutput(value: unknown, field: OutputField): unknown {
  if (field.nullable === true && Number.isNaN(value)) return null;
  if (field.kind === "flag" && (value === 1 || Object.is(value, 0)))
    return value === 1;
  return value;
}

/**
 * The inverse of {@link buildOutputs}: a model's public outputs back in
 * upstream's representation, for a model that computes on another model's
 * outputs as upstream's does (decision 321, ADR 0028). Each `null` of a
 * `nullable` output, and of each element of a nullable time series, becomes NaN,
 * and a `flag`'s `true` and `false` become 1.0 and 0.0; any other value, a
 * `none` output's `null` included, and `warnings` are returned as they are.
 *
 * @param info - The called model's `*_INFO`, whose `outputs` drive the
 *   conversion.
 * @param outputs - What the called model returned.
 * @returns The values the called model computed, then `warnings`.
 */
export function toComputedOutputs<M extends { readonly outputs: OutputsInfo }>(
  info: M,
  outputs: OutputsOf<M>,
): ComputedOutputsOf<M> & ModelOutputs {
  const returned = outputs as Readonly<Record<string, unknown>>;
  const computed: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(info.outputs)) {
    const value = returned[key];
    computed[key] = Array.isArray(value)
      ? value.map((item: unknown) => toComputed(item, field))
      : toComputed(value, field);
  }
  computed.warnings = outputs.warnings;
  return computed as ComputedOutputsOf<M> & ModelOutputs;
}

/** Converts one returned value back by its `INFO.outputs` entry. */
function toComputed(value: unknown, field: OutputField): unknown {
  if (field.nullable === true && value === null) return NaN;
  if (field.kind === "flag" && typeof value === "boolean") return value ? 1 : 0;
  return value;
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
 * upstream's order, with its kind (`numeric`, `bool`, `choice` or `instance`),
 * unit, applicability and default. The model validates its inputs against it, and its inputs type
 * is derived from it. `outputs` are the returned values, in the order of
 * upstream's return dataclass, each with its kind (`numeric`, `flag`,
 * `label` or `label_or_numeric`) and unit, and the outputs type is derived from it. `derived` covers
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
