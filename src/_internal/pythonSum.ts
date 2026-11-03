// A line-by-line port of CPython 3.12.15's builtin `sum` for ints and floats,
// `builtin_sum_impl` in `Python/bltinmodule.c`, its fast paths without
// `start` (ADR 0026, decision 331).
//
// Summary of the changes made to Python (PSF License Agreement, clause 3):
// only the int fast path and the float fast path are ported, for a sequence
// of numbers each marked as a Python int or float, with no `start` argument.
// A JavaScript number stands in for a Python int, so an int sum is exact only
// while its magnitude stays below 2 ** 53, and the general path for an int
// beyond a C long is left out.
//
// PYTHON SOFTWARE FOUNDATION LICENSE VERSION 2
// --------------------------------------------
//
// 1. This LICENSE AGREEMENT is between the Python Software Foundation
// ("PSF"), and the Individual or Organization ("Licensee") accessing and
// otherwise using this software ("Python") in source or binary form and
// its associated documentation.
//
// 2. Subject to the terms and conditions of this License Agreement, PSF hereby
// grants Licensee a nonexclusive, royalty-free, world-wide license to reproduce,
// analyze, test, perform and/or display publicly, prepare derivative works,
// distribute, and otherwise use Python alone or in any derivative version,
// provided, however, that PSF's License Agreement and PSF's notice of copyright,
// i.e., "Copyright (c) 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010,
// 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023 Python Software Foundation;
// All Rights Reserved" are retained in Python alone or in any derivative version
// prepared by Licensee.
//
// 3. In the event Licensee prepares a derivative work that is based on
// or incorporates Python or any part thereof, and wants to make
// the derivative work available to others as provided herein, then
// Licensee hereby agrees to include in any such work a brief summary of
// the changes made to Python.
//
// 4. PSF is making Python available to Licensee on an "AS IS"
// basis.  PSF MAKES NO REPRESENTATIONS OR WARRANTIES, EXPRESS OR
// IMPLIED.  BY WAY OF EXAMPLE, BUT NOT LIMITATION, PSF MAKES NO AND
// DISCLAIMS ANY REPRESENTATION OR WARRANTY OF MERCHANTABILITY OR FITNESS
// FOR ANY PARTICULAR PURPOSE OR THAT THE USE OF PYTHON WILL NOT
// INFRINGE ANY THIRD PARTY RIGHTS.
//
// 5. PSF SHALL NOT BE LIABLE TO LICENSEE OR ANY OTHER USERS OF PYTHON
// FOR ANY INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES OR LOSS AS
// A RESULT OF MODIFYING, DISTRIBUTING, OR OTHERWISE USING PYTHON,
// OR ANY DERIVATIVE THEREOF, EVEN IF ADVISED OF THE POSSIBILITY THEREOF.
//
// 6. This License Agreement will automatically terminate upon a material
// breach of its terms and conditions.
//
// 7. Nothing in this License Agreement shall be deemed to create any
// relationship of agency, partnership, or joint venture between PSF and
// Licensee.  This License Agreement does not grant permission to use PSF
// trademarks or trade name in a trademark sense to endorse or promote
// products or services of Licensee, or any third party.
//
// 8. By copying, installing or otherwise using Python, Licensee
// agrees to be bound by the terms and conditions of this License
// Agreement.

/**
 * Sums numbers as Python 3.12's builtin `sum(iterable)` does: ints exactly,
 * from the int 0, until the first float, then the floats by Neumaier's
 * compensated sum, an int after that added without compensation. A plain
 * left-to-right sum differs from it, for example on seven equal daily means
 * of 1.75 weighted by 0.8 ** i, whose weighted mean Python's `round` then
 * takes to 1.7 and a plain sum to 1.8 (ticket 50, decision 331).
 *
 * @param items - the numbers to sum
 * @param is_int - for each item, whether Python holds it as an int
 * @returns the sum, an int when every item is one (the int 0 for none)
 */
export function pythonSum(
  items: readonly number[],
  is_int: readonly boolean[],
): number {
  let i = 0;
  let i_result = 0;
  for (; i < items.length && is_int[i]; i++) i_result += items[i] ?? NaN;
  if (i === items.length) return i_result;
  // Either is not an int: the int and the first float are added as objects.
  let f_result = i_result + (items[i] ?? NaN);
  let c = 0.0;
  for (i++; i < items.length; i++) {
    const x = items[i] ?? NaN;
    if (!is_int[i]) {
      // Improved Kahan–Babuška algorithm by Arnold Neumaier
      const t = f_result + x;
      if (Math.abs(f_result) >= Math.abs(x)) {
        c += f_result - t + x;
      } else {
        c += x - t + f_result;
      }
      f_result = t;
      continue;
    }
    f_result += x;
  }
  // Avoid losing the sign on a negative result, and don't let adding the
  // compensation convert an infinite or overflowed sum to a NaN.
  if (c && Number.isFinite(c)) {
    f_result += c;
  }
  return f_result;
}
