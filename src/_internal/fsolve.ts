// A line-by-line port of scipy 1.18.1's `scipy.optimize.fsolve` and the
// MINPACK routines it calls (ADR 0026).
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
//
// MINPACK (scipy/optimize/src/minpack.c, a C translation of MINPACK's
// Fortran by Burton S. Garbow, Kenneth E. Hillstrom and Jorge J. More,
// Argonne National Laboratory, March 1980):
//
// Minpack Copyright Notice (1999) University of Chicago.  All rights reserved
//
// Redistribution and use in source and binary forms, with or
// without modification, are permitted provided that the
// following conditions are met:
//
// 1. Redistributions of source code must retain the above
// copyright notice, this list of conditions and the following
// disclaimer.
//
// 2. Redistributions in binary form must reproduce the above
// copyright notice, this list of conditions and the following
// disclaimer in the documentation and/or other materials
// provided with the distribution.
//
// 3. The end-user documentation included with the
// redistribution, if any, must include the following
// acknowledgment:
//
//    "This product includes software developed by the
//    University of Chicago, as Operator of Argonne National
//    Laboratory.
//
// Alternately, this acknowledgment may appear in the software
// itself, if and wherever such third-party acknowledgments
// normally appear.
//
// 4. WARRANTY DISCLAIMER. THE SOFTWARE IS SUPPLIED "AS IS"
// WITHOUT WARRANTY OF ANY KIND. THE COPYRIGHT HOLDER, THE
// UNITED STATES, THE UNITED STATES DEPARTMENT OF ENERGY, AND
// THEIR EMPLOYEES: (1) DISCLAIM ANY WARRANTIES, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO ANY IMPLIED WARRANTIES
// OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE
// OR NON-INFRINGEMENT, (2) DO NOT ASSUME ANY LEGAL LIABILITY
// OR RESPONSIBILITY FOR THE ACCURACY, COMPLETENESS, OR
// USEFULNESS OF THE SOFTWARE, (3) DO NOT REPRESENT THAT USE OF
// THE SOFTWARE WOULD NOT INFRINGE PRIVATELY OWNED RIGHTS, (4)
// DO NOT WARRANT THAT THE SOFTWARE WILL FUNCTION
// UNINTERRUPTED, THAT IT IS ERROR-FREE OR THAT ANY ERRORS WILL
// BE CORRECTED.
//
// 5. LIMITATION OF LIABILITY. IN NO EVENT WILL THE COPYRIGHT
// HOLDER, THE UNITED STATES, THE UNITED STATES DEPARTMENT OF
// ENERGY, OR THEIR EMPLOYEES: BE LIABLE FOR ANY INDIRECT,
// INCIDENTAL, CONSEQUENTIAL, SPECIAL OR PUNITIVE DAMAGES OF
// ANY KIND OR NATURE, INCLUDING BUT NOT LIMITED TO LOSS OF
// PROFITS OR LOSS OF DATA, FOR ANY REASON WHATSOEVER, WHETHER
// SUCH LIABILITY IS ASSERTED ON THE BASIS OF CONTRACT, TORT
// (INCLUDING NEGLIGENCE OR STRICT LIABILITY), OR OTHERWISE,
// EVEN IF ANY OF SAID PARTIES HAS BEEN WARNED OF THE
// POSSIBILITY OF SUCH LOSS OR DAMAGES.

import type { ModelWarning } from "./modelInfo.ts";

const _xtol = 1.49012e-8;
const _factor = 100;
const dpmpar = [
  2.220446049250313e-16 /* np.finfo(np.float64).eps  */,
  2.2250738585072014e-308 /* np.finfo(np.float64).tiny */,
  1.7976931348623157e308 /* np.finfo(np.float64).max  */,
] as const;

