import { describe, expect, test } from "vitest";
import { body_surface_area } from "../../src/utilities/index.ts";
import { body_surface_area as from_root } from "../../src/index.ts";
import { approx } from "../models/testUtils.ts";
import { DEFAULT_TOLERANCE } from "../parity/harness.ts";

// Mirrors the body_surface_area cases of pythermalcomfort v4.8.0
// tests/test_utilities.py; its keyword call is positional here.
describe("test_utilities", () => {
  test("test_body_surface_area", () => {
    expect(approx(body_surface_area(80, 1.8), 1.9917, { rel: 1e-2 })).toBe(
      true,
    );
    expect(
      approx(body_surface_area(70, 1.8, "dubois"), 1.88, { rel: 1e-2 }),
    ).toBe(true);
    expect(
      approx(body_surface_area(75, 1.75, "takahira"), 1.91, { rel: 1e-2 }),
    ).toBe(true);
    expect(
      approx(body_surface_area(80, 1.7, "fujimoto"), 1.872, { rel: 1e-2 }),
    ).toBe(true);
    expect(
      approx(body_surface_area(85, 1.65, "kurazumi"), 1.89, { rel: 1e-2 }),
    ).toBe(true);
    expect(() => body_surface_area(70, 1.8, "invalid_formula")).toThrow(
      RangeError,
    );
  });
});

// What upstream's test leaves out, measured on pythermalcomfort 4.7.0 in the
// parity image.
describe("body_surface_area (JS-only)", () => {
  // A call with arguments the type rejects, to test the runtime.
  const call =
    (...args: unknown[]) =>
    () =>
      (body_surface_area as (...a: unknown[]) => unknown)(...args);

  test.each([
    [80, 1.8, undefined, 1.9917607971689137],
    [70, 1.8, "dubois", 1.8818742624749278],
    [75, 1.75, "takahira", 1.919372906042847],
    [80, 1.7, "fujimoto", 1.8723162568631528],
    [85, 1.65, "kurazumi", 1.8926645519678011],
  ] as const)("(%d, %d, %s) gives upstream's value", (w, h, f, expected) => {
    expect(
      approx(body_surface_area(w, h, f), expected, DEFAULT_TOLERANCE),
    ).toBe(true);
  });

  test("is exported from the root entry", () => {
    expect(from_root).toBe(body_surface_area);
  });

  // ValueError, raised for any other formula, a different case included
  // (utilities.py:113-116; deviation _shared-85).
  test("throws upstream's message, a RangeError, for another formula", () => {
    for (const formula of ["invalid_formula", "Dubois"]) {
      expect(call(70, 1.8, formula)).toThrow(
        new RangeError(
          `Formula '${formula}' for calculating body surface area is not recognized.`,
        ),
      );
    }
  });

  // Python raises TypeError for None, "70" and [70], reads True as 1, and
  // raises ValueError for a formula that is not a string (deviation
  // _shared-82, deviation _shared-83, deviation _shared-84, deviation
  // _shared-85).
  test("an argument of the wrong type throws TypeError, naming it", () => {
    for (const bad of ["70", null, [70], true, {}]) {
      expect(call(bad, 1.8)).toThrow(new TypeError("weight must be a number."));
      expect(call(70, bad)).toThrow(new TypeError("height must be a number."));
    }
    for (const bad of [1, null, true]) {
      expect(call(70, 1.8, bad)).toThrow(
        new TypeError("formula must be a string."),
      );
    }
    expect(call()).toThrow(new TypeError("weight must be a number."));
    expect(call(70)).toThrow(new TypeError("height must be a number."));
  });

  // As Python's floats: nan for NaN, inf for an infinite weight or height,
  // -inf included, and 0.0 for a zero weight.
  test("NaN and ±Infinity propagate", () => {
    expect(body_surface_area(NaN, 1.8)).toBeNaN();
    expect(body_surface_area(Infinity, 1.8)).toBe(Infinity);
    expect(body_surface_area(-Infinity, 1.8)).toBe(Infinity);
    expect(body_surface_area(70, Infinity)).toBe(Infinity);
    expect(body_surface_area(0, 1.8)).toBe(0);
  });

  // Python returns a complex number (deviation _shared-86).
  test("a negative weight or height gives NaN", () => {
    expect(body_surface_area(-70, 1.8)).toBeNaN();
    expect(body_surface_area(70, -1.8)).toBeNaN();
  });
});
