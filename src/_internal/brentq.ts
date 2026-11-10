// A line-by-line port of scipy 1.18.1's `scipy.optimize.brentq` (ADR 0026).
//
// Copyright (c) 2001-2002 Enthought, Inc. 2003, SciPy Developers.
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
//
// 1. Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
//
// 2. Redistributions in binary form must reproduce the above
//    copyright notice, this list of conditions and the following
//    disclaimer in the documentation and/or other materials provided
//    with the distribution.
//
// 3. Neither the name of the copyright holder nor the names of its
//    contributors may be used to endorse or promote products derived
//    from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
// OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
// LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

import { notOfType } from "./errors.ts";

const _iter = 100;
const _xtol = 2e-12;
const _rtol = 4 * Number.EPSILON;

/**
 * Find a root of a function in a bracketing interval using Brent's method.
 *
 * The port of scipy's Python wrapper (`scipy/optimize/_zeros_py.py`, `brentq`
 * and `_wrap_nan_raise`), its C caller (`scipy/optimize/_zerosmodule.c`,
 * `call_solver`) and the solver (`scipy/optimize/Zeros/brentq.c`, written by
 * Charles Harris). It takes the arguments upstream's callers pass: `args`,
 * `full_output` and `disp` are left out, so a call that does not converge
 * throws, as `disp=True` raises. scipy's `ValueError`s are `RangeError`s and
 * its `RuntimeError` an `Error` (ADR 0022).
 *
 * @param f - The function, continuous, with `f(a)` and `f(b)` of opposite
 * signs.
 * @param a - One end of the bracketing interval `[a, b]`.
 * @param b - The other end of the bracketing interval `[a, b]`.
 * @param xtol - The absolute tolerance, positive.
 * @param rtol - The relative tolerance, at least its default,
 * `4 * Number.EPSILON`.
 * @param maxiter - The most iterations, at least 0.
 * @returns The root of `f` between `a` and `b`.
 * @throws `TypeError` for a `maxiter` that is not an integer; `RangeError` for
 * a tolerance or `maxiter` out of range, for `f(a)`
 * and `f(b)` of the same sign, and for a NaN value of `f`; `Error` when
 * `maxiter` iterations do not converge.
 */
export function brentq(
  f: (x: number) => number,
  a: number,
  b: number,
  xtol = _xtol,
  rtol = _rtol,
  maxiter = _iter,
): number {
  // _zeros_py.py brentq, whose operator.index raises TypeError for a non-integer
  if (!Number.isInteger(maxiter)) throw notOfType("maxiter", "an integer");
  if (xtol <= 0) {
    throw new RangeError(`xtol too small (${xtol} <= 0)`);
  }
  if (rtol < _rtol) {
    throw new RangeError(`rtol too small (${rtol} < 8.88178e-16)`);
  }
  f = _wrap_nan_raise(f);

  // _zerosmodule.c call_solver, whose `xtol < 0` check the one above makes
  // unreachable
  if (maxiter < 0) {
    throw new RangeError("maxiter must be >= 0");
  }
  const [zero, error_num, iterations] = _brentq(f, a, b, xtol, rtol, maxiter);
  if (error_num === SIGNERR) {
    throw new RangeError("f(a) and f(b) must have different signs");
  }
  if (error_num === CONVERR) {
    throw new Error(`Failed to converge after ${iterations} iterations.`);
  }
  return zero;
}

function _wrap_nan_raise(f: (x: number) => number): (x: number) => number {
  function f_raise(x: number): number {
    const fx = f(x);
    if (Number.isNaN(fx)) {
      const msg = `The function value at x=${x} is NaN; solver cannot continue.`;
      throw new RangeError(msg);
    }
    return fx;
  }

  return f_raise;
}

const CONVERGED = 0;
const SIGNERR = -1;
const CONVERR = -2;