/**
 * Find the roots of a function.
 *
 * Return the roots of the (non-linear) equations defined by
 * `func(x) = 0` given a starting estimate.
 *
 * The port of scipy's Python wrapper (`scipy/optimize/_minpack_py.py`,
 * `fsolve` and `_root_hybr`), its C caller
 * (`scipy/optimize/_minpackmodule.c`, `minpack_hybrd`) and MINPACK's `HYBRD`
 * with the routines it calls (`scipy/optimize/src/minpack.c`). It takes the
 * arguments upstream's callers pass, `func` and `x0`, so the rest are scipy's
 * defaults: no `fprime`, so `HYBRD`'s forward-difference Jacobian; no `band`,
 * so `ml` and `mu` are `n - 1` and `fdjac1` never takes its banded path; no
 * `diag`, so `mode` is 1; `nprint` 0; and `full_output` false, so a call that
 * stops with status 2 to 5 returns its last iterate and warns, which the port
 * appends to `warnings` as a `notice` row with scipy's message (decision
 * 281). The two evaluations of `func` at `x0` that scipy makes before
 * `HYBRD` (`_check_func`'s shape check and `minpack_hybrd`'s set-up of
 * `fvec`) are left out, since `HYBRD` evaluates `func` at `x0` first; an
 * error `func` throws propagates, as a Python exception does.
 *
 * @param func - A function that takes at least one (possibly vector)
 * argument, and returns a value of the same length.
 * @param x0 - The starting estimate for the roots of `func(x) = 0`.
 * @param warnings - The rows a call appends its notice to.
 * @returns The solution (or the result of the last iteration for an
 * unsuccessful call).
 * @throws `TypeError` for status 0 ("Improper input parameters were
 * entered."), an empty `x0`, as scipy raises `TypeError`.
 */
export function fsolve(
  func: (x: readonly number[]) => readonly number[],
  x0: readonly number[],
  warnings: ModelWarning[],
): number[] {
  const xtol = _xtol;
  const factor = _factor;
  // _root_hybr
  const epsfcn = Number.EPSILON;
  const x = [...x0];
  const n = x.length;
  const maxfev = 200 * (n + 1);

  // minpack_hybrd: ml and mu are n - 1 for a band of None, and mode is 1 for
  // a diag of None
  const ml = n - 1;
  const mu = n - 1;
  const status = hybrd(func, n, x, xtol, maxfev, ml, mu, epsfcn, factor);

  const errors: Readonly<Record<number, string>> = {
    0: "Improper input parameters were entered.",
    1: "The solution converged.",
    2: "The number of calls to function has " + `reached maxfev = ${maxfev}.`,
    3:
      `xtol=${xtol.toFixed(6)} is too small, no further improvement ` +
      "in the approximate\n solution is possible.",
    4:
      "The iteration is not making good progress, as measured " +
      "by the \n improvement from the last five " +
      "Jacobian evaluations.",
    5:
      "The iteration is not making good progress, " +
      "as measured by the \n improvement from the last " +
      "ten iterations.",
  };
  const msg = errors[status] ?? "An error occurred.";

  // fsolve
  if (status === 0) {
    throw new TypeError(msg);
  } else if (status === 1) {
    // pass
  } else if ([2, 3, 4, 5].includes(status)) {
    warnings.push(Object.freeze({ kind: "notice", message: msg }));
  } else {
    throw new TypeError(msg);
  }
  return x;
}

/** C's `fmax`, which returns the other argument where one is NaN. */
function fmax(x: number, y: number): number {
  if (Number.isNaN(x)) return y;
  if (Number.isNaN(y)) return x;
  return x > y ? x : y;
}

/** C's `fmin`, which returns the other argument where one is NaN. */
function fmin(x: number, y: number): number {
  if (Number.isNaN(x)) return y;
  if (Number.isNaN(y)) return x;
  return x < y ? x : y;
}

/**
 * the purpose of hybrd is to find a zero of a system of
 * n nonlinear functions in n variables by a modification
 * of the powell hybrid method. the user must provide a
 * subroutine which calculates the functions. the jacobian is
 * then calculated by a forward-difference approximation.
 *
 * scipy's `HYBRD`. It returns `info`, solves in place in `x`, and takes
 * `HYBRD`'s arguments other than those `fsolve` fixes: `mode` 1, `nprint` 0,
 * and the work arrays, which it allocates. `sing`, which `HYBRD` and `r1updt`
 * set and nothing reads, is left out of both.
 */
