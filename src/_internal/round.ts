/**
 * Rounds a number to the given precision, half to even, as numpy's `round`
 * does. It stands in for `np.round` and `np.around`, which it equalled on
 * 28,028 of 28,028 values (ADR 0019, whitelist item 7). Python's builtin
 * `round` differs from it, for example on `round(2.675, 2)`; `pythonRound`
 * below stands in for that one.
 *
 * @param number - the number to round
 * @param precision - the number of decimal places to round to
 * @returns the rounded result
 */
export function round(number: number, precision: number): number {
  const smudge = 10 ** precision;
  const scaled = number * smudge;
  let rounded = Math.round(scaled);
  // Math.round sends a tie up; numpy's rint sends it to the even neighbour.
  if (rounded - scaled === 0.5 && rounded % 2 !== 0) rounded -= 1;
  return rounded / smudge;
}

/**
 * Rounds a number to the given precision as Python's builtin `round(x, n)`
 * does (decision 83): to the multiple of 10**-n closest to the exact binary
 * value of `x`, an exact tie to the even one, so `pythonRound(2.675, 2)` is
 * 2.67 and `pythonRound(29.95, 1)` 29.9, where numpy's `round` gives 2.68 and
 * 30. CPython rounds with the correctly rounded `_Py_dg_dtoa`
 * (`Objects/floatobject.c`, `double_round`), and `Number.prototype.toFixed`
 * also rounds the exact value, but sends a tie to the larger magnitude
 * ("If there are two such n, pick the larger n", ECMA-262
 * `sec-number.prototype.tofixed`). A tie is an `x` with `x * 10**n` exactly
 * half an integer, which a double is only where `x * 2**(n + 1)` is an odd
 * integer, since 5**n is odd; there `x.toFixed(n + 1)` is exact and ends in
 * 5. A zero, ±Infinity, NaN and any magnitude from 1e21, where `toFixed`
 * writes the exponent form and every double is an integer, are returned as
 * they are, as Python returns them.
 *
 * @param number - the number to round
 * @param ndigits - the number of decimal places to round to, an integer from
 * 0 to 99
 * @returns the rounded result, its sign kept, as Python keeps it in
 * `round(-0.04, 1)`, -0.0
 */
export function pythonRound(number: number, ndigits: number): number {
  const magnitude = Math.abs(number);
  if (magnitude === 0 || !(magnitude < 1e21)) return number;
  let rounded = magnitude.toFixed(ndigits);
  if (
    Number.isInteger(magnitude * 2 ** (ndigits + 1)) &&
    !Number.isInteger(magnitude * 2 ** ndigits)
  ) {
    const down = magnitude
      .toFixed(ndigits + 1)
      .slice(0, -1)
      .replace(/\.$/, "");
    if (Number(down.at(-1)) % 2 === 0) rounded = down;
  }
  return Math.sign(number) * Number(rounded);
}
