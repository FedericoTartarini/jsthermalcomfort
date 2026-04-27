import { describe, expect, it, test } from "@jest/globals";
import {
  body_surface_area,
  v_relative,
  clo_dynamic,
  units_converter,
  running_mean_outdoor_temperature,
  f_svv,
  valid_range,
  clo_typical_ensembles,
  transpose_sharp_altitude,
  assertNumber,
  validateInputs,
  check_standard_compliance,
} from "../../src/utilities/utilities";
import { deep_close_to_array, deep_close_to_obj } from "../test_utilities";

const DEFAULT_TOLERANCE = 0.01;

describe("transpose_sharp_altitude", () => {
  it.each([
    { sharp: 0, altitude: 0, expected: [0, 90] },
    { sharp: 0, altitude: 20, expected: [0, 70] },
    { sharp: 0, altitude: 45, expected: [0, 45] },
    { sharp: 0, altitude: 60, expected: [0, 30] },
    { sharp: 90, altitude: 0, expected: [90, 0] },
    { sharp: 90, altitude: 45, expected: [45, 0] },
    { sharp: 90, altitude: 30, expected: [60, 0] },
    { sharp: 135, altitude: 60, expected: [22.208, 20.705] },
    { sharp: 120, altitude: 75, expected: [13.064, 7.435] },
    { sharp: 150, altitude: 30, expected: [40.893, 48.59] },
  ])(
    "returns $expected when sharp is $sharp and altitude is $altitude",
    ({ sharp, altitude, expected }) => {
      const result = transpose_sharp_altitude(sharp, altitude);
      deep_close_to_array(result, expected, 0.001);
    },
  );
});

describe("body_surface_area", () => {
  it.each([
    { weight: 80, height: 1.8, formula: undefined, expected: 1.9917 },
    { weight: 70, height: 1.8, formula: "dubois", expected: 1.88 },
    { weight: 75, height: 1.75, formula: "takahira", expected: 1.919 },
    { weight: 80, height: 1.7, formula: "fujimoto", expected: 1.872 },
    { weight: 85, height: 1.65, formula: "kurazumi", expected: 1.89 },
  ])(
    "returns $expected when weight is $weight, height is $height and formula is $formula",
    ({ weight, height, formula, expected }) => {
      const result = body_surface_area(weight, height, formula);
      expect(Math.abs(result - expected)).toBeLessThanOrEqual(
        DEFAULT_TOLERANCE,
      );
    },
  );

  it("throws an error if the formula is not valid", () => {
    expect(() => body_surface_area(70, 1.8, "invalid_formula")).toThrow();
  });
});

describe("v_relative", () => {
  it.each([
    { v: 2.0, met: 1.0, expected: 2.0 },
    { v: -1.5, met: 1.5, expected: -1.5 + 0.3 * 0.5 },
  ])(
    "returns $expected when v is $v and met is $met",
    ({ v, met, expected }) => {
      const result = v_relative(v, met);
      // Tolerance is manually defined because v_relative is not in the shared reference data
      expect(Math.abs(result - expected)).toBeLessThanOrEqual(0.0001);
    },
  );
});

describe("clo_dynamic", () => {
  it.each([
    {
      clo: 1,
      met: 1,
      standard: "ASHRAE",
      expected: 1,
      tolerance: 4,
    },
    {
      clo: 1,
      met: 0.5,
      standard: "ASHRAE",
      expected: 1,
      tolerance: 4,
    },
    {
      clo: 2,
      met: 0.5,
      standard: "ASHRAE",
      expected: 2,
      tolerance: 4,
    },
    {
      clo: 1,
      met: 1,
      standard: undefined,
      expected: 1,
      tolerance: 4,
    },
    {
      clo: 1,
      met: 1.2,
      standard: undefined,
      expected: 1,
      tolerance: 4,
    },
    {
      clo: 1,
      met: 2.0,
      standard: undefined,
      expected: 0.8,
      tolerance: 4,
    },
    {
      clo: 1.0,
      met: 1.0,
      standard: "ISO",
      expected: 1,
      tolerance: 4,
    },
    {
      clo: 1.0,
      met: 2.0,
      standard: "ISO",
      expected: 0.8,
      tolerance: 4,
    },
  ])(
    "returns $expected when clo is $clo, met is $met, and the standard is $standard",
    ({ clo, met, standard, expected, tolerance }) => {
      const result = clo_dynamic(clo, met, standard);
      const absTol = Math.pow(10, -tolerance);
      expect(Math.abs(result - expected)).toBeLessThanOrEqual(absTol);
    },
  );

  it("throws an error when standard is invalid", () => {
    expect(() => clo_dynamic(1.0, 1.0, "invalid")).toThrow();
  });
});