function hybrd(
  fcn: (x: readonly number[]) => readonly number[],
  n: number,
  x: number[],
  xtol: number,
  maxfev: number,
  ml: number,
  mu: number,
  epsfcn: number,
  factor: number,
): number {
  let iter, jeval, l, ncfail, ncsuc, nslow1, nslow2;
  let actred,
    delta = 0,
    fnorm,
    fnorm1,
    pnorm,
    prered,
    ratio,
    ssum,
    temp,
    xnorm = 0;
  const epsmch = dpmpar[0];
  const ldfjac = n;
  const fvec = new Array<number>(n).fill(0);
  const diag = new Array<number>(n).fill(0);
  const fjac = new Array<number>(n * n).fill(0);
  const r = new Array<number>((n * (n + 1)) / 2).fill(0);
  const qtf = new Array<number>(n).fill(0);
  const wa1 = new Array<number>(n).fill(0);
  const wa2 = new Array<number>(n).fill(0);
  const wa3 = new Array<number>(n).fill(0);
  const wa4 = new Array<number>(n).fill(0);

  let info = 0;
  let nfev = 0;

  // Check the input parameters for errors
  if (n <= 0) return info;

  // Evaluate the function at the starting point and calculate its norm.
  copy(fcn(x), fvec);
  nfev = 1;
  fnorm = enorm(n, fvec);

  // Determine the number of calls to fcn needed to compute the jacobian.
  const msum = ml + mu + 1 > n ? n : ml + mu + 1;

  // Initialize iteration counter and monitors.
  iter = 1;
  ncsuc = 0;
  ncfail = 0;
  nslow1 = 0;
  nslow2 = 0;

  // Beginning of the outer loop
  for (;;) {
    jeval = true;

    // Calculate the jacobian.
    fdjac1(fcn, n, x, fvec, fjac, ldfjac, epsfcn, wa1);
    nfev += msum;

    // Compute the qr factorization of the jacobian.
    qrfac(n, n, fjac, ldfjac, wa1, wa2, wa3);

    // On the first iteration and if mode is 1, scale according to the norms
    // of the columns of the initial jacobian.
    if (iter === 1) {
      for (let j = 0; j < n; j++) {
        diag[j] = wa2[j] ?? NaN;
        if (wa2[j] === 0.0) {
          diag[j] = 1.0;
        }
      }

      // On the first iteration, calculate the norm of the scaled x and
      // initialize the step bound delta.
      for (let j = 0; j < n; j++) {
        wa3[j] = (diag[j] ?? NaN) * (x[j] ?? NaN);
      }

      xnorm = enorm(n, wa3);
      delta = factor * xnorm;
      delta = factor * xnorm === 0.0 ? factor : factor * xnorm;
    }

    // Form (q.T)*fvec and store in qtf
    for (let i = 0; i < n; i++) {
      qtf[i] = fvec[i] ?? NaN;
    }

    for (let j = 0; j < n; j++) {
      if (fjac[j + ldfjac * j] !== 0.0) {
        ssum = 0.0;
        for (let i = j; i < n; i++) {
          ssum += (fjac[i + ldfjac * j] ?? NaN) * (qtf[i] ?? NaN);
        }
        temp = -ssum / (fjac[j + ldfjac * j] ?? NaN);
        for (let i = j; i < n; i++) {
          qtf[i] = (qtf[i] ?? NaN) + (fjac[i + ldfjac * j] ?? NaN) * temp;
        }
      }
    }

    // Copy the triangular factor of the qr factorization into r.
    for (let j = 0; j < n; j++) {
      l = j;
      if (j > 0) {
        for (let i = 0; i < j; i++) {
          r[l] = fjac[i + ldfjac * j] ?? NaN;
          l += n - i - 1;
        }
      }
      r[l] = wa1[j] ?? NaN;
    }

    // Accumulate the orthogonal factor in fjac.
    qform(n, n, fjac, ldfjac, wa1);

    // Rescale if necessary
    for (let j = 0; j < n; j++) {
      diag[j] = fmax(diag[j] ?? NaN, wa2[j] ?? NaN);
    }

    // Beginning of the inner loop.
    for (;;) {
      // Determine the direction p.
      dogleg(n, r, diag, qtf, delta, wa1, wa2, wa3);

      // Store the direction of p.
      for (let j = 0; j < n; j++) {
        wa1[j] = -(wa1[j] ?? NaN);
        wa2[j] = (x[j] ?? NaN) + (wa1[j] ?? NaN);
        wa3[j] = (diag[j] ?? NaN) * (wa1[j] ?? NaN);
      }

      pnorm = enorm(n, wa3);

      // On the first iteration, adjust the initial step bound
      if (iter === 1) {
        delta = fmin(delta, pnorm);
      }

      // Evaluate the function at x + p and calculate its norm.
      copy(fcn(wa2), wa4);
      nfev += 1;
      fnorm1 = enorm(n, wa4);

      // Compute the scaled actual reduction
      actred = fnorm1 < fnorm ? 1.0 - square(fnorm1 / fnorm) : -1.0;

      // Compute the scaled predicted reduction.
      l = 0;
      for (let i = 0; i < n; i++) {
        ssum = 0.0;
        for (let j = i; j < n; j++) {
          ssum += (r[l] ?? NaN) * (wa1[j] ?? NaN);
          l++;
        }
        wa3[i] = (qtf[i] ?? NaN) + ssum;
      }

      temp = enorm(n, wa3);
      prered = temp < fnorm ? 1.0 - square(temp / fnorm) : 0.0;

      // Compute the ratio of the actual to the predicted reduction.
      ratio = prered > 0.0 ? actred / prered : 0.0;

      // Update the step bound
      if (ratio < 0.1) {
        ncsuc = 0;
        ncfail++;
        delta = 0.5 * delta;
      } else {
        ncfail = 0;
        ncsuc++;
        if (ratio >= 0.5 || ncsuc > 1) {
          delta = fmax(delta, pnorm / 0.5);
        }
        if (Math.abs(ratio - 1.0) <= 0.1) {
          delta = pnorm / 0.5;
        }
      }

      // Test for successful iteration.
      if (ratio >= 0.0001) {
        // Successful iteration. Update x, fvec, and their norms.
        for (let j = 0; j < n; j++) {
          x[j] = wa2[j] ?? NaN;
          wa2[j] = (diag[j] ?? NaN) * (x[j] ?? NaN);
          fvec[j] = wa4[j] ?? NaN;
        }
        xnorm = enorm(n, wa2);
        fnorm = fnorm1;
        iter++;
      }

      // Determine the progress of the iteration.
      nslow1++;
      if (actred >= 0.001) {
        nslow1 = 0;
      }
      if (jeval) {
        nslow2++;
      }
      if (actred >= 0.1) {
        nslow2 = 0;
      }

      // Test for convergence.
      if (delta <= xtol * xnorm || fnorm === 0.0) {
        info = 1;
      }
      if (info !== 0) return info;

      // Tests for termination and stringent tolerances
      if (nfev >= maxfev) {
        info = 2;
      }
      if (0.1 * fmax(0.1 * delta, pnorm) <= epsmch * xnorm) {
        info = 3;
      }
      if (nslow2 === 5) {
        info = 4;
      }
      if (nslow1 === 10) {
        info = 5;
      }
      if (info !== 0) return info;

      // Criterion for recalculating jacobian approximation by forward
      // differences.
      if (ncfail === 2) {
        break;
      }

      // Calculate the rank one modification to the jacobian and update
      // qtf if necessary.
      for (let j = 0; j < n; j++) {
        ssum = 0.0;
        for (let i = 0; i < n; i++) {
          ssum += (fjac[i + ldfjac * j] ?? NaN) * (wa4[i] ?? NaN);
        }
        wa2[j] = (ssum - (wa3[j] ?? NaN)) / pnorm;
        wa1[j] =
          (diag[j] ?? NaN) * (((diag[j] ?? NaN) * (wa1[j] ?? NaN)) / pnorm);
        if (ratio >= 0.0001) {
          qtf[j] = ssum;
        }
      }

      // Compute the qr factorization of the updated jacobian.
      r1updt(n, n, r, wa1, wa2, wa3);
      r1mpyq(n, n, fjac, ldfjac, wa2, wa3);
      r1mpyq(1, n, qtf, 1, wa2, wa3);

      // End of the inner loop.
      jeval = false;
    }
    // End of the outer loop.
  }
}

