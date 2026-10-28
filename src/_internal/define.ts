import {
  missingInput,
  notAnInput,
  notFiniteNumber,
  notInputsObject,
  notOfType,
} from "./errors.ts";
import { deepFreeze } from "./modelInfo.ts";
import type { ChoiceField, InputsInfo, ResolvedOf } from "./modelInfo.ts";
import { Units } from "../utilities/options.ts";

// The parse of a model's inputs against its `INFO.inputs` (ADR 0022), standing
// in for upstream's input dataclass checks (`classes_input.py`; ADR 0019,
// whitelist item 2), and `BASE_INPUTS_UNITS`.

/**
 * Upstream's `BaseInputs.units`: defaults to 'SI' and raises "Units must be
 * either 'SI' or 'IP'" (`classes_input.py:95, :114-121`). Every model that
 * takes `units` references it from its `INFO.inputs`, so the check is written
 * once, as upstream writes it.
 */
export const BASE_INPUTS_UNITS = deepFreeze({
  kind: "choice",
  allowed: [Units.SI, Units.IP],
  default: Units.SI,
  message: "Units must be either 'SI' or 'IP'",
} as const satisfies ChoiceField);

/**
 * Upstream's message for a `choice_field` given a value outside `allowed`,
 * `f"{name} must be one of {allowed!r}"` (`classes_input.py:183`): the list
 * written as Python's `repr` writes a list of strings with no quote or
 * backslash in them, each in single quotes.
 *
 * @param name - The field's name.
 * @param allowed - Its `allowed`, in upstream's order.
 * @returns The message, byte for byte as upstream's.
 */
export function choiceFieldMessage(
  name: string,
  allowed: readonly string[],
): string {
  return `${name} must be one of [${allowed.map((value) => `'${value}'`).join(", ")}]`;
}

/** Checks one number, as given or defaulted. */
function parseNumeric(key: string, value: unknown): number {
  // Any other type is a TypeError, a boolean or null (deviation _shared-6) and
  // an array (deviation _shared-5) included, which upstream accepts.
  if (typeof value !== "number") throw notFiniteNumber(key, TypeError);
  // Upstream computes on with NaN and ±Infinity (deviation _shared-7).
  if (!Number.isFinite(value)) throw notFiniteNumber(key, RangeError);
  return value;
}

/**
 * Checks one string option, as given or defaulted, and returns it as given:
 * upstream's model reads its own argument, not the inputs class's upper-cased
 * copy. A `nullable` entry returns `null` unchecked, as `BaseInputs` skips a
 * `choice_field` that is `None`.
 */
function parseChoice(value: unknown, entry: ChoiceField): string | null {
  const { allowed, message } = entry;
  if (value === null && entry.nullable) return null;
  const errorText = () =>
    typeof message === "string" ? message : message(String(value));
  // Upstream compares `str(value).upper()` for `units`, so it raises the same
  // error for any value that is not a string (deviation _shared-24), and
  // `posture.lower()` raises `AttributeError` for one (deviation solar_gain-6).
  if (typeof value !== "string") throw new TypeError(errorText());
  // Upstream upper-cases `units` and lower-cases `posture`, and `allowed` is
  // written in the case upstream compares in.
  if (
    !allowed.includes(value.toUpperCase()) &&
    !allowed.includes(value.toLowerCase())
  )
    throw new RangeError(errorText());
  return value;
}

/**
 * Validates `args`, the inputs a model was called with, against the model's
 * `INFO.inputs`; returns the values with the defaults applied.
 *
 * An unknown key fails first, as an unexpected keyword does in Python when the
 * call binds, with a `TypeError` naming the first. Then each key is checked in
 * `INFO.inputs`' order, and the parse stops at the first error, so with several
 * errors the first named is predictable (deviation _shared-9):
 *
 * - a required key must be given, or a `TypeError` names it;
 * - a number must be finite: a `TypeError` for any other type, a boolean,
 *   `null` or an array included, and a `RangeError` for NaN or ±Infinity;
 * - a switch must be a boolean, or a `TypeError` names it, whether or not
 *   upstream checks it (deviation _shared-8);
 * - a string option must be one of its `allowed` values, in any case, or its
 *   entry's `message` is thrown: a `TypeError` for a value that is not a
 *   string, a `RangeError` for one that is; a `nullable` one may be `null`.
 *
 * @param info - The model's `*_INFO`: its `name` for the messages, its
 * `inputs` for the checks.
 * @param args - What the model was called with.
 * @returns The inputs, with each default applied.
 * @throws `TypeError` or `RangeError`, as above.
 */
export function parseInputs<I extends InputsInfo>(
  info: { readonly name: string; readonly inputs: I },
  args: unknown,
): ResolvedOf<I> {
  const { name, inputs } = info;
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    throw notInputsObject(name);
  }
  const given = args as Readonly<Record<string, unknown>>;
  const unknown = Object.keys(given).find((key) => !Object.hasOwn(inputs, key));
  if (unknown !== undefined) throw notAnInput(unknown, name);

  const values: Record<string, number | boolean | string | null> = {};
  for (const [key, entry] of Object.entries(inputs)) {
    let value = Object.hasOwn(given, key) ? given[key] : undefined;
    if (value === undefined) {
      if (entry.default === undefined) throw missingInput(key);
      value = entry.default;
    }
    if (entry.kind === "numeric") values[key] = parseNumeric(key, value);
    else if (entry.kind === "choice") values[key] = parseChoice(value, entry);
    else if (typeof value === "boolean") values[key] = value;
    else throw notOfType(key, "a boolean");
  }
  return values as ResolvedOf<I>;
}
