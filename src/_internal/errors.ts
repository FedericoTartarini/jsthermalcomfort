// The messages the library's checks throw (ADR 0022). Upstream's own message
// about a value stays verbatim, in the model's INFO entry for a string option
// (`ChoiceField.message`), such as `BaseInputs`' for `units`
// (`classes_input.py:120` at v4.8.0). Every other message is the library's
// and starts with the key, in the `<key> must be …` form or a like one, or with
// the model's name for a call with no inputs object; it replaces each upstream
// message that names Python's types or Python's call binding (deviations
// _shared-10, for the parse, _shared-23, for `units_converter`, and _shared-31,
// for `transpose_sharp_altitude`), or a raise that names no input (deviation
// pet_steady-6).

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

/**
 * The library's message for a value of the wrong type: a switch that is not a
 * boolean, or a helper's argument of the wrong type where Python raises with
 * its interpreter's text, such as a string for a number.
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

/**
 * The library's message for a negative quantity where upstream's arithmetic
 * makes a complex number and raises on it.
 */
export function negativeInput(key: string): RangeError {
  return new RangeError(`${key} must not be negative.`);
}

/** The library's message for a model called with no inputs object. */
export function notInputsObject(name: string): TypeError {
  return new TypeError(`${name}() takes one inputs object.`);
}