/*
  At the top of the loop the situation is the following:

    1. the root is bracketed between xa and xb
    2. xa is the most recent estimate
    3. xp is the previous estimate
    4. |fp| < |fb|

  The order of xa and xp doesn't matter, but assume xp < xb. Then xa lies to
  the right of xp and the assumption is that xa is increasing towards the root.
  In this situation we will attempt quadratic extrapolation as long as the
  condition

  *  |fa| < |fp| < |fb|

  is satisfied. That is, the function value is decreasing as we go along.
  Note the 4 above implies that the right inequlity already holds.

  The first check is that xa is still to the left of the root. If not, xb is
  replaced by xp and the interval reverses, with xb < xa. In this situation
  we will try linear interpolation. That this has happened is signaled by the
  equality xb == xp;

  The second check is that |fa| < |fb|. If this is not the case, we swap
  xa and xb and resort to bisection.

*/
function _brentq(
  f: (x: number) => number,
  xa: number,
  xb: number,
  xtol: number,
  rtol: number,
  iter: number,
): [zero: number, error_num: number, iterations: number] {
  let xpre = xa,
    xcur = xb;
  let xblk = 0,
    fpre,
    fcur,
    fblk = 0,
    spre = 0,
    scur = 0,
    sbis;
  /* the tolerance is 2*delta */
  let delta;
  let stry, dpre, dblk;
  let i;
  let iterations = 0;

  fpre = f(xpre);
  fcur = f(xcur);
  if (fpre === 0) {
    return [xpre, CONVERGED, iterations];
  }
  if (fcur === 0) {
    return [xcur, CONVERGED, iterations];
  }
  if (signbit(fpre) === signbit(fcur)) {
    return [0, SIGNERR, iterations];
  }
  for (i = 0; i < iter; i++) {
    iterations++;
    if (fpre !== 0 && fcur !== 0 && signbit(fpre) !== signbit(fcur)) {
      xblk = xpre;
      fblk = fpre;
      spre = scur = xcur - xpre;
    }
    if (Math.abs(fblk) < Math.abs(fcur)) {
      xpre = xcur;
      xcur = xblk;
      xblk = xpre;

      fpre = fcur;
      fcur = fblk;
      fblk = fpre;
    }

    delta = (xtol + rtol * Math.abs(xcur)) / 2;
    sbis = (xblk - xcur) / 2;
    if (fcur === 0 || Math.abs(sbis) < delta) {
      return [xcur, CONVERGED, iterations];
    }

    if (Math.abs(spre) > delta && Math.abs(fcur) < Math.abs(fpre)) {
      if (xpre === xblk) {
        /* interpolate */
        stry = (-fcur * (xcur - xpre)) / (fcur - fpre);
      } else {
        /* extrapolate */
        dpre = (fpre - fcur) / (xpre - xcur);
        dblk = (fblk - fcur) / (xblk - xcur);
        stry =
          (-fcur * (fblk * dblk - fpre * dpre)) / (dblk * dpre * (fblk - fpre));
      }
      if (
        2 * Math.abs(stry) <
        min(Math.abs(spre), 3 * Math.abs(sbis) - delta)
      ) {
        /* good short step */
        spre = scur;
        scur = stry;
      } else {
        /* bisect */
        spre = sbis;
        scur = sbis;
      }
    } else {
      /* bisect */
      spre = sbis;
      scur = sbis;
    }

    xpre = xcur;
    fpre = fcur;
    if (Math.abs(scur) > delta) {
      xcur += scur;
    } else {
      xcur += sbis > 0 ? delta : -delta;
    }

    fcur = f(xcur);
  }
  return [xcur, CONVERR, iterations];
}

// C's `MIN(a, b)` macro, `((a) < (b) ? (a) : (b))`, which returns `b` where
// `Math.min` returns NaN.
function min(a: number, b: number): number {
  return a < b ? a : b;
}

// C's `signbit`, true for -0 too; `f_raise` has rejected NaN.
function signbit(x: number): boolean {
  return x < 0 || Object.is(x, -0);
}
