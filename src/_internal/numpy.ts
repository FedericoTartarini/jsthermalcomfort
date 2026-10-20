// The numpy operations the JOS-3 functions use, on plain arrays, in the order
// numpy evaluates them (ADR 0009). Private: not exported from the package.
//
// A 1-D array is a `number[]`, a scalar a `number`. Upstream's functions take
// either and broadcast them; so do these, for a scalar or a length-1 array
// against a longer array, as numpy broadcasting does.

/** A scalar or a 1-D array, as upstream's `float | np.ndarray`. */
export type NumOrArray = number | readonly number[];

/**
 * `np.sum` of a 1-D float64 array: numpy's pairwise summation,
 * `DOUBLE_pairwise_sum` in `numpy/_core/src/umath/loops_utils.h.src:81-145`
 * at numpy v2.5.4. Below 8 values it adds them in order, starting from -0.0;
 * up to 128 it keeps 8 accumulators and adds the rest in order; above that
 * it splits the array in two at a multiple of 8. A left-to-right sum differs
 * from it on 63 % of random 17-element arrays, and on the 17 standard local
 * body surface areas it gives 1.8680000000000005 where numpy gives 1.868
 * (`sumorder.py` in the ticket 25 scratchpad). The reduction adds the
 * pairwise sum to add's identity, 0.0, so a sum of negative zeros is 0.0
 * (numpy 2.5.4 gives 0.0 for 1, 2, 3, 7, 8, 9, 16, 17 and 200 of them).
 *
 * @param {readonly number[]} a - the values
 * @returns {number} their sum
 */
export function np_sum(a: readonly number[]): number {
  return 0 + pairwise(a, 0, a.length);
}

function pairwise(a: readonly number[], start: number, n: number): number {
  if (n < 8) {
    let res = -0.0;
    for (let i = 0; i < n; i++) res += a[start + i];
    return res;
  }
  if (n <= 128) {
    const r = a.slice(start, start + 8);
    let i = 8;
    for (; i < n - (n % 8); i += 8) {
      for (let j = 0; j < 8; j++) r[j] += a[start + i + j];
    }
    let res = r[0] + r[1] + (r[2] + r[3]) + (r[4] + r[5] + (r[6] + r[7]));
    for (; i < n; i++) res += a[start + i];
    return res;
  }
  let n2 = Math.floor(n / 2);
  n2 -= n2 % 8;
  return pairwise(a, start, n2) + pairwise(a, start + n2, n - n2);
}

/**
 * `np.average(a, weights=weights)` for 1-D arrays
 * (`numpy/lib/_function_base_impl.py:421-443, :591-605` at numpy v2.5.4):
 * `np.multiply(a, wgt).sum() / wgt.sum()`, both sums pairwise. Shapes that
 * differ raise numpy's `TypeError`, a scalar `a` included.
 *
 * @param {NumOrArray} a - the values
 * @param {readonly number[]} weights - the weights
 * @returns {number} the weighted average
 */
export function np_average(a: NumOrArray, weights: readonly number[]): number {
  if (typeof a === "number" || a.length !== weights.length) {
    throw new TypeError(
      "Axis must be specified when shapes of a and weights differ.",
    );
  }
  const scl = np_sum(weights);
  if (scl === 0) {
    throw new RangeError("Weights sum to zero, can't be normalized");
  }
  return np_sum(a.map((x, i) => x * weights[i])) / scl;
}

function shape(x: NumOrArray): string {
  return typeof x === "number" ? "()" : `(${x.length},)`;
}

/**
 * The length of the array numpy broadcasts `xs` to, or -1 when every one is
 * a scalar. Lengths that differ, neither of them 1, raise numpy's
 * `ValueError` ("operands could not be broadcast together"), an `Error` here
 * (ADR 0012).
 */
function broadcast_length(xs: readonly NumOrArray[]): number {
  let n = -1;
  for (const x of xs) {
    if (typeof x === "number") continue;
    if (n === -1 || n === 1) n = x.length;
    else if (x.length !== n && x.length !== 1) {
      throw new Error(
        `operands could not be broadcast together with shapes ${xs.map(shape).join(" ")} `,
      );
    }
  }
  return n;
}

function at(x: NumOrArray, i: number): number {
  if (typeof x === "number") return x;
  return x.length === 1 ? x[0] : x[i];
}

/**
 * Applies `f` element by element over `xs`, broadcast as numpy broadcasts
 * them: a scalar when every input is a scalar, otherwise an array.
 *
 * @param {Function} f - the element-wise operation, written as upstream writes it
 * @param {...NumOrArray} xs - its operands
 * @returns {number | number[]} the result
 */
