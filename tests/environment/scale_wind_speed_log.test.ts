import { describe, expect, test } from "vitest";
import { scale_wind_speed_log } from "../../src/environment/index.ts";
import { scale_wind_speed_log as from_root } from "../../src/index.ts";
import environment from "../../src/environment/index.ts";
import { approx } from "../models/testUtils.ts";
import { DEFAULT_TOLERANCE } from "../parity/harness.ts";

// np.allclose's tolerance: rtol as given, atol 1e-8.
const allclose = (actual: number, expected: number, rtol: number) =>
  approx(actual, expected, { rel: rtol, abs: 1e-8 });

// A call with arguments the type rejects, to test the runtime.
const call =
  (...args: unknown[]) =>
  () =>
    (scale_wind_speed_log as (...a: unknown[]) => unknown)(...args);

// Mirrors pythermalcomfort v4.8.1 tests/test_environment.py, from
// test_compare_results_wind_profile_calculator to test_large_and_small_z0;
// its keyword calls are positional here, with undefined for a default, and
// its array calls are element-wise.
describe("test_environment", () => {
  test("test_compare_results_wind_profile_calculator", () => {
    for (const [v_z1, z2, z0, expected] of [
      [6.52, 2.0, 0.01, 5],
      [7.69, 2.0, 0.1, 5],
      [5.0, 90.0, 0.1, 7.39],
    ] as const) {
      const result = scale_wind_speed_log(v_z1, z2, 10, z0, undefined, false);
      expect(allclose(result.v_z2, expected, 1e-2)).toBe(true);
    }
  });

  test("test_scale_winds_speed_scalar", () => {
    const v10 = 5.0;
    const z2 = 2.0;
    const expected =
      (v10 * Math.log((z2 - 0.0) / 0.01)) / Math.log((10.0 - 0.0) / 0.01);
    const result = scale_wind_speed_log(
      v10,
      z2,
      undefined,
      undefined,
      undefined,
      false,
    );
    expect(allclose(result.v_z2, expected, 1e-5)).toBe(true);
  });

  test("test_scale_winds_speed_array", () => {
    for (const [v10, z2] of [
      [3.0, 1.5],
      [5.0, 2.5],
    ] as const) {
      const expected =
        (v10 * Math.log((z2 - 0.0) / 0.01)) / Math.log((10.0 - 0.0) / 0.01);
      const result = scale_wind_speed_log(
        v10,
        z2,
        undefined,
        undefined,
        undefined,
        false,
      );
      expect(allclose(result.v_z2, expected, 1e-5)).toBe(true);
    }
  });

  test("test_scale_wind_speed_broadcasting", () => {
    for (const [v10, z2, z0, expected] of [
      [
        3.0,
        1.5,
        0.01,
        (3.0 * Math.log((1.5 - 0.0) / 0.01)) / Math.log((10.0 - 0.0) / 0.01),
      ],
      [
        5.0,
        2.5,
        0.1,
        (5.0 * Math.log((2.5 - 0.0) / 0.1)) / Math.log((10.0 - 0.0) / 0.1),
      ],
    ] as const) {
      const result = scale_wind_speed_log(
        v10,
        z2,
        undefined,
        z0,
        undefined,
        false,
      );
      expect(allclose(result.v_z2, expected, 1e-5)).toBe(true);
    }
  });

  test("test_scale_winds_speed_with_displacement", () => {
    const v10 = 5.0;
    const z2 = 2.0;
    const z1 = 10.0;
    const z0 = 0.1;
    const d = 0.5;
    const expected = (v10 * Math.log((z2 - d) / z0)) / Math.log((z1 - d) / z0);
    const result = scale_wind_speed_log(v10, z2, z1, z0, d, false);
    expect(allclose(result.v_z2, expected, 1e-5)).toBe(true);
  });

  test("test_invalid_types", () => {
    expect(call("bad", 2.0)).toThrow(TypeError);
    expect(call(5.0, "bad")).toThrow(TypeError);
    expect(call(5.0, 2.0, undefined, "bad")).toThrow(TypeError);
  });

  // ValueError is RangeError here (deviation _shared-167).
  test("test_negative_and_zero_values", () => {
    // Negative wind speed
    expect(call(-1.0, 2.0, undefined, undefined, undefined, false)).toThrow(
      RangeError,
    );
    // Negative z2
    expect(call(5.0, -2.0, undefined, undefined, undefined, false)).toThrow(
      RangeError,
    );
    // z0 <= 0
    expect(call(5.0, 2.0, undefined, 0.0, undefined, false)).toThrow(
      RangeError,
    );
    expect(call(5.0, 2.0, undefined, -0.1, undefined, false)).toThrow(
      RangeError,
    );
    // z2 <= d
    expect(call(5.0, 2.0, undefined, undefined, 2.0, false)).toThrow(
      RangeError,
    );
    // z1 <= d
    expect(call(5.0, 2.0, 1.0, undefined, 1.0, false)).toThrow(RangeError);
    // z2 <= z0
    expect(call(5.0, 0.01, undefined, 0.01, undefined, false)).toThrow(
      RangeError,
    );
    // z1 <= z0
    expect(call(5.0, 2.0, 0.01, 0.01, undefined, false)).toThrow(RangeError);
  });

  test("test_edge_case_z2_less_than_z1", () => {
    const v10 = 5.0;
    const z2 = 2.0;
    const z1 = 10.0;
    const result = scale_wind_speed_log(
      v10,
      z2,
      z1,
      undefined,
      undefined,
      false,
    );
    expect(result.v_z2).toBeLessThan(v10);
  });

  test("test_large_and_small_z0", () => {
    const v10 = 5.0;
    const z2 = 2.0;
    // Very small z0
    const result_small = scale_wind_speed_log(
      v10,
      z2,
      undefined,
      1e-6,
      undefined,
      false,
    );
    expect(result_small.v_z2).toBeGreaterThan(0);
    // Very large z0 (should be close to zero wind speed)
    const result_large = scale_wind_speed_log(
      v10,
      z2,
      undefined,
      1.0,
      undefined,
      false,
    );
    expect(result_large.v_z2).toBeGreaterThan(0);
  });

  test.todo(
    "test_legacy_scale_wind_speed_log_shims: tests the deprecated pythermalcomfort.utils path, which the library does not serve (deviation _shared-169)",
  );
});

