import { describe, expect, test } from "vitest";
import { operative_tmp } from "../../src/environment/index.ts";
import { operative_tmp as from_root } from "../../src/index.ts";

// Mirrors pythermalcomfort v4.8.0 tests/test_environment.py, test_t_o; its
// keyword calls are positional here.
describe("test_environment", () => {
  test("test_t_o", () => {
    expect(operative_tmp(25, 25, 0.1)).toBe(25);
    // operative_tmp([25, 20], 30, 0.3) ≈ [26.83, 23.66], atol 1e-2, element-wise.
    expect(Math.abs(operative_tmp(25, 30, 0.3) - 26.83)).toBeLessThanOrEqual(
      1e-2,
    );
    expect(Math.abs(operative_tmp(20, 30, 0.3) - 23.66)).toBeLessThanOrEqual(
      1e-2,
    );
    expect(operative_tmp(25, 25, 0.1, "ASHRAE")).toBe(25);
    expect(operative_tmp(20, 30, 0.1, "ASHRAE")).toBe(25);
    expect(operative_tmp(20, 30, 0.3, "ASHRAE")).toBe(24);
    expect(operative_tmp(20, 30, 0.7, "ASHRAE")).toBe(23);
  });
});

// What upstream's test leaves out, measured on pythermalcomfort 4.7.0 in the
// parity image.
describe("operative_tmp (JS-only)", () => {
  // A call with arguments the type rejects, to test the runtime.
  const call =
    (...args: unknown[]) =>
    () =>
      (operative_tmp as (...a: unknown[]) => unknown)(...args);

  // Upstream lower-cases standard (environment/operative_tmp.py:38, :40).
  test("takes ISO and ASHRAE in any case", () => {
    expect(operative_tmp(20, 30, 0.3, "ashrae")).toBe(24);
    expect(operative_tmp(20, 30, 0.3, "Iso")).toBe(23.660254037844386);
    expect(operative_tmp(20, 30, 0.3)).toBe(23.660254037844386);
  });

  // Upstream computes on with a negative v: NaN under ISO, from the square
  // root, and the 0.5 weighting under ASHRAE, 27.5 here.
  test("computes a negative v as upstream does", () => {
    expect(operative_tmp(25, 30, -0.5)).toBeNaN();
    expect(operative_tmp(25, 30, -0.5, "ASHRAE")).toBe(27.5);
  });

  // ValueError, raised for any other string (operative_tmp.py:44-48).
  test("throws upstream's message, a RangeError, for another standard", () => {
    expect(call(20, 30, 0.3, "foo")).toThrow(
      new RangeError(
        "Operative temperature can only be calculated in compliance with ISO or ASHRAE standards. Received standard: foo",
      ),
    );
  });

  // numpy converts "20" to 20.0, True to 1.0 and None to nan, broadcasts a
  // list, and raises ValueError for "a"; .lower() raises AttributeError for a
  // standard that is not a string (deviation _shared-33, deviation _shared-34,
  // deviation _shared-35, deviation _shared-36, deviation _shared-37).
  test("an argument of the wrong type throws TypeError, naming it", () => {
    for (const bad of ["20", null, [20], true, {}]) {
      expect(call(bad, 30, 0.3)).toThrow(
        new TypeError("tdb must be a number."),
      );
      expect(call(20, bad, 0.3)).toThrow(new TypeError("tr must be a number."));
      expect(call(20, 30, bad)).toThrow(new TypeError("v must be a number."));
    }
    for (const bad of [5, null, true])
      expect(call(20, 30, 0.3, bad)).toThrow(
        new TypeError("standard must be a string."),
      );
    expect(call(20)).toThrow(new TypeError("tr must be a number."));
  });

  // As numpy's: nan for a NaN input and an infinite v under ISO, and the 0.7
  // weighting under ASHRAE, where nan < 0.6 is false.
  test("NaN and ±Infinity propagate", () => {
    expect(operative_tmp(NaN, 30, 0.3)).toBeNaN();
    expect(operative_tmp(20, 30, Infinity)).toBeNaN();
    expect(operative_tmp(20, 30, Infinity, "ASHRAE")).toBe(23);
    expect(operative_tmp(20, 30, NaN, "ASHRAE")).toBe(23);
  });

  test("is exported from the package root as from its subpath", () => {
    expect(from_root).toBe(operative_tmp);
  });
});