export function ew(
  f: (...v: number[]) => number,
  ...xs: NumOrArray[]
): number | number[] {
  const n = broadcast_length(xs);
  if (n === -1) return f(...(xs as number[]));
  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) out[i] = f(...xs.map((x) => at(x, i)));
  return out;
}

/**
 * `ew` where at least one operand is an array, so the result is one.
 *
 * @param {Function} f - the element-wise operation
 * @param {...NumOrArray} xs - its operands
 * @returns {number[]} the result
 */
export function ewa(
  f: (...v: number[]) => number,
  ...xs: NumOrArray[]
): number[] {
  const out = ew(f, ...xs);
  return typeof out === "number" ? [out] : out;
}

/**
 * Python's builtin `max(a, b)`: `b` only when `b > a`, so a NaN `b` keeps
 * `a` and a NaN `a` stays, where `Math.max` returns NaN for either.
 */
export function py_max(a: number, b: number): number {
  return b > a ? b : a;
}

/** Python's builtin `min(a, b)`: `b` only when `b < a`. */
export function py_min(a: number, b: number): number {
  return b < a ? b : a;
}

/** `np.ones(n) * value`. */
export function full(n: number, value: number): number[] {
  return new Array<number>(n).fill(value);
}

/** `np.zeros((n, n))`. */
export function zeros2d(n: number): number[][] {
  return Array.from({ length: n }, () => new Array<number>(n).fill(0));
}

/**
 * The name of the Python type the JavaScript value stands for, for the text
 * of the `TypeError` Python raises where a value of the wrong type meets an
 * operator: an integer number is an `int`, as the JavaScript literal `5`
 * reads; `null` and `undefined` are `None`.
 *
 * @param {unknown} x - the value
 * @returns {string} the Python type name
 */
export function py_type_name(x: unknown): string {
  if (x === null || x === undefined) return "NoneType";
  if (typeof x === "number") return Number.isInteger(x) ? "int" : "float";
  if (typeof x === "string") return "str";
  if (typeof x === "boolean") return "bool";
  if (Array.isArray(x)) return "list";
  return typeof x === "object" ? "dict" : typeof x;
}

/**
 * Throws Python's `TypeError` for an operand that is not a number, as
 * upstream raises when it computes with one (a `bool` is an `int` in
 * Python, so it passes): `unsupported operand type(s) for <op>: ...` for an
 * arithmetic operator, `'<op>' not supported between instances of ...` for
 * a comparison.
 *
 * @param {unknown} x - the operand
 * @param {string} op - the operator upstream applies first
 * @param {"arithmetic" | "comparison"} kind - which of Python's messages
 * @param {string} other - the Python type of the other operand
 */
export function require_numeric(
  x: unknown,
  op: string,
  kind: "arithmetic" | "comparison",
  other = "float",
): void {
  if (typeof x === "number" || typeof x === "boolean") return;
  throw new TypeError(
    kind === "arithmetic"
      ? `unsupported operand type(s) for ${op}: '${py_type_name(x)}' and '${other}'`
      : `'${op}' not supported between instances of '${other}' and '${py_type_name(x)}'`,
  );
}

/**
 * Python's `/` on two scalars: a ZeroDivisionError when the divisor is 0, a
 * RangeError here (ADR 0012), with Python's message, "division by zero" for
 * two integers and "float division by zero" otherwise. numpy's division of
 * an array returns ±inf or NaN instead, which `ew` keeps.
 *
 * @param {number} a - the dividend
 * @param {number} b - the divisor
 * @returns {number} a / b
 */
export function py_div(a: number, b: number): number {
  if (b === 0) {
    throw new RangeError(
      Number.isInteger(a) && Number.isInteger(b)
        ? "division by zero"
        : "float division by zero",
    );
  }
  return a / b;
}

/**
 * Python's `KeyError` (and `IndexError`, its fellow `LookupError`): a key or
 * an index upstream looks up and does not find. Which JavaScript class it
 * maps to is not decided (ADR 0012 maps TypeError, ValueError,
 * ZeroDivisionError and AttributeError only); it is the open question in
 * ticket 25's Comments. Until it is decided this throws a plain `Error`,
 * the class every other one extends, with Python's `str()` of the
 * exception, the key in quotes.
 *
 * @param {string} key - the key that was not found
 * @returns {Error} the error to throw
 */
export function key_error(key: string): Error {
  return new Error(`'${key}'`);
}
