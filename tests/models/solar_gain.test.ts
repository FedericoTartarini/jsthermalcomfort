import { describe, expect, test } from "@jest/globals";
import { solar_gain, SOLAR_GAIN_LIMITS } from "../../src/models/solar_gain.ts";
import type { SolarGainParams } from "../../src/models/solar_gain.ts";
import { testDataUrls } from "./comftest.ts";
import { loadTestData, validateResult } from "./testUtils.ts";

let { testData, tolerances } = await loadTestData(testDataUrls.solarGain);

// Mirrors pythermalcomfort v4.6.1 tests/test_solar_gain.py.
describe("test_solar_gain", () => {
  test.each(testData.data)("test_solar_gain: fixture case %#", (row) => {
    const { inputs, outputs } = row;
    // As upstream, `solar_gain(**inputs)`.
    const result = solar_gain(inputs as unknown as SolarGainParams);

    validateResult(result, outputs, tolerances, inputs);
  });

  test("test_solar_gain_regression_values", () => {
    const cases: [
      number,
      number,
      number,
      number,
      number,
      number,
      string,
      number,
      number,
    ][] = [
      [0, 120, 800, 0.5, 0.5, 0.5, "sitting", 43.2839, 10.3649],
      [30, 60, 600, 0.6, 0.4, 0.6, "standing", 52.8099, 12.1402],
      [45, 90, 500, 0.7, 0.3, 0.7, "supine", 49.548, 11.3904],
      [90, 0, 1000, 1.0, 1.0, 1.0, "sitting", 326.6804, 78.2281],
      [15, 165, 250, 0.2, 0.1, 0.9, "standing", 8.9043, 2.047],
    ];
    for (const [
      alt,
      sharp,
      rad,
      trans,
      svv,
      bes,
      posture,
      exp_erf,
      exp_d_mrt,
    ] of cases) {
      const result = solar_gain({
        sol_altitude: alt,
        sharp,
        sol_radiation_dir: rad,
        sol_transmittance: trans,
        f_svv: svv,
        f_bes: bes,
        posture: posture as SolarGainParams["posture"],
        round_output: false,
      });
      // np.isclose(..., atol=1e-3)
      expect(Math.abs(result.erf - exp_erf)).toBeLessThanOrEqual(1e-3);
      expect(Math.abs(result.delta_mrt - exp_d_mrt)).toBeLessThanOrEqual(1e-3);
    }
  });

  test("test_solar_gain_out_of_range_returns_nan", () => {
    const common = {
      sol_radiation_dir: 800,
      sol_transmittance: 0.5,
      f_svv: 0.5,
      f_bes: 0.5,
    };
    // pytest.warns(UserWarning, match="sol_altitude") becomes the row.
    let result = solar_gain({ sol_altitude: 200, sharp: 90, ...common });
    expect(result.warnings.map(({ key }) => key)).toEqual(["sol_altitude"]);
    expect(result.erf).toBeNaN();
    expect(result.delta_mrt).toBeNaN();

    result = solar_gain({ sol_altitude: 45, sharp: 300, ...common });
    expect(result.warnings.map(({ key }) => key)).toEqual(["sharp"]);
    expect(result.erf).toBeNaN();
    expect(result.delta_mrt).toBeNaN();

    // mixed valid/invalid array, element-wise: only the invalid element
    // becomes NaN
    const valid = solar_gain({ sol_altitude: 45, sharp: 90, ...common });
    const invalid = solar_gain({ sol_altitude: 200, sharp: 90, ...common });
    expect(valid.erf).not.toBeNaN();
    expect(invalid.warnings.map(({ key }) => key)).toEqual(["sol_altitude"]);
    expect(invalid.erf).toBeNaN();
  });

  test.todo(
    "test_solar_gain_array: upstream's np.allclose is never asserted, and its expected erf [46.4, 52.8] is not what solar_gain returns for those inputs (43.3 and 53.9; upstream's own regression test pins 43.2839 for the first), so a mirror with the same values would fail",
  );
});