describe("units_converter", () => {
  it.each([
    {
      args: {
        tdb: 77,
        tr: 77,
        v: 3.2,
      },
      from_units: "IP",
      expected: {
        tdb: 25.0,
        tr: 25.0,
        v: 0.975312,
      },
    },
    {
      args: {
        pressure: 1,
        area: 1 / 0.09,
      },
      from_units: "IP",
      expected: {
        pressure: 101325,
        area: 1.03224,
      },
    },
    {
      args: {
        tdb: 77,
        v: 10,
      },
      from_units: "IP",
      expected: {
        tdb: 25.0,
        v: 3.047,
      },
    },
    {
      args: {
        tdb: 20,
        v: 2,
      },
      from_units: "SI",
      expected: {
        tdb: 68,
        v: 6.562,
      },
    },
    {
      args: {
        area: 100,
        pressure: 14.7,
      },
      from_units: "IP",
      expected: {
        area: 9.29,
        pressure: 1489477.5,
      },
    },
    {
      args: {
        area: 50,
        pressure: 101325,
      },
      from_units: "SI",
      expected: {
        area: 538.199,
        pressure: 1,
      },
    },
  ])(
    "returns $expected when args are $args and from_units is $from_units",
    ({ args, from_units, expected }) => {
      const result = units_converter(args, from_units);
      deep_close_to_obj(result, expected, DEFAULT_TOLERANCE);
    },
  );
});

describe("running_mean_outdoor_temperature", () => {
  it.each([
    {
      temp_array: [20, 20],
      alpha: 0.7,
      from_units: undefined,
      expected: 20,
    },
    {
      temp_array: [20, 20],
      alpha: 0.9,
      from_units: undefined,
      expected: 20,
    },
    {
      temp_array: [20, 20, 20, 20],
      alpha: 0.7,
      from_units: undefined,
      expected: 20,
    },
    {
      temp_array: [20, 20, 20, 20],
      alpha: 0.5,
      from_units: undefined,
      expected: 20,
    },
    {
      temp_array: [77, 77, 77, 77, 77, 77, 77],
      alpha: 0.8,
      from_units: "IP",
      expected: 77,
    },
  ])(
    "returns $expected when temp_array is $temp_array, alpha is $alpha and from_units is $from_units",
    ({ temp_array, alpha, from_units, expected }) => {
      const result = running_mean_outdoor_temperature(
        temp_array,
        alpha,
        from_units,
      );

      expect(Math.abs(result - expected)).toBeLessThanOrEqual(
        DEFAULT_TOLERANCE,
      );
    },
  );
});

describe("f_svv", () => {
  it.each([
    { width: 30, height: 10, distance: 3.3, expected: 0.27 },
    { width: 150, height: 10, distance: 3.3, expected: 0.31 },
    { width: 30, height: 6, distance: 3.3, expected: 0.2 },
    { width: 150, height: 6, distance: 3.3, expected: 0.23 },
    { width: 30, height: 10, distance: 6, expected: 0.17 },
    { width: 150, height: 10, distance: 6, expected: 0.21 },
    { width: 30, height: 6, distance: 6, expected: 0.11 },
    { width: 150, height: 6, distance: 6, expected: 0.14 },
    { width: 6, height: 9, distance: 3.3, expected: 0.14 },
    { width: 6, height: 6, distance: 3.3, expected: 0.11 },
    { width: 6, height: 6, distance: 6, expected: 0.04 },
    { width: 4, height: 4, distance: 3.3, expected: 0.06 },
    { width: 4, height: 4, distance: 6, expected: 0.02 },
  ])(
    "resturns $expected when width is $width, height is $height and distance is $distance",
    ({ width, height, distance, expected }) => {
      const result = f_svv(width, height, distance);

      expect(Math.abs(result - expected)).toBeLessThanOrEqual(
        DEFAULT_TOLERANCE,
      );
    },
  );
});