/** `memcpy` of the values `fcn` returns into `fvec`. */
function copy(values: readonly number[], fvec: number[]): void {
  for (let i = 0; i < fvec.length; i++) fvec[i] = values[i] ?? NaN;
}

/** C's `pow(x, 2.0)`, which GCC compiles to `x * x`. */
function square(x: number): number {
  return x * x;
}

/**
 * given an m by n matrix a, an n by n nonsingular diagonal
 * matrix d, an m-vector b, and a positive number delta, the
 * problem is to determine the convex combination x of the
 * gauss-newton and scaled gradient directions that minimizes
 * (a*x - b) in the least squares sense, subject to the
 * restriction that the euclidean norm of d*x be at most delta.
 */
function dogleg(
  n: number,
  r: readonly number[],
  diag: readonly number[],
  qtb: readonly number[],
  delta: number,
  x: number[],
  wa1: number[],
  wa2: number[],
): void {
  let jj, l;
  let alpha, bnorm, sgnorm, ssum, temp;
  const epsmch = dpmpar[0];

  // First, calculate the Gauss-Newton direction
  jj = (n * (n + 1)) / 2;
  for (let k = 0; k < n; k++) {
    const j = n - k - 1;
    jj -= k + 1;
    l = jj + 1;
    ssum = 0.0;
    if (n - 1 > j) {
      for (let i = j + 1; i < n; i++) {
        ssum += (r[l] ?? NaN) * (x[i] ?? NaN);
        l++;
      }
    }
    temp = r[jj] ?? NaN;
    if (temp === 0.0) {
      l = j;
      for (let i = 0; i <= j; i++) {
        temp = fmax(temp, Math.abs(r[l] ?? NaN));
        l += n - i - 1;
      }
      temp = epsmch * temp;
      if (temp === 0.0) {
        temp = epsmch;
      }
    }
    x[j] = ((qtb[j] ?? NaN) - ssum) / temp;
  }

  // Test whether the gauss-newton direction is acceptable.
  for (let j = 0; j < n; j++) {
    wa1[j] = 0.0;
    wa2[j] = (diag[j] ?? NaN) * (x[j] ?? NaN);
  }
  const qnorm = enorm(n, wa2);
  if (qnorm <= delta) {
    return;
  }

  // The Gauss-Newton direction is not acceptable.
  // Next, calculate the scaled gradient direction.
  l = 0;
  for (let j = 0; j < n; j++) {
    temp = qtb[j] ?? NaN;
    for (let i = j; i < n; i++) {
      wa1[i] = (wa1[i] ?? NaN) + (r[l] ?? NaN) * temp;
      l++;
    }
    wa1[j] = (wa1[j] ?? NaN) / (diag[j] ?? NaN);
  }

  const gnorm = enorm(n, wa1);
  sgnorm = 0.0;
  alpha = delta / qnorm;
  if (gnorm !== 0.0) {
    // Calculate the point along the scaled gradient
    // at which the quadratic is minimized.
    for (let j = 0; j < n; j++) {
      wa1[j] = (wa1[j] ?? NaN) / gnorm;
      wa1[j] = (wa1[j] ?? NaN) / (diag[j] ?? NaN);
    }
    l = 0;
    for (let j = 0; j < n; j++) {
      ssum = 0.0;
      for (let i = j; i < n; i++) {
        ssum += (r[l] ?? NaN) * (wa1[i] ?? NaN);
        l++;
      }
      wa2[j] = ssum;
    }
    temp = enorm(n, wa2);
    sgnorm = gnorm / temp / temp;

    // Test whether the scaled gradient direction is acceptable.
    alpha = 0.0;
    if (sgnorm < delta) {
      // The scaled gradient direction is not acceptable.
      // Finally, calculate the point along the dogleg
      // at which the quadratic is minimized.
      bnorm = enorm(n, qtb);
      temp = (bnorm / gnorm) * (bnorm / qnorm) * (sgnorm / delta);
      temp =
        temp -
        (delta / qnorm) * square(sgnorm / delta) +
        Math.sqrt(
          square(temp - delta / qnorm) +
            (1.0 - square(delta / qnorm)) * (1.0 - square(sgnorm / delta)),
        );
      alpha = ((delta / qnorm) * (1.0 - square(sgnorm / delta))) / temp;
    }
  }

  // Form appropriate convex combination of the Gauss-Newton direction
  // and the scaled gradient direction.
  temp = (1.0 - alpha) * fmin(sgnorm, delta);
  for (let j = 0; j < n; j++) {
    x[j] = temp * (wa1[j] ?? NaN) + alpha * (x[j] ?? NaN);
  }
}

