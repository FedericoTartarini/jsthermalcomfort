import { describe, expect, test } from "@jest/globals";
import { brentq, RootNotBracketedError } from "../../src/_internal/brentq.ts";

// Expected values from scipy 1.18.1's optimize.brentq with its defaults, the
// call brentq stands in for (xtol = 2e-12, rtol = 4 * eps).
describe("brentq", () => {
  const within_scipy_tolerance = (x: number, expected: number) =>
    expect(Math.abs(x - expected)).toBeLessThanOrEqual(
      2e-12 + 4 * Number.EPSILON * Math.abs(expected),
    );

  test.each([
    ["x * x - 2 on [0, 2]", (x: number) => x * x - 2, 0, 2, 1.4142135623731364],
    [
      "cos(x) - x on [0, 1]",
      (x: number) => Math.cos(x) - x,
      0,
      1,
      0.7390851332151559,
    ],
  ] as [string, (x: number) => number, number, number, number][])(
    "finds scipy's root of %s",
    (_, f, a, b, expected) => {
      within_scipy_tolerance(brentq(f, a, b), expected);
    },
  );

  // scipy returns an end of the interval where f is 0 there.
  test("returns an end of the interval where f is 0", () => {
    expect(brentq((x) => x, 0, 2)).toBe(0);
    expect(brentq((x) => x - 2, 0, 2)).toBe(2);
  });

  // scipy raises ValueError for each of these.
  test.each([
    ["f(a) and f(b) share a sign", (x: number) => x * x + 1],
    ["f(a) is NaN", (x: number) => (x === 0 ? NaN : x - 1)],
    ["f(b) is NaN", (x: number) => (x === 2 ? NaN : x - 1)],
  ] as [string, (x: number) => number][])(
    "throws RootNotBracketedError when %s",
    (_, f) => {
      expect(() => brentq(f, 0, 2)).toThrow(RootNotBracketedError);
    },
  );
});
