// The messages the library's checks throw (ADR 0022). Upstream's own message
// about a value stays verbatim, such as `BaseInputs`' for `units`
// (`classes_input.py:120` at v4.6.2). Every other message is the library's,
// in the `<key> must be …` form or one that likewise starts with the key, and
// it replaces each upstream message that names Python's types or Python's call
// binding (deviation _shared-10).

/**
 * `BaseInputs`' error for `units` other than `'SI'` or `'IP'`
 * (`classes_input.py:120` at v4.6.2), a `TypeError` for a value that is not a
 * string and a `RangeError` for one that is.
 */
export function notUnits(error: typeof TypeError | typeof RangeError): Error {
  return new error("Units must be either 'SI' or 'IP'");
}

/**
 * The library's message for a quantity that is not a finite number: a
 * `TypeError` for a value of another type, a `RangeError` for NaN or
 * ±Infinity.
 */
export function notFiniteNumber(
  key: string,
  error: typeof TypeError | typeof RangeError,
): Error {
  return new error(`${key} must be a finite number.`);
}

/** The library's message for a switch that is not a boolean. */
export function notBoolean(key: string): TypeError {
  return new TypeError(`${key} must be a boolean.`);
}

/**
 * The library's message for a helper's argument of the wrong type, such as a
 * string for a number, where Python raises with its interpreter's text.
 */
export function notOfType(key: string, expected: string): TypeError {
  return new TypeError(`${key} must be ${expected}.`);
}

/** The library's message for a required input left out. */
export function missingInput(key: string): TypeError {
  return new TypeError(`${key} is required.`);
}

/** The library's message for a key the model does not take. */
export function notAnInput(key: string, name: string): TypeError {
  return new TypeError(`${key} is not an input of ${name}().`);
}

/** The library's message for a model called with no inputs object. */
export function notInputsObject(name: string): TypeError {
  return new TypeError(`${name}() takes one inputs object.`);
}
