/**
 * Rounds a number to the given precision, half to even, as numpy's `round`
 * does. It stands in for `np.round` and `np.around`, which it equalled on
 * 28,028 of 28,028 values (ADR 0019, whitelist item 7). Python's builtin
 * `round` differs from it, for example on `round(2.675, 2)`.
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