/**
 * given an n-vector x, this function calculates the
 * euclidean norm of x.
 *
 * the euclidean norm is computed by accumulating the sum of
 * squares in three different sums. the sums of squares for the
 * small and large components are scaled so that no overflows
 * occur. non-destructive underflows are permitted. underflows
 * and overflows do not occur in the computation of the unscaled
 * sum of squares for the intermediate components.
 * the definitions of small, intermediate and large components
 * depend on two constants, rdwarf and rgiant. the main
 * restrictions on these constants are that rdwarf**2 not
 * underflow and rgiant**2 not overflow. the constants
 * given here are suitable for every known computer.
 *
 * `start` stands in for C's pointer into a column, `&a[j*lda]`.
 */
function enorm(n: number, x: readonly number[], start = 0): number {
  let s1, s2, s3, xabs, x1max, x3max;
  const rgiant = 2 ** 63.5;
  const rdwarf = 0.5 / rgiant;

  s1 = 0.0;
  s2 = 0.0;
  s3 = 0.0;
  x1max = 0.0;
  x3max = 0.0;
  const agiant = rgiant / n;

  for (let i = 0; i < n; i++) {
    xabs = Math.abs(x[start + i] ?? NaN);
    if (xabs <= rdwarf || xabs >= agiant) {
      if (xabs > rdwarf) {
        // sum for large components
        if (xabs > x1max) {
          s1 = 1.0 + s1 * square(x1max / xabs);
          x1max = xabs;
        } else {
          s1 += square(xabs / x1max);
        }
      } else {
        // sum for small components
        if (xabs > x3max) {
          s3 = 1.0 + s3 * square(x3max / xabs);
          x3max = xabs;
        } else {
          if (xabs !== 0.0) {
            s3 += square(xabs / x3max);
          }
        }
      }
    } else {
      // sum for intermediate components
      s2 += xabs * xabs;
    }
  }

  // calculation of norm.
  if (s1 !== 0.0) {
    return x1max * Math.sqrt(s1 + s2 / x1max / x1max);
  }
  if (s2 !== 0.0) {
    if (s2 >= x3max) {
      return Math.sqrt(s2 * (1.0 + (x3max / s2) * (x3max * s3)));
    } else {
      return Math.sqrt(x3max * (s2 / x3max + x3max * s3));
    }
  }
  return x3max * Math.sqrt(s3);
}

