// The messages the library's checks throw (ADR 0022). Where upstream raises,
// the message is upstream's, verbatim: Python's own for a call that does not
// bind, `BaseInputs`' for its checks (`classes_input.py` at v4.6.2). A check
// that only the library makes has a uniform message that names the key
// (deviation _shared-10).

/** A list of names as Python's `missing ... arguments` message words it. */
function pythonNames(names: readonly string[]): string {
  const quoted = names.map((name) => `'${name}'`);
  if (quoted.length <= 2) return quoted.join(" and ");
  return `${quoted.slice(0, -1).join(", ")}, and ${quoted.at(-1) ?? ""}`;
}

/**
 * Python's `TypeError` for a keyword the function does not take, as for
 * `f(foo=1)`: "f() got an unexpected keyword argument 'foo'".
 */
export function unexpectedKeyword(name: string, key: string): TypeError {
  return new TypeError(`${name}() got an unexpected keyword argument '${key}'`);
}

/**
 * Python's `TypeError` for required arguments left out, as for `f()` with
 * `def f(a, b)`: "f() missing 2 required positional arguments: 'a' and 'b'".
 */
export function missingArguments(
  name: string,
  missing: readonly string[],
): TypeError {
  const noun = missing.length === 1 ? "argument" : "arguments";
  return new TypeError(
    `${name}() missing ${missing.length} required positional ${noun}: ${pythonNames(missing)}`,
  );
}

/**
 * `BaseInputs`' `TypeError` for a numeric field given a value of another type:
 * `validate_type` (`_internal/validation.py:229` at v4.6.2) with
 * `numeric_field`'s types (`classes_input.py:16, :20`).
 */
export function notNumericType(key: string): TypeError {
  return new TypeError(
    `${key} must be one of the following types: (<class 'float'>, <class 'int'>, <class 'numpy.ndarray'>, <class 'list'>).`,
  );
}

/**
 * `BaseInputs`' `TypeError` for a switch that is not a boolean
 * (`classes_input.py:128` at v4.6.2).
 */
export function notBoolean(key: string): TypeError {
  return new TypeError(`${key} must be a boolean (True or False).`);
}

/**
 * The library's message for a quantity that is not a finite number where
 * upstream accepts it: a boolean, `null`, an array, NaN or ±Infinity
 * (`TypeError` or `RangeError` by ADR 0022's classes).
 */
export function notFiniteNumber(
  key: string,
  error: typeof TypeError | typeof RangeError,
): Error {
  return new error(`${key} must be a finite number.`);
}

/** The library's message for a model called with no inputs object. */
export function notInputsObject(name: string): TypeError {
  return new TypeError(`${name}() takes one inputs object.`);
}
