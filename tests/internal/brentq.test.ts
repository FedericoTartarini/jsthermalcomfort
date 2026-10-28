import { describe, expect, test } from "vitest";
import { brentq } from "../../src/_internal/brentq.ts";

// The functions scipy was run on, each written with the same operations in the
// same order as the Python one, so both evaluate to the same bits.
function make(fam: string, p: readonly number[]): (x: number) => number {
  const [p0 = NaN, p1 = NaN, p2 = NaN, p3 = NaN, p4 = NaN, p5 = NaN] = p;
  switch (fam) {
    case "poly3":
      return (x) => p0 * (x - p1) * (x - p2) * (x - p3);
    case "horner5":
      return (x) => ((((p0 * x + p1) * x + p2) * x + p3) * x + p4) * x + p5;
    case "flat3":
      return (x) => {
        const t = x - p1;
        return p0 * t * t * t;
      };
    case "lin":
      return (x) => p0 * (x - p1);
    case "steep":
      return (x) => {
        const t = x - p1;
        return t / (Math.abs(t) + p0);
      };
    case "nearend":
      return (x) => (x - p0) * (1 + p1 * x * x);
    case "nan_at":
      return (x) => (x === p0 ? NaN : x - p1);
    case "nan_band":
      return (x) => (x > p0 && x < p1 ? NaN : x - p2);
    case "neginf_at":
      return (x) => (x === p0 ? -Infinity : x - p1);
    case "step":
      return (x) => (x < p0 ? -1.0 : 1.0);
    case "zero":
      return (x) => 0 * x;
  }
  throw new Error(fam);
}

// Calls brentq on the function and counts its evaluations.
function run(
  fam: string,
  p: readonly number[],
  a: number,
  b: number,
  maxiter?: number,
) {
  const f = make(fam, p);
  let calls = 0;
  const g = (x: number) => {
    calls++;
    return f(x);
  };
  try {
    return { root: brentq(g, a, b, undefined, undefined, maxiter), calls };
  } catch (error) {
    return { error, calls };
  }
}

