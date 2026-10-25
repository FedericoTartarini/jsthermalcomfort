import {
  missingArguments,
  notBoolean,
  notFiniteNumber,
  notNumericType,
  notParamsObject,
  unexpectedKeyword,
} from "./errors.ts";
import type { Bound, VariableInfo } from "./modelDocs.ts";

// The input definition (ADR 0022): each model declares its inputs once, as
// `*_PARAMS` (`as const satisfies Definition`), and its Params type, its
// validation and its `INFO.inputs` are derived from it. It stands in for
// upstream's input dataclass (`classes_input.py`) and its checks (ADR 0019,
// whitelist item 2).

/** A physical quantity: a finite number, listed in `INFO.inputs`. */
export interface Quantity {
  readonly kind: "quantity";
  readonly unit: string | null;
  readonly applicability?: Bound;
  readonly default?: number;
}

/** A boolean switch, such as `round_output` or `limit_inputs`. */
export interface Flag {
  readonly kind: "flag";
  readonly default: boolean;
}

/** A model's input definition: upstream's keyword arguments, in its order. */
export type Definition = Readonly<Record<string, Quantity | Flag>>;

type ValueOf<E> = E extends Quantity
  ? number
  : E extends Flag
    ? boolean
    : never;
type Values<D> = { -readonly [K in keyof D]: ValueOf<D[K]> };
type OptionalKey<D> = {
  [K in keyof D]: D[K] extends { readonly default: unknown } ? K : never;
}[keyof D];
type Flatten<T> = { [K in keyof T]: T[K] } & {};

/**
 * The params object a definition accepts. A key with a default is optional,
 * and `undefined` takes the default, as an omitted keyword does (ADR 0019,
 * whitelist item 6). Each key keeps its comment from the definition.
 */
export type ParamsOf<D extends Definition> = Flatten<
  Pick<Values<D>, Exclude<keyof D, OptionalKey<D>>> & {
    [K in keyof Pick<Values<D>, OptionalKey<D>>]?: Values<D>[K] | undefined;
  }
>;

/** The params after the defaults are applied. */
export type ResolvedOf<D extends Definition> = Values<D>;

/** The `INFO.inputs` a definition derives: its quantities, in its order. */
export function inputsInfo(
  definition: Definition,
): Record<string, VariableInfo> {
  const info: Record<string, VariableInfo> = {};
  for (const [key, entry] of Object.entries(definition)) {
    if (entry.kind !== "quantity") continue;
    info[key] =
      entry.applicability === undefined
        ? { unit: entry.unit }
        : { unit: entry.unit, applicability: entry.applicability };
  }
  return info;
}

/** Checks one quantity, as given or defaulted, in the order below. */
function parseQuantity(key: string, value: unknown): number {
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
 * Validates `params` against `definition`; returns the values with the
 * defaults applied.
 *
 * An unknown key fails first, as an unexpected keyword does in Python when the
 * call binds. Then each key is checked in the definition's order, so with
 * several errors the first named is predictable (deviation _shared-9):
 *
 * - a missing required key throws Python's `TypeError`, naming every missing
 *   key, as Python does;
 * - a quantity must be a finite number: upstream's `TypeError` for another
 *   type, a `TypeError` for a boolean, `null` or an array, and a `RangeError`
 *   for NaN or ±Infinity;
 * - a switch must be a boolean, with `BaseInputs`' `TypeError`, whether or not
 *   upstream checks it (deviation _shared-8).
 *
 * @param name - The model's function name, for the messages.
 * @param definition - The model's `*_PARAMS`.
 * @param params - What the model was called with.
 * @returns The params, with each default applied.
 * @throws `TypeError` or `RangeError`, as above.
 */
export function parseParams<const D extends Definition>(
  name: string,
  definition: D,
  params: unknown,
): ResolvedOf<D> {
  if (typeof params !== "object" || params === null || Array.isArray(params)) {
    throw notParamsObject(name);
  }
  const given = params as Readonly<Record<string, unknown>>;
  const unknown = Object.keys(given).find(
    (key) => !Object.hasOwn(definition, key),
  );
  if (unknown !== undefined) throw unexpectedKeyword(name, unknown);

  const read = (key: string) =>
    Object.hasOwn(given, key) ? given[key] : undefined;
  const values: Record<string, number | boolean> = {};
  for (const [key, entry] of Object.entries(definition)) {
    let value = read(key);
    if (value === undefined) {
      if (entry.default === undefined) {
        throw missingArguments(
          name,
          Object.entries(definition)
            .filter(
              ([k, e]) => e.default === undefined && read(k) === undefined,
            )
            .map(([k]) => k),
        );
      }
      value = entry.default;
    }
    if (entry.kind === "quantity") values[key] = parseQuantity(key, value);
    else if (typeof value === "boolean") values[key] = value;
    else throw notBoolean(key);
  }
  return values as ResolvedOf<D>;
}
