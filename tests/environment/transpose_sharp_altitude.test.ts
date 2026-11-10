import { describe, expect, test } from "vitest";
import { transpose_sharp_altitude } from "../../src/environment/index.ts";
import { transpose_sharp_altitude as from_root } from "../../src/index.ts";
import { approx } from "../models/testUtils.ts";
import { DEFAULT_TOLERANCE } from "../parity/harness.ts";

// Mirrors pythermalcomfort v4.8.0 tests/test_environment.py,
// test_transpose_sharp_altitude; its keyword calls are positional here.
describe("test_environment", () => {
  test("test_transpose_sharp_altitude", () => {
    for (const [sharp, altitude, expected] of [
      [0, 0, [0, 90]],
      [0, 20, [0, 70]],
      [0, 45, [0, 45]],
      [0, 60, [0, 30]],
      [90, 0, [90, 0]],
      [90, 45, [45, 0]],
      [90, 30, [60, 0]],
      [135, 60, [22.208, 20.705]],
      [120, 75, [13.064, 7.435]],
      [150, 30, [40.893, 48.59]],
    ] as const) {
      const result = transpose_sharp_altitude(sharp, altitude);
      expect(
        result.map((value, i) =>
          approx(value, expected[i] ?? NaN, { rel: 0, abs: 5e-4 }),
        ),
      ).toEqual([true, true]);
    }
  });
});

// What upstream's test leaves out, measured on pythermalcomfort 4.6.2 in the
// parity image, the unrounded values on 4.8.0.
describe("transpose_sharp_altitude (JS-only)", () => {
  // A call with arguments the type rejects, to test the runtime.
  const call =
    (...args: unknown[]) =>
    () =>
      (transpose_sharp_altitude as (...a: unknown[]) => unknown)(...args);

  // transpose_sharp_altitude.py:22 returns the angles unrounded (641646c).
  test.each([
    [135, 60, [22.207654298596488, 20.70481105463543]],
    [120, 75, [13.064313429508289, 7.435472226131851]],
    [150, 30, [40.89339464913089, 48.590377890729144]],
    [0, 20, [0, 70.00000000000001]],
  ] as const)(
    "(%s, %s) gives upstream's unrounded angles",
    (sharp, altitude, expected) => {
      // A 0 stays exact, as Math.sin(+0) and Math.atan(+0) are +0.
      expect(transpose_sharp_altitude(sharp, altitude)).toEqual(
        expected.map((angle) =>
          angle === 0 ? angle : expect.toBeApprox(angle, DEFAULT_TOLERANCE),
        ),
      );
    },
  );

  // Upstream returns a tuple (decision 152).
  test("returns a frozen pair", () => {
    const result = transpose_sharp_altitude(135, 60);
    expect(Object.isFrozen(result)).toBe(true);
    expect(result).toHaveLength(2);
  });

  // numba reads True as 1 (deviation _shared-30), and raises TypingError
  // with its compiler's text for a string, None or a list (deviation
  // _shared-31, deviation _shared-32).
  test("an argument that is not a number throws TypeError, naming it", () => {
    for (const bad of ["0", null, [0], true, {}]) {
      expect(call(bad, 0)).toThrow(new TypeError("sharp must be a number."));
      expect(call(0, bad)).toThrow(new TypeError("altitude must be a number."));
    }
    expect(call(0)).toThrow(new TypeError("altitude must be a number."));
  });

  // As numba's math: (nan, nan) for each.
  test("NaN and ±Infinity propagate", () => {
    for (const [sharp, altitude] of [
      [NaN, 0],
      [Infinity, 0],
      [0, Infinity],
      [0, NaN],
    ] as const) {
      const [s, a] = transpose_sharp_altitude(sharp, altitude);
      expect(s).toBeNaN();
      expect(a).toBeNaN();
    }
  });

  test("is exported from the package root as from its subpath", () => {
    expect(from_root).toBe(transpose_sharp_altitude);
  });
});
