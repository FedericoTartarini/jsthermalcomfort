import { describe, expect, test } from "vitest";
import { transpose_sharp_altitude } from "../../src/environment/index.ts";
import { transpose_sharp_altitude as from_root } from "../../src/index.ts";

// Mirrors pythermalcomfort v4.7.0 tests/test_environment.py,
// test_transpose_sharp_altitude; its keyword calls are positional here.
describe("test_environment", () => {
  test("test_transpose_sharp_altitude", () => {
    expect(transpose_sharp_altitude(0, 0)).toEqual([0, 90]);
    expect(transpose_sharp_altitude(0, 20)).toEqual([0, 70]);
    expect(transpose_sharp_altitude(0, 45)).toEqual([0, 45]);
    expect(transpose_sharp_altitude(0, 60)).toEqual([0, 30]);
    expect(transpose_sharp_altitude(90, 0)).toEqual([90, 0]);
    expect(transpose_sharp_altitude(90, 45)).toEqual([45, 0]);
    expect(transpose_sharp_altitude(90, 30)).toEqual([60, 0]);
    expect(transpose_sharp_altitude(135, 60)).toEqual([22.208, 20.705]);
    expect(transpose_sharp_altitude(120, 75)).toEqual([13.064, 7.435]);
    expect(transpose_sharp_altitude(150, 30)).toEqual([40.893, 48.59]);
  });
});

// What upstream's test leaves out, measured on pythermalcomfort 4.6.2 in the
// parity image.
describe("transpose_sharp_altitude (JS-only)", () => {
  // A call with arguments the type rejects, to test the runtime.
  const call =
    (...args: unknown[]) =>
    () =>
      (transpose_sharp_altitude as (...a: unknown[]) => unknown)(...args);

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