describe("valid_range", () => {
  it.each([
    {
      range: [10, 20, 30, 40, 50, 60],
      valid: [15, 55],
      expected: [NaN, 20, 30, 40, 50, NaN],
    },
    {
      range: [1, 2, 3, 4, 5, 6],
      valid: [2, 5],
      expected: [NaN, 2, 3, 4, 5, NaN],
    },
  ])(
    "returns $expected when valid is $valid and range is $range",
    ({ range, valid, expected }) => {
      const result = valid_range(range, valid);
      expect(result).toStrictEqual(expected);
    },
  );
});

describe("clo_typical_ensembles", () => {
  it.each([
    { ensembles: "Walking shorts, short-sleeve shirt", expected: 0.36 },
    { ensembles: "Trousers, long-sleeve shirt", expected: 0.61 },
    { ensembles: "Sweat pants, long-sleeve sweatshirt", expected: 0.74 },
    { ensembles: "Typical winter indoor clothing", expected: 1.0 },
  ])(
    "returns $expected when ensemble is $ensembles",
    ({ ensembles, expected }) => {
      const result = clo_typical_ensembles(ensembles);
      expect(Math.abs(result - expected)).toBeLessThanOrEqual(
        DEFAULT_TOLERANCE,
      );
    },
  );

  it("throws an error if the ensemble is not valid", () => {
    expect(() =>
      clo_typical_ensembles("Sweet pants, short-sleeve shirt"),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// assertNumber
// ---------------------------------------------------------------------------
describe("assertNumber", () => {
  test.each(["25", true, null, undefined, NaN, Infinity, -Infinity])(
    "throws TypeError for %s",
    (value) => {
      expect(() => assertNumber(value, "x")).toThrow(TypeError);
    },
  );

  test("does not throw for a valid finite number", () => {
    expect(() => assertNumber(25, "x")).not.toThrow();
    expect(() => assertNumber(-10.5, "x")).not.toThrow();
    expect(() => assertNumber(0, "x")).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// validateInputs
// ---------------------------------------------------------------------------
describe("validateInputs", () => {
  describe("type: number", () => {
    test("throws TypeError when a required number param receives a string", () => {
      expect(() =>
        validateInputs({ tdb: "25" }, { tdb: { type: "number" } }),
      ).toThrow(TypeError);
    });

    test("does not throw for a valid number", () => {
      expect(() =>
        validateInputs({ tdb: 25 }, { tdb: { type: "number" } }),
      ).not.toThrow();
    });
  });

  describe("type: boolean", () => {
    test("throws TypeError when a boolean param receives a string", () => {
      expect(() =>
        validateInputs(
          { limit_inputs: "true" },
          { limit_inputs: { type: "boolean" } },
        ),
      ).toThrow(TypeError);
    });

    test("does not throw for a valid boolean", () => {
      expect(() =>
        validateInputs(
          { limit_inputs: true },
          { limit_inputs: { type: "boolean" } },
        ),
      ).not.toThrow();
    });
  });

  describe("enum", () => {
    test("throws Error when value is not in the enum list", () => {
      expect(() =>
        validateInputs({ units: "INVALID" }, { units: { enum: ["SI", "IP"] } }),
      ).toThrow(Error);
    });

    test("does not throw for a valid enum value", () => {
      expect(() =>
        validateInputs({ units: "SI" }, { units: { enum: ["SI", "IP"] } }),
      ).not.toThrow();
    });
  });

  describe("required: false", () => {
    test("skips validation when value is undefined", () => {
      expect(() =>
        validateInputs(
          { w_max: undefined },
          { w_max: { type: "number", required: false } },
        ),
      ).not.toThrow();
    });

    test("still validates type when value is defined", () => {
      expect(() =>
        validateInputs(
          { w_max: "0.5" },
          { w_max: { type: "number", required: false } },
        ),
      ).toThrow(TypeError);
    });
  });

  describe("multiple params", () => {
    test("throws on the first invalid param encountered", () => {
      expect(() =>
        validateInputs(
          { tdb: "25", tr: 25 },
          { tdb: { type: "number" }, tr: { type: "number" } },
        ),
      ).toThrow(TypeError);
    });

    test("does not throw when all params are valid", () => {
      expect(() =>
        validateInputs(
          { tdb: 25, tr: 30, units: "SI" },
          {
            tdb: { type: "number" },
            tr: { type: "number" },
            units: { enum: ["SI", "IP"] },
          },
        ),
      ).not.toThrow();
    });
  });
});

describe("check_standard_compliance", () => {
  describe("ASHRAE airspeed_control branch", () => {
    it("flags v > 0.8 with low clo and met when occupant has no airspeed control", () => {
      const warnings = check_standard_compliance("ASHRAE", {
        tdb: 26,
        tr: 26,
        v: 1.0,
        met: 1.2,
        clo: 0.5,
        airspeed_control: false,
      });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it("flags v above the operative-temperature limit when 23 < to < 25.5", () => {
      const warnings = check_standard_compliance("ASHRAE", {
        tdb: 24,
        tr: 24,
        v: 0.4,
        met: 1.2,
        clo: 0.5,
        airspeed_control: false,
      });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it("flags v > 0.2 when to <= 23 with low clo and met", () => {
      const warnings = check_standard_compliance("ASHRAE", {
        tdb: 20,
        tr: 20,
        v: 0.5,
        met: 1.2,
        clo: 0.5,
        airspeed_control: false,
      });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it("does not flag the same inputs when airspeed_control is true", () => {
      const warnings = check_standard_compliance("ASHRAE", {
        tdb: 26,
        tr: 26,
        v: 1.0,
        met: 1.2,
        clo: 0.5,
        airspeed_control: true,
      });
      expect(warnings).toHaveLength(0);
    });
  });

  describe("FAN_HEATWAVES branch", () => {
    const valid = { tdb: 30, tr: 30, v: 1, rh: 50, met: 1, clo: 0.5 };

    it.each([
      { field: "tdb", value: 51 },
      { field: "tr", value: 19 },
      { field: "v", value: 5 },
      { field: "rh", value: 101 },
      { field: "met", value: 0.5 },
      { field: "clo", value: 1.5 },
    ])("flags an out-of-range $field of $value", ({ field, value }) => {
      const kwargs = { ...valid, [field]: value };
      const warnings = check_standard_compliance("FAN_HEATWAVES", kwargs);
      expect(warnings.length).toBeGreaterThan(0);
    });

    it("returns no warnings when all fields are within range", () => {
      const warnings = check_standard_compliance("FAN_HEATWAVES", valid);
      expect(warnings).toHaveLength(0);
    });
  });

  describe("ISO branch v range check", () => {
    it("returns no warnings when v is within [0, 1]", () => {
      const warnings = check_standard_compliance("ISO", {
        tdb: 25,
        tr: 25,
        v: 0.1,
        met: 1.2,
        clo: 0.5,
      });
      expect(warnings).toHaveLength(0);
    });

    it("flags v above 1 m/s", () => {
      const warnings = check_standard_compliance("ISO", {
        tdb: 25,
        tr: 25,
        v: 1.5,
        met: 1.2,
        clo: 0.5,
      });
      expect(warnings.length).toBeGreaterThan(0);
    });
  });
});