describe("solar_gain (JS-only)", () => {
  const base: SolarGainParams = {
    sol_altitude: 0,
    sharp: 120,
    sol_radiation_dir: 800,
    sol_transmittance: 0.5,
    f_svv: 0.5,
    f_bes: 0.5,
  };

  test("an in-range call has no warnings rows", () => {
    expect(solar_gain(base)).toEqual({
      erf: 43.3,
      delta_mrt: 10.4,
      warnings: [],
    });
  });

  test("round_output rounds both outputs to one decimal, and only then", () => {
    const rounded = solar_gain(base);
    const unrounded = solar_gain({ ...base, round_output: false });
    expect(unrounded.erf).not.toBe(rounded.erf);
    expect(unrounded.delta_mrt).not.toBe(rounded.delta_mrt);
    expect(Math.round(unrounded.erf * 10) / 10).toBe(rounded.erf);
    expect(Math.round(unrounded.delta_mrt * 10) / 10).toBe(rounded.delta_mrt);
  });

  // ASHRAE 55 Table C-2's range, which upstream does not check: the row is
  // reported and the number is still upstream's.
  test("sol_radiation_dir below Table C-2's range adds a row and computes", () => {
    const result = solar_gain({ ...base, sol_radiation_dir: 150 });
    expect(result.warnings).toEqual([
      {
        key: "sol_radiation_dir",
        role: "input",
        value: 150,
        bound: SOLAR_GAIN_LIMITS.sol_radiation_dir,
      },
    ]);
    expect(result.warnings[0].bound).toBe(SOLAR_GAIN_LIMITS.sol_radiation_dir);
    expect(Number.isFinite(result.erf)).toBe(true);
    expect(Number.isFinite(result.delta_mrt)).toBe(true);
  });

  test("asw above Table C-2's range adds a row and computes", () => {
    const result = solar_gain({ ...base, asw: 0.95 });
    expect(result.warnings).toEqual([
      {
        key: "asw",
        role: "input",
        value: 0.95,
        bound: SOLAR_GAIN_LIMITS.asw,
      },
    ]);
    // erf is linear in asw, so the number is upstream's formula unchanged.
    const at_default = solar_gain({ ...base, round_output: false });
    const at_095 = solar_gain({ ...base, asw: 0.95, round_output: false });
    expect(at_095.erf).toBeCloseTo((at_default.erf * 0.95) / 0.7, 10);
  });

  test("sol_altitude of 95 returns NaN with a row", () => {
    const result = solar_gain({ ...base, sol_altitude: 95 });
    expect(result.erf).toBeNaN();
    expect(result.delta_mrt).toBeNaN();
    expect(result.warnings).toEqual([
      {
        key: "sol_altitude",
        role: "input",
        value: 95,
        bound: SOLAR_GAIN_LIMITS.sol_altitude,
      },
    ]);
  });

  test("every broken range has its own row", () => {
    const result = solar_gain({
      ...base,
      sol_altitude: -1,
      sharp: 181,
      sol_radiation_dir: 1001,
      asw: 0.1,
    });
    expect(result.warnings.map(({ key }) => key)).toEqual([
      "sol_altitude",
      "sharp",
      "sol_radiation_dir",
      "asw",
    ]);
    expect(result.erf).toBeNaN();
    expect(result.delta_mrt).toBeNaN();
  });

  test("the four limits' ends are inside the range", () => {
    const result = solar_gain({
      ...base,
      sol_altitude: 90,
      sharp: 180,
      sol_radiation_dir: 1000,
      asw: 0.2,
    });
    expect(result.warnings).toEqual([]);
    expect(Number.isFinite(result.erf)).toBe(true);
  });

  // The positional parameters before v2 (ADR 0002). A call still written
  // that way throws rather than running on anything else.
  test("throws TypeError if called positionally", () => {
    // @ts-expect-error the function takes one params object
    expect(() => solar_gain(0, 120, 800, 0.5, 0.5, 0.5)).toThrow(TypeError);
    // @ts-expect-error null is not a params object
    expect(() => solar_gain(null)).toThrow(TypeError);
    // @ts-expect-error the params object is required
    expect(() => solar_gain()).toThrow(TypeError);
  });

  // ADR 0001: a non-finite number throws rather than propagating as NaN.
  test("throws TypeError if a number is not finite", () => {
    for (const bad of [NaN, Infinity, -Infinity]) {
      expect(() => solar_gain({ ...base, sol_altitude: bad })).toThrow(
        TypeError,
      );
      expect(() => solar_gain({ ...base, floor_reflectance: bad })).toThrow(
        TypeError,
      );
    }
  });

  test("throws Error if posture is not one of the three", () => {
    expect(() =>
      // @ts-expect-error posture is "sitting", "standing" or "supine"
      solar_gain({ ...base, posture: "lying" }),
    ).toThrow("Posture has to be either 'standing', 'supine' or 'sitting'.");
  });

  test("posture is case-insensitive, as upstream", () => {
    expect(
      // @ts-expect-error the type lists the lower-case strings
      solar_gain({ ...base, posture: "Standing" }),
    ).toEqual(solar_gain({ ...base, posture: "standing" }));
  });

  test("a default passed as undefined takes its default", () => {
    expect(
      solar_gain({
        ...base,
        asw: undefined,
        posture: undefined,
        floor_reflectance: undefined,
        round_output: undefined,
      }),
    ).toEqual(solar_gain(base));
  });
});