// What upstream's tests leave out, measured on pythermalcomfort 4.8.1 in the
// parity image (.scratch/v2-release-checks/evidence/scale-wind-speed-log/).
describe("scale_wind_speed_log (JS-only)", () => {
  test.each<[Parameters<typeof scale_wind_speed_log>, number]>([
    [[5.0, 2.0], 3.84],
    [[5.0, 2.0, undefined, undefined, undefined, false], 3.835049992773302],
    [[6.52, 2.0, 10, 0.01, undefined, false], 5.000905190576385],
    [[5.0, 2.0, 10.0, 0.1, 0.5, false], 2.9733458606414125],
    [[5.0, 10.0], 5.0],
    [[0.0, 2.0], 0.0],
    [[5.0, 2.0, 0.0100000000001], 2649158464094.91],
    [[5.0, 2.0, Infinity], 0.0],
    [[Infinity, 2.0], Infinity],
    [[5.0, Infinity], Infinity],
    [[5e-324, 2.0, undefined, undefined, undefined, false], 5e-324],
  ])("scale_wind_speed_log(%j).v_z2 is %s", (args, expected) => {
    const { v_z2 } = scale_wind_speed_log(...args);
    // approx fails on Infinity, which only equality matches.
    expect(approx(v_z2, expected, DEFAULT_TOLERANCE) || v_z2 === expected).toBe(
      true,
    );
  });

  // np.around scales by 100 and rounds half to even: 2.675 × 100 is 267.5,
  // which goes to 268, and 0.125 × 100 is 12.5, which goes to 12.
  test("rounds to two decimals as np.around does", () => {
    expect(scale_wind_speed_log(2.675, 10.0).v_z2).toBe(2.68);
    expect(scale_wind_speed_log(0.125, 10.0).v_z2).toBe(0.12);
  });

  // NaN passes upstream's comparisons and propagates.
  test("a NaN input gives NaN", () => {
    expect(scale_wind_speed_log(NaN, 2.0).v_z2).toBeNaN();
    expect(scale_wind_speed_log(5.0, NaN).v_z2).toBeNaN();
    expect(scale_wind_speed_log(5.0, 2.0, NaN).v_z2).toBeNaN();
    expect(scale_wind_speed_log(5.0, 2.0, undefined, NaN).v_z2).toBeNaN();
    expect(
      scale_wind_speed_log(5.0, 2.0, undefined, undefined, NaN).v_z2,
    ).toBeNaN();
  });

  // Deviation _shared-167.
  test("throws upstream's message as a RangeError, the first check failing", () => {
    for (const [args, message] of [
      [[-1.0, -2.0, 0, 0.0, -1], "Wind speed (v_z1) must be non-negative"],
      [[-Infinity, 2.0], "Wind speed (v_z1) must be non-negative"],
      [
        [5.0, 2.0, undefined, -0.1],
        "Surface roughness length (z0) must be positive ( > 0 )",
      ],
      [
        [5.0, 2.0, undefined, undefined, -0.1],
        "Zero-plane displacement height (d) must be >= 0",
      ],
      [[5.0, 0.0], "Target height (z2) must be positive ( > 0 )"],
      [[5.0, -Infinity], "Target height (z2) must be positive ( > 0 )"],
      [[5.0, 2.0, -1.0], "Reference height (z1) must be positive ( > 0 )"],
      [
        [5.0, 2.0, undefined, 3.0],
        "Target height (z2) must be greater than surface roughness (z0)",
      ],
      [
        [5.0, 2.0, undefined, Infinity],
        "Target height (z2) must be greater than surface roughness (z0)",
      ],
      [
        [5.0, 2.0, 0.01, 0.01],
        "Reference height (z1) must be greater than surface roughness (z0)",
      ],
      [
        [5.0, 2.0, 0.5, undefined, 0.5],
        "Reference height minus displacement (z1 - d) must be > z0",
      ],
      [
        [5.0, 2.0, undefined, undefined, Infinity],
        "Reference height minus displacement (z1 - d) must be > z0",
      ],
      [
        [5.0, 2.0, undefined, undefined, 1.995],
        "Target height minus displacement (z2 - d) must be > z0",
      ],
      [
        [5.0, 2.0, 0.01 + 1e-15, 0.01],
        "Logarithmic denominator log((z1 - d)/z0) is zero or numerically unstable",
      ],
    ] as const) {
      expect(call(...args)).toThrow(new RangeError(message));
    }
  });

  // numpy raises FloatingPointError under np.errstate(divide="raise",
  // invalid="raise", over="raise") (scale_wind_speed_log.py:132), with the
  // operation in its message; deviation _shared-168.
  test("throws numpy's message as a RangeError where upstream's errstate raises", () => {
    for (const [args, message] of [
      [
        [5.0, Infinity, Infinity, undefined, Infinity],
        "invalid value encountered in subtract",
      ],
      [
        [0.0, Infinity, Infinity, undefined, Infinity],
        "invalid value encountered in subtract",
      ],
      [[0.0, Infinity], "invalid value encountered in multiply"],
      [[1e308, 1e10], "overflow encountered in multiply"],
      [
        [5.0, 1e308, undefined, 1e-300, undefined, false],
        "overflow encountered in divide",
      ],
      [
        [5.0, 2.0, 1e308, 1e-300, undefined, false],
        "overflow encountered in divide",
      ],
      [[5.0, Infinity, Infinity], "invalid value encountered in scalar divide"],
      [[Infinity, 2.0, Infinity], "invalid value encountered in scalar divide"],
      [
        [1e300, 1e10, 0.0100000001, undefined, undefined, false],
        "overflow encountered in scalar divide",
      ],
    ] as const) {
      expect(call(...args)).toThrow(new RangeError(message));
    }
  });

  // Upstream checks no type of round_output and rounds on any truthy value
  // ("no" rounds, 0 and None do not); deviation _shared-166.
  test("a round_output that is not a boolean throws TypeError", () => {
    for (const bad of ["no", 0, null]) {
      expect(call(5.0, 2.0, undefined, undefined, undefined, bad)).toThrow(
        new TypeError("round_output must be a boolean."),
      );
    }
  });

  // Upstream's TypeError names Python's types, numpy reads True as 1.0 and
  // None as nan, and a list broadcasts (deviation _shared-163, deviation
  // _shared-164, deviation _shared-165).
  test("an argument that is not a number throws TypeError, naming it", () => {
    for (const bad of ["bad", "5", true, null, [3.0, 5.0], {}]) {
      expect(call(bad, 2.0)).toThrow(new TypeError("v_z1 must be a number."));
      expect(call(5.0, bad)).toThrow(new TypeError("z2 must be a number."));
      expect(call(5.0, 2.0, bad)).toThrow(
        new TypeError("z1 must be a number."),
      );
      expect(call(5.0, 2.0, undefined, bad)).toThrow(
        new TypeError("z0 must be a number."),
      );
      expect(call(5.0, 2.0, undefined, undefined, bad)).toThrow(
        new TypeError("d must be a number."),
      );
    }
    // BaseInputs checks the types in its field order: d, v_z1, z0, z1, z2.
    expect(call("bad", -2.0, undefined, "x")).toThrow(
      new TypeError("v_z1 must be a number."),
    );
    expect(call("bad", 2.0, undefined, undefined, "x")).toThrow(
      new TypeError("d must be a number."),
    );
    expect(call()).toThrow(new TypeError("v_z1 must be a number."));
    expect(call(5.0)).toThrow(new TypeError("z2 must be a number."));
  });

  // Upstream's ScaleWindSpeedLog is a frozen dataclass.
  test("returns a frozen object", () => {
    expect(Object.isFrozen(scale_wind_speed_log(5.0, 2.0))).toBe(true);
  });

  test("is exported from the package root and the default export as from its subpath", () => {
    expect(from_root).toBe(scale_wind_speed_log);
    expect(environment.scale_wind_speed_log).toBe(scale_wind_speed_log);
  });
});