// scipy 1.18.1's brentq in the parity image (scripts/parity/Dockerfile,
// x86_64), called as upstream calls it, with its defaults: the root, or the
// error, and the number of evaluations of f, which gives the iterations.
describe("brentq", () => {
  test.each([
    [
      "poly3",
      [
        0.5508405009016183, 0.12241968260649383, -0.03678517463403924,
        -0.0724788432741979,
      ],
      0.06971781858007063,
      0.16805435146988676,
      0.1224196826062704,
      10,
    ],
    [
      "poly3",
      [
        -0.5794731689919067, -33.03521657729581, 3.920485836980301,
        55.06342344123723,
      ],
      -53.488409443024416,
      2.5629813083114135,
      -33.0352165772958,
      12,
    ],
    [
      "horner5",
      [
        2.077224343918793, 0.13400584958166087, 3.054079878988515,
        -0.06432645527990957, -0.08595628630430853, 0.0014096796138139613,
      ],
      -1.388707050588358,
      0.4384037656056976,
      0.1678791492149569,
      14,
    ],
    [
      "horner5",
      [
        -0.23533289254134887, -0.3571668823629409, 0.08097339928595751,
        -0.042273806446717174, -0.6093527611577234, -0.17643744904556408,
      ],
      -1.0979924226216968,
      2.2664433847979852,
      -0.3036523676296895,
      12,
    ],
    [
      "flat3",
      [4.425778401672509e-8, -3.0698825941402177],
      -3.0785789984478615,
      -3.069364803719229,
      -3.069882594140205,
      96,
    ],
    [
      "flat3",
      [-0.00005904655305814684, -0.6740271821286035],
      -0.7094094076199121,
      -0.6732392975163687,
      -0.6740271821286483,
      101,
    ],
    [
      "lin",
      [-5.778832138211627e-55, 0.24708302247991748],
      0.20538821031753293,
      796.3168242748625,
      0.24708302247991748,
      3,
    ],
    [
      "lin",
      [-4.179868326899791e-62, -2232.1492773722985],
      -2232.1492785790774,
      -2232.0003637553336,
      -2232.1492773722985,
      3,
    ],
    [
      "steep",
      [1.056923294519202e-10, -1.2166312773268473],
      -1.5405828610087389,
      -1.1898401311767297,
      -1.2166312773268062,
      34,
    ],
    [
      "steep",
      [2.6465868048570644e-7, -2.507073573830796],
      -3.468526761526789,
      -2.116922110749103,
      -2.5070735738307963,
      27,
    ],
    [
      "nearend",
      [-4.420922148716495, 0.0015648816478653822],
      -6.6092965802187065,
      -4.420922120939983,
      -4.420922148716495,
      4,
    ],
    [
      "nearend",
      [1.8527224683149626, 1.3542465505333234],
      1.852722468314882,
      2.971636260281409,
      1.852722468314882,
      3,
    ],
  ] as const)(
    "%s: the root and calls scipy gives",
    (fam, p, a, b, root, calls) => {
      expect(run(fam, p, a, b)).toEqual({ root, calls });
    },
  );

  test.each([
    ["-inf at a", "neginf_at", [0, 0.3], 0, 1, 0.3, 6],
    ["step on [0, 40]", "step", [Math.PI], 0, 40, 3.1415926535908056, 47],
    ["reversed bracket a > b", "lin", [1, 0.3], 1, 0, 0.3, 3],
    ["root exactly at a", "lin", [1, 1], 1, 2, 1, 2],
    ["root exactly at b", "lin", [1, 2], 1, 2, 2, 2],
    ["f(a) = -0.0", "lin", [-1, 1], 1, 2, 1, 2],
    ["f(a) = f(b) = +0", "zero", [], 1, 2, 1, 2],
  ] as const)(
    "%s: the root and calls scipy gives",
    (_, fam, p, a, b, root, calls) => {
      expect(run(fam, p, a, b)).toEqual({ root, calls });
    },
  );

  test.each([
    ["same sign, both positive", "poly3", [1, -5, -6, -7], 0, 1, 2],
    ["same sign, both negative", "lin", [1, 5], 0, 1, 2],
    ["same sign, even double root inside", "poly3", [1, 0.5, 0.5, -5], 0, 1, 2],
    ["a == b", "lin", [1, 0.3], 1, 1, 2],
  ] as const)(
    "%s: scipy's ValueError, a RangeError",
    (_, fam, p, a, b, calls) => {
      expect(run(fam, p, a, b)).toEqual({
        error: new RangeError("f(a) and f(b) must have different signs"),
        calls,
      });
    },
  );

  // scipy writes x as Python's repr, x=0.0 and x=1.0.
  test.each([
    ["NaN at a", "nan_at", [0, 0.3], 0, 1],
    ["NaN at b", "nan_at", [1, 0.3], 1, 2],
    ["NaN at a and b", "nan_band", [-1, 2, 0.3], 0, 1],
    [
      "NaN on an interior band hit during iteration",
      "nan_band",
      [0.4, 0.6, 0.5],
      0.5,
      3,
    ],
  ] as const)("%s: scipy's ValueError, a RangeError", (_, fam, p, x, calls) => {
    expect(run(fam, p, 0, 1)).toEqual({
      error: new RangeError(
        `The function value at x=${x} is NaN; solver cannot continue.`,
      ),
      calls,
    });
  });

  test.each([
    [
      "flat3",
      [-1.5842135533430313e-10, 1.589211714046165],
      0.2582955166475953,
      1.7177821122799046,
      100,
      100,
      102,
    ],
    ["step", [0.3], -1e300, 1e300, 100, 100, 102],
    ["poly3", [1, 0.123, 5, 6], 0, 1, 3, 3, 5],
  ] as const)(
    "%s: scipy's RuntimeError, an Error",
    (fam, p, a, b, maxiter, iterations, calls) => {
      expect(run(fam, p, a, b, maxiter)).toEqual({
        error: new Error(`Failed to converge after ${iterations} iterations.`),
        calls,
      });
    },
  );

  test.each([
    [0, 4 * Number.EPSILON, 100, "xtol too small (0 <= 0)"],
    [-0.001, 4 * Number.EPSILON, 100, "xtol too small (-0.001 <= 0)"],
    [2e-12, 1e-16, 100, "rtol too small (1e-16 < 8.88178e-16)"],
    [2e-12, 4 * Number.EPSILON, -1, "maxiter must be >= 0"],
  ])(
    "xtol %s, rtol %s and maxiter %s: scipy's ValueError, a RangeError",
    (xtol, rtol, maxiter, message) => {
      expect(() => brentq((x) => x - 0.3, 0, 1, xtol, rtol, maxiter)).toThrow(
        new RangeError(message),
      );
    },
  );

  // scipy's operator.index raises "'float' object cannot be interpreted as an integer".
  test.each([2.5, NaN])("maxiter %s: scipy's TypeError", (maxiter) => {
    expect(() =>
      brentq((x) => x - 0.3, 0, 1, 2e-12, 4 * Number.EPSILON, maxiter),
    ).toThrow(new TypeError("maxiter must be an integer."));
  });
});