/**
 * this subroutine computes a forward-difference approximation
 * to the n by n jacobian matrix associated with a specified
 * problem of n functions in n variables. if the jacobian has
 * a banded form, then function evaluations are saved by only
 * approximating the nonzero terms.
 *
 * `fsolve` passes no band, so only the dense path is ported.
 */
function fdjac1(
  fcn: (x: readonly number[]) => readonly number[],
  n: number,
  x: number[],
  fvec: readonly number[],
  fjac: number[],
  ldfjac: number,
  epsfcn: number,
  wa1: number[],
): void {
  let h, temp;
  const epsmch = dpmpar[0];
  const eps = Math.sqrt(fmax(epsfcn, epsmch));

  // Computation of dense approximate jacobian.
  for (let j = 0; j < n; j++) {
    temp = x[j] ?? NaN;
    h = eps * Math.abs(temp);
    if (h === 0.0) {
      h = eps;
    }
    x[j] = temp + h;
    copy(fcn(x), wa1);
    x[j] = temp;
    for (let i = 0; i < n; i++) {
      fjac[i + ldfjac * j] = ((wa1[i] ?? NaN) - (fvec[i] ?? NaN)) / h;
    }
  }
}

/**
 * this subroutine proceeds from the computed qr factorization of
 * an m by n matrix a to accumulate the m by m orthogonal matrix
 * q from its factored form.
 *
 * `HYBRD` calls it with `m` equal to `n`, so the branch for `m > n` is left
 * out.
 */
function qform(
  m: number,
  n: number,
  q: number[],
  ldq: number,
  wa: number[],
): void {
  let k, ssum, temp;
  const minmn = m > n ? n : m;

  // Zero out upper triangle of q in the first min(m,n) columns.
  if (minmn > 1) {
    for (let j = 1; j < minmn; j++) {
      for (let i = 0; i < j; i++) {
        q[i + j * ldq] = 0.0;
      }
    }
  }

  // Accumulate q from its factored form.
  for (let l = 0; l < minmn; l++) {
    k = minmn - l - 1;
    for (let i = k; i < m; i++) {
      wa[i] = q[i + ldq * k] ?? NaN;
      q[i + ldq * k] = 0.0;
    }
    q[k + ldq * k] = 1.0;
    if (wa[k] !== 0.0) {
      for (let j = k; j < m; j++) {
        ssum = 0.0;
        for (let i = k; i < m; i++) {
          ssum += (q[i + ldq * j] ?? NaN) * (wa[i] ?? NaN);
        }
        temp = ssum / (wa[k] ?? NaN);
        for (let i = k; i < m; i++) {
          q[i + ldq * j] = (q[i + ldq * j] ?? NaN) - temp * (wa[i] ?? NaN);
        }
      }
    }
  }
}

/**
 * this subroutine uses householder transformations with column
 * pivoting (optional) to compute a qr factorization of the
 * m by n matrix a.
 *
 * `HYBRD` calls it with `pivot` 0, so the pivoting is left out, and `ipvt`
 * with it.
 */
