import {
  missingArguments,
  notBoolean,
  notFiniteNumber,
  notNumericType,
  notInputsObject,
  unexpectedKeyword,
} from "./errors.ts";
import type { Bound } from "./modelDocs.ts";

// Each model describes its inputs once, as its `*_INFO.inputs` (ADR 0022),
// and its inputs type and its validation are derived from it. It stands in for upstream's input dataclass (`classes_input.py`) and its
// checks (ADR 0019, whitelist item 2). The kinds take upstream's names there:
// the `numeric_field` and `choice_field` helpers (`classes_input.py:19, :23`)
// and the `is_bool` metadata key (`classes_input.py:66, :125`).

/** A number, upstream's `numeric_field`, which the parse requires finite. */
export interface NumericField {
  readonly kind: "numeric";
  readonly unit: string | null;
  readonly applicability?: Bound;
  readonly default?: number;
}

/** A switch, a field upstream marks `is_bool`, such as `limit_inputs`. */
export interface BoolField {
  readonly kind: "bool";
  readonly default: boolean;
}

/**
 * A model's `INFO.inputs`: upstream's keyword arguments, in its order, each
 * with its kind, unit, applicability and default.
 */
export type InputsInfo = Readonly<Record<string, NumericField | BoolField>>;

type ValueOf<E> = E extends NumericField
  ? number
  : E extends BoolField
    ? boolean
    : never;
type Values<I> = { -readonly [K in keyof I]: ValueOf<I[K]> };
type OptionalKey<I> = {
  [K in keyof I]: I[K] extends { readonly default: unknown } ? K : never;
}[keyof I];
type Flatten<T> = { [K in keyof T]: T[K] } & {};

/**
 * The inputs object a model's `INFO.inputs` accepts. A key with a default is
 * optional, and `undefined` takes the default, as an omitted keyword does
 * (ADR 0019, whitelist item 6).
 */
export type InputsOf<I extends InputsInfo> = Flatten<
  Pick<Values<I>, Exclude<keyof I, OptionalKey<I>>> & {
    [K in keyof Pick<Values<I>, OptionalKey<I>>]?: Values<I>[K] | undefined;
  }
>;

/** The inputs after the defaults are applied. */
export type ResolvedOf<I extends InputsInfo> = Values<I>;

/** Checks one number, as given or defaulted, in the order below. */
function parseNumeric(key: string, value: unknown): number {
  // A boolean or null (deviation _shared-6), or an array (deviation _shared-5),
  // which upstream accepts, is a TypeError.
  if (typeof value === "boolean" || value === null || Array.isArray(value)) {
    throw notFiniteNumber(key, TypeError);
  }
  if (typeof value !== "number") throw notNumericType(key);
  // Upstream computes on with NaN and ±Infinity (deviation _shared-7).
  if (!Number.isFinite(value)) throw notFiniteNumber(key, RangeError);
  return value;
}

/**
 * Validates `args`, the inputs a model was called with, against `info`;
 * returns the values with the defaults applied.
 *
 * An unknown key fails first, as an unexpected keyword does in Python when the
 * call binds. Then each key is checked in `info`'s order, so with
 * several errors the first named is predictable (deviation _shared-9):
 *
 * - a missing required key throws Python's `TypeError`, naming every missing
 *   key, as Python does;
 * - a number must be finite: upstream's `TypeError` for another
 *   type, a `TypeError` for a boolean, `null` or an array, and a `RangeError`
 *   for NaN or ±Infinity;
 * - a switch must be a boolean, with `BaseInputs`' `TypeError`, whether or not
 *   upstream checks it (deviation _shared-8).
 *
 * @param name - The model's function name, for the messages.
 * @param info - The model's `*_INFO.inputs`.
 * @param args - What the model was called with.
 * @returns The inputs, with each default applied.
 * @throws `TypeError` or `RangeError`, as above.
 */
export function parseInputs<const I extends InputsInfo>(
  name: string,
  info: I,
  args: unknown,
): ResolvedOf<I> {
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    throw notInputsObject(name);
  }
  const given = args as Readonly<Record<string, unknown>>;
  const unknown = Object.keys(given).find((key) => !Object.hasOwn(info, key));
  if (unknown !== undefined) throw unexpectedKeyword(name, unknown);

  const read = (key: string) =>
    Object.hasOwn(given, key) ? given[key] : undefined;
  const values: Record<string, number | boolean> = {};
  for (const [key, entry] of Object.entries(info)) {
    let value = read(key);
    if (value === undefined) {
      if (entry.default === undefined) {
        throw missingArguments(
          name,
          Object.entries(info)
            .filter(
              ([k, e]) => e.default === undefined && read(k) === undefined,
            )
            .map(([k]) => k),
        );
      }
      value = entry.default;
    }
    if (entry.kind === "numeric") values[key] = parseNumeric(key, value);
    else if (typeof value === "boolean") values[key] = value;
    else throw notBoolean(key);
  }
  return values as ResolvedOf<I>;
}
