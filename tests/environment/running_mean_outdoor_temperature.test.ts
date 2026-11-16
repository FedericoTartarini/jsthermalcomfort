import { describe, expect, test } from "vitest";
import { running_mean_outdoor_temperature } from "../../src/environment/index.ts";
import { running_mean_outdoor_temperature as from_root } from "../../src/index.ts";
import { Units } from "../../src/utilities/index.ts";
import { approx } from "../models/testUtils.ts";

// Mirrors pythermalcomfort v4.8.1 tests/test_environment.py,
// test_running_mean_outdoor_temperature; its keyword calls are positional
// here.
describe("test_environment", () => {
  test("test_running_mean_outdoor_temperature", () => {
    expect(running_mean_outdoor_temperature([20, 20], 0.7)).toBe(20);
    expect(running_mean_outdoor_temperature([20, 20], 0.9)).toBe(20);
    expect(running_mean_outdoor_temperature([20, 20, 20, 20], 0.7)).toBe(20);
    expect(running_mean_outdoor_temperature([20, 20, 20, 20], 0.5)).toBe(20);
    const temperatures_ip = [77, 77, 77, 77, 77, 77, 77];
    expect(
      running_mean_outdoor_temperature(temperatures_ip, 0.8, Units.IP),
    ).toBe(77);
    expect(temperatures_ip).toEqual([77, 77, 77, 77, 77, 77, 77]);
    expect(
      running_mean_outdoor_temperature(temperatures_ip, 0.8, Units.IP),
    ).toBe(77);
  });
});

// Mirrors the running_mean_outdoor_temperature row of pythermalcomfort v4.8.1
// tests/test_utilities.py, with np.testing.assert_allclose's tolerance (rtol
// 1e-7, atol 1e-8), without upstream's DeprecationWarning from an old import
// path the library does not serve (deviation _shared-136).
describe("test_utilities", () => {
  describe("test_moved_public_utility_shims", () => {
    test("running_mean_outdoor_temperature", () => {
      expect(
        approx(running_mean_outdoor_temperature([20, 21, 22]), 20.9, {
          rel: 1e-7,
          abs: 1e-8,
        }),
      ).toBe(true);
    });
  });
});

// What upstream's tests leave out, with pythermalcomfort 4.8.0's values
// (ticket 50's measure.out and constant_weeks.json, Python 3.12.15) unless a
// test says otherwise.
describe("running_mean_outdoor_temperature (JS-only)", () => {
  // A call with arguments the type rejects, to test the runtime.
  const call =
    (...args: unknown[]) =>
    () =>
      (running_mean_outdoor_temperature as (...a: unknown[]) => unknown)(
        ...args,
      );

  test("takes the IP path for units in any case", () => {
    // The IP path and the SI path round this mean differently.
    expect(running_mean_outdoor_temperature([53.7, 106.1], 0.6, "IP")).toBe(
      73.4,
    );
    expect(call([53.7, 106.1], 0.6, "ip")()).toBe(73.4);
    expect(running_mean_outdoor_temperature([53.7, 106.1], 0.6, "SI")).toBe(
      73.3,
    );
  });

  // Upstream compares with "IP" only (environment/running_mean_outdoor_temperature.py:122),
  // measured on pythermalcomfort 4.8.1.
  test("takes the SI path for any other units", () => {
    expect(call([20, 21], 0.8, "XX")()).toBe(20.4);
  });

  test("rounds the exact binary value, as Python's round does", () => {
    // 29.95 is stored just below 29.95; numpy's round gives 30 (ADR 0026).
    expect(running_mean_outdoor_temperature([29.95])).toBe(29.9);
  });

  test("sums as Python 3.12's builtin sum does", () => {
    // Seven equal daily means; a plain left-to-right sum, rounded as Python
    // rounds, gives 1.8, -18.3 and -17.1.
    expect(running_mean_outdoor_temperature(Array<number>(7).fill(1.75))).toBe(
      1.7,
    );
    expect(
      running_mean_outdoor_temperature(Array<number>(7).fill(-18.35)),
    ).toBe(-18.4);
    expect(
      running_mean_outdoor_temperature(Array<number>(7).fill(-17.05)),
    ).toBe(-17);
  });

  test("keeps Python's signed zeros", () => {
    expect(Object.is(running_mean_outdoor_temperature([-0]), 0)).toBe(true);
    expect(Object.is(running_mean_outdoor_temperature([-0.04]), -0)).toBe(true);
  });

  // Deviation _shared-133, deviation _shared-134.
  test("throws RangeError with Python's message where it divides by zero", () => {
    expect(call([])).toThrow(new RangeError("division by zero"));
    expect(call([], 0.8, "IP")).toThrow(new RangeError("division by zero"));
    expect(call([20, 21, 22, 23], -1)).toThrow(
      new RangeError("division by zero"),
    );
    expect(call([20.5, 21], -1)).toThrow(
      new RangeError("float division by zero"),
    );
    expect(call([20, 21], -1, "IP")).toThrow(
      new RangeError("float division by zero"),
    );
    expect(running_mean_outdoor_temperature([20, 21, 22], -1)).toBe(21);
  });

  // Deviation _shared-125, deviation _shared-126, deviation _shared-127, deviation _shared-128.
  test("throws TypeError for a temp_array that is not an array of numbers", () => {
    for (const bad of [null, true, 20, "20", { 0: 20 }]) {
      expect(call(bad)).toThrow(new TypeError("temp_array must be an array."));
    }
    expect(call()).toThrow(new TypeError("temp_array must be an array."));
    for (const bad of [
      [20, "21"],
      [20, null],
      [20, true],
      [20, [21]],
      [20, undefined],
    ]) {
      expect(call(bad)).toThrow(
        new TypeError("temp_array must be an array of numbers."),
      );
    }
  });

  test("throws TypeError for an alpha or units of the wrong type, naming it", () => {
    for (const bad of [null, true, "0.8", [0.8]]) {
      expect(call([20, 21], bad)).toThrow(
        new TypeError("alpha must be a number."),
      );
    }
    for (const bad of [null, true, 5, ["SI"]]) {
      expect(call([20, 21], 0.8, bad)).toThrow(
        new TypeError("units must be a string."),
      );
    }
  });

  test("takes the defaults for an explicit undefined", () => {
    expect(
      running_mean_outdoor_temperature([20, 22], undefined, undefined),
    ).toBe(running_mean_outdoor_temperature([20, 22]));
  });

  // Measured on pythermalcomfort 4.8.1.
  test("NaN and ±Infinity propagate", () => {
    expect(running_mean_outdoor_temperature([20, NaN])).toBeNaN();
    expect(running_mean_outdoor_temperature([20, 21], NaN)).toBeNaN();
    expect(running_mean_outdoor_temperature([Infinity, 20])).toBe(Infinity);
    expect(running_mean_outdoor_temperature([Infinity, -Infinity])).toBeNaN();
  });

  test("is exported from the package root as from its subpath", () => {
    expect(from_root).toBe(running_mean_outdoor_temperature);
  });
});