function qrfac(
  m: number,
  n: number,
  a: number[],
  lda: number,
  rdiag: number[],
  acnorm: number[],
  wa: number[],
): void {
  let ajnorm, ssum, temp;

  // Compute the initial column norms and initialize several arrays
  for (let j = 0; j < n; j++) {
    acnorm[j] = enorm(m, a, j * lda);
    rdiag[j] = acnorm[j] ?? NaN;
    wa[j] = rdiag[j] ?? NaN;
  }

  // Reduce a to r with householder transformations.
  const minmn = m > n ? n : m;
  for (let j = 0; j < minmn; j++) {
    // Compute Householder transformation to reduce the j-th column
    // of "a" to a multiple of the j-th unit vector.
    ajnorm = enorm(m - j, a, lda * j + j);
    if (ajnorm === 0.0) {
      rdiag[j] = -ajnorm;
      continue;
    }
    if ((a[lda * j + j] ?? NaN) < 0.0) {
      ajnorm = -ajnorm;
    }
    // Rescale column j.
    for (let i = j; i < m; i++) {
      a[i + lda * j] = (a[i + lda * j] ?? NaN) / ajnorm;
    }
    a[j + lda * j] = (a[j + lda * j] ?? NaN) + 1.0;

    // Apply the transformation to the remaining columns and
    // update the norms
    // Any column left?
    if (j === n - 1) {
      rdiag[j] = -ajnorm;
      continue;
    }
    for (let k = j + 1; k < n; k++) {
      ssum = 0.0;
      for (let i = j; i < m; i++) {
        ssum += (a[i + lda * j] ?? NaN) * (a[i + lda * k] ?? NaN);
      }
      temp = ssum / (a[j + lda * j] ?? NaN);
      for (let i = j; i < m; i++) {
        a[i + lda * k] =
          (a[i + lda * k] ?? NaN) - temp * (a[i + lda * j] ?? NaN);
      }
    }
    rdiag[j] = -ajnorm;
  }
}

/**
 * given an m by n matrix a, this subroutine computes a*q where
 * q is the product of 2*(n - 1) transformations
 *
 *       gv(n-1)*...*gv(1)*gw(1)*...*gw(n-1)
 *
 * and gv(i), gw(i) are givens rotations in the (i,n) plane which
 * eliminate elements in the i-th and n-th planes, respectively.
 * q itself is not given, rather the information to recover the
 * gv, gw rotations is supplied.
 */
function r1mpyq(
  m: number,
  n: number,
  a: number[],
  lda: number,
  v: readonly number[],
  w: readonly number[],
): void {
  let j, ccos, ssin, temp;

  if (n < 2) {
    return;
  }
  for (let k = 0; k < n - 1; k++) {
    j = n - k - 2;
    if (Math.abs(v[j] ?? NaN) > 1.0) {
      ccos = 1 / (v[j] ?? NaN);
      ssin = Math.sqrt(1.0 - ccos * ccos);
    } else {
      ssin = v[j] ?? NaN;
      ccos = Math.sqrt(1.0 - ssin * ssin);
    }
    for (let i = 0; i < m; i++) {
      temp =
        ccos * (a[i + j * lda] ?? NaN) - ssin * (a[i + (n - 1) * lda] ?? NaN);
      a[i + (n - 1) * lda] =
        ssin * (a[i + j * lda] ?? NaN) + ccos * (a[i + (n - 1) * lda] ?? NaN);
      a[i + j * lda] = temp;
    }
  }

  // Apply the second set of givens rotations to a.
  for (j = 0; j < n - 1; j++) {
    if (Math.abs(w[j] ?? NaN) > 1) {
      ccos = 1 / (w[j] ?? NaN);
      ssin = Math.sqrt(1 - ccos * ccos);
    } else {
      ssin = w[j] ?? NaN;
      ccos = Math.sqrt(1 - ssin * ssin);
    }
    for (let i = 0; i < m; i++) {
      temp =
        ccos * (a[i + lda * j] ?? NaN) + ssin * (a[i + (n - 1) * lda] ?? NaN);
      a[i + (n - 1) * lda] =
        -ssin * (a[i + j * lda] ?? NaN) + ccos * (a[i + (n - 1) * lda] ?? NaN);
      a[i + lda * j] = temp;
    }
  }
}

/**
 * given an m by n lower trapezoidal matrix s, an m-vector u,
 * and an n-vector v, the problem is to determine an
 * orthogonal matrix q such that
 *
 *               t
 *       (s + u*v )*q
 *
 * is again lower trapezoidal.
 */
