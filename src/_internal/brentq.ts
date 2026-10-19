/// <reference path="./brent-zero-generator.d.ts" />
import { zero } from "brent-zero-generator";

/**
 * The failure `brentq` throws when [a, b] does not bracket a root, a class of
 * its own so that a caller can catch it and nothing else, as upstream catches
 * the `ValueError` scipy's `brentq` raises for it.
 */
export class RootNotBracketedError extends Error {
  name = "RootNotBracketedError";
}

/**
 * Stands in for `scipy.optimize.brentq(f, a, b)` with scipy's default
 * tolerances (ADR 0014). The root comes from `brent-zero-generator` 1.1.1's
 * `zero`, Brent's Algol `zero()`, called with macheps `Number.EPSILON` and
 * t = 1e-12. It stops once |c - b| / 2 <= 2·eps·|b| + 1e-12
 * (zero_generator.js:36-39); scipy 1.18.1's brentq stops once
 * |xblk - xcur| / 2 < (2e-12 + 4·eps·|xcur|) / 2 (scipy/optimize/Zeros/brentq.c:82-84,
 * with the defaults xtol = 2e-12 and rtol = 4·eps). The two are different
 * codings of Brent's method, whose iterates can differ, so a root need not be
 * bit-identical to scipy's. Remaining differences: scipy raises `ValueError`
 * for a NaN at any evaluation (scipy/optimize/_zeros_py.py `_wrap_nan_raise`),
 * this checks only f(a) and f(b); scipy raises `RuntimeError` after 100
 * iterations (its default `maxiter`), `zero` has no iteration limit.
 *
 * Private: not exported from the package root.
 *
 * @param {(x: number) => number} f - the function whose root is sought
 * @param {number} a - one end of the bracketing interval
 * @param {number} b - the other end
 * @returns {number} a root of f in [a, b]
 * @throws {RootNotBracketedError} when f(a) and f(b) have the same sign, or
 *   either is NaN, where scipy raises `ValueError`
 */
export function brentq(f: (x: number) => number, a: number, b: number): number {
  const fa = f(a);
  const fb = f(b);
  const same_sign = (fa > 0 && fb > 0) || (fa < 0 && fb < 0);
  if (Number.isNaN(fa) || Number.isNaN(fb) || same_sign) {
    throw new RootNotBracketedError(
      `f(a) and f(b) must have different signs: f(${a}) = ${fa}, f(${b}) = ${fb}`,
    );
  }
  return zero(f, a, b, Number.EPSILON, 1e-12);
}