function r1updt(
  m: number,
  n: number,
  s: number[],
  u: readonly number[],
  v: number[],
  w: number[],
): void {
  let j, jj, l, ccos, ccotan, ssin, ttan, tau, temp;
  const giant = dpmpar[2];

  // Initialize the diagonal element pointer
  jj = (n * (2 * m - n + 1)) / 2 - (m - n);

  // Move the nontrivial part of the last column of s into w
  l = jj;
  for (let i = n; i <= m; i++) {
    w[i - 1] = s[l - 1] ?? NaN;
    l++;
  }

  // Rotate the vector v into a multiple of the n-th unit vector
  // in such a way that a spike is introduced into w.
  const nm1 = n - 1;
  if (nm1 >= 1) {
    for (let nmj = 1; nmj <= nm1; nmj++) {
      j = n - nmj;
      jj -= m - j + 1;
      w[j - 1] = 0.0;
      if (v[j - 1] !== 0.0) {
        // Determine a givens rotation which eliminates the
        // j-th element of v.
        if (Math.abs(v[n - 1] ?? NaN) < Math.abs(v[j - 1] ?? NaN)) {
          ccotan = (v[n - 1] ?? NaN) / (v[j - 1] ?? NaN);
          ssin = 0.5 / Math.sqrt(0.25 + 0.25 * (ccotan * ccotan));
          ccos = ssin * ccotan;
          tau = 1.0;
          if (Math.abs(ccos) * giant > 1.0) {
            tau = 1.0 / ccos;
          }
        } else {
          ttan = (v[j - 1] ?? NaN) / (v[n - 1] ?? NaN);
          ccos = 0.5 / Math.sqrt(0.25 + 0.25 * (ttan * ttan));
          ssin = ccos * ttan;
          tau = ssin;
        }

        // Apply the transformation to v and store the information
        // necessary to recover the givens rotation.
        v[n - 1] = ssin * (v[j - 1] ?? NaN) + ccos * (v[n - 1] ?? NaN);
        v[j - 1] = tau;

        // Apply the transformation to s and extend the spike in w.
        l = jj;
        for (let i = j; i <= m; i++) {
          temp = ccos * (s[l - 1] ?? NaN) - ssin * (w[i - 1] ?? NaN);
          w[i - 1] = ssin * (s[l - 1] ?? NaN) + ccos * (w[i - 1] ?? NaN);
          s[l - 1] = temp;
          l++;
        }
      }
    }
  }

  // Add the spike from the rank-1 update to w.
  for (let i = 0; i < m; i++) {
    w[i] = (w[i] ?? NaN) + (v[n - 1] ?? NaN) * (u[i] ?? NaN);
  }

  // Eliminate the spike
  if (nm1 >= 1) {
    for (j = 1; j <= nm1; j++) {
      if (w[j - 1] !== 0) {
        // Determine a givens rotation which eliminates the
        // j-th element of the spike.
        if (Math.abs(s[jj - 1] ?? NaN) < Math.abs(w[j - 1] ?? NaN)) {
          ccotan = (s[jj - 1] ?? NaN) / (w[j - 1] ?? NaN);
          ssin = 0.5 / Math.sqrt(0.25 + 0.25 * square(ccotan));
          ccos = ssin * ccotan;
          tau = 1.0;
          if (Math.abs(ccos) * giant > 1.0) {
            tau = 1 / ccos;
          }
        } else {
          ttan = (w[j - 1] ?? NaN) / (s[jj - 1] ?? NaN);
          ccos = 0.5 / Math.sqrt(0.25 + 0.25 * square(ttan));
          ssin = ccos * ttan;
          tau = ssin;
        }

        // Apply the transformation to s and reduce the spike in w.
        l = jj;
        for (let i = j; i <= m; i++) {
          temp = ccos * (s[l - 1] ?? NaN) + ssin * (w[i - 1] ?? NaN);
          w[i - 1] = -ssin * (s[l - 1] ?? NaN) + ccos * (w[i - 1] ?? NaN);
          s[l - 1] = temp;
          l++;
        }

        w[j - 1] = tau;
      }

      jj += m - j + 1;
    }
  }

  // Move w back into the last column of the output s.
  l = jj;
  for (let i = n; i <= m; i++) {
    s[l - 1] = w[i - 1] ?? NaN;
    l++;
  }
}
