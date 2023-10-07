import { describe, expect, it } from "@jest/globals";
import {
  body_surface_area,
  v_relative,
  clo_dynamic,
  clo_dynamic_array,
  units_converter,
  units_converter_array,
  running_mean_outdoor_temperature,
  f_svv,
  valid_range,
  check_standard_compliance_array,
  v_relative_array,
  clo_typical_ensembles,
  transpose_sharp_altitude,
} from "../../src/utilities/utilities";
import {
  deep_close_to_array,
  deep_close_to_obj,
  deep_close_to_obj_arrays,
} from "../test_utilities";

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
      deep_close_to_array(result, expected, 0);
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

      expect(result).toBeCloseTo(expected, 2);
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
      expect(result).toBeCloseTo(expected, 4);
    },
  );
});

describe("v_relative_array", () => {
  it.each([{ v: [1.0, 2.0, 3.0], met: 2.0, expected: [1.3, 2.3, 3.3] }])(
    "returns $expected when v is $v and met is $met",
    ({ v, met, expected }) => {
      const result = v_relative_array(v, met);
      deep_close_to_array(result, expected, 4);
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
      expect(result).toBeCloseTo(expected, tolerance);
    },
  );

  it("throws an error when standard is invalid", () => {
    expect(() => clo_dynamic(1.0, 1.0, "invalid")).toThrow();
  });
});

describe("clo_dynamic_array", () => {
  it.each([
    {
      clo: [1, 1, 2],
      met: [1, 0.5, 0.5],
      standard: "ASHRAE",
      expected: [1, 1, 2],
      tolerance: 4,
    },
    {
      clo: [1, 1, 1],
      met: [1, 1.2, 2.0],
      standard: undefined,
      expected: [1, 1, 0.8],
      tolerance: 4,
    },
    {
      clo: [1.0, 1.0],
      met: [1.0, 2.0],
      standard: "ISO",
      expected: [1, 0.8],
      tolerance: 4,
    },
  ])(
    "returns $expected when clo is $clo, met is $met, and the standard is $standard",
    ({ clo, met, standard, expected, tolerance }) => {
      const result = clo_dynamic_array(clo, met, standard);
      deep_close_to_array(result, expected, tolerance);
    },
  );

  it("throws an error when standard is invalid", () => {
    expect(() => clo_dynamic_array([1.0], [1.0], "invalid")).toThrow();
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
      deep_close_to_obj(result, expected, 2);
    },
  );
});

describe("units_converter_array", () => {
  it.each([
    {
      args: {
        tdb: [77],
        tr: [77],
        v: [3.2],
      },
      from_units: "IP",
      expected: {
        tdb: [25.0],
        tr: [25.0],
        v: [0.975312],
      },
    },
    {
      args: {
        pressure: [1],
        area: [1 / 0.09],
      },
      from_units: "IP",
      expected: {
        pressure: [101325],
        area: [1.03224],
      },
    },
    {
      args: {
        tdb: [77],
        v: [10],
      },
      from_units: "IP",
      expected: {
        tdb: [25.0],
        v: [3.047],
      },
    },
    {
      args: {
        tdb: [20],
        v: [2],
      },
      from_units: "SI",
      expected: {
        tdb: [68],
        v: [6.562],
      },
    },
    {
      args: {
        area: [100],
        pressure: [14.7],
      },
      from_units: "IP",
      expected: {
        area: [9.29],
        pressure: [1489477.5],
      },
    },
    {
      args: {
        area: [50],
        pressure: [101325],
      },
      from_units: "SI",
      expected: {
        area: [538.199],
        pressure: [1],
      },
    },
  ])(
    "returns $expected when args are $args and from_units is $from_units",
    ({ args, from_units, expected }) => {
      const result = units_converter_array(args, from_units);
      deep_close_to_obj_arrays(result, expected, 2);
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

      expect(result).toBeCloseTo(expected, 1);
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

      expect(result).toBeCloseTo(expected, 2);
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

describe("check_standard_compliance_array", () => {
  it.each([
    {
      standard: "FAN_HEATWAVES",
      kwargs: {
        tdb: [15, 30, 60],
        tr: [15, 30, 60],
        v: [0, 2, 5],
        rh: [-1, 50, 150],
        met: [0, 1, 3],
        clo: [-1, 0.5, 2],
      },
      expected: {
        tdb: [NaN, 30, NaN],
        tr: [NaN, 30, NaN],
        v: [NaN, 2, NaN],
        rh: [NaN, 50, NaN],
        met: [NaN, 1, NaN],
        clo: [NaN, 0.5, NaN],
      },
    },
    {
      standard: "ISO",
      kwargs: {
        tdb: [9, 20, 31],
        tr: [9, 25, 41],
        v: [-1, 0.5, 1.1],
        met: [0.7, 0.9, 4.1],
        clo: [-1, 0.5, 2.1],
      },
      expected: {
        tdb: [NaN, 20, NaN],
        tr: [NaN, 25, NaN],
        v: [NaN, 0.5, NaN],
        met: [NaN, 0.9, NaN],
        clo: [NaN, 0.5, NaN],
      },
    },
    {
      standard: "ASHRAE",
      kwargs: {
        tdb: [9, 20, 41],
        tr: [9, 25, 41],
        v: [-1, 0.5, 2.1],
        met: [0.9, 3, 4.1],
        clo: [-1, 0.5, 1.6],
      },
      expected: {
        tdb: [NaN, 20, NaN],
        tr: [NaN, 25, NaN],
        v: [NaN, 0.5, NaN],
        met: [NaN, 3, NaN],
        clo: [NaN, 0.5, NaN],
      },
    },
    {
      standard: "ASHRAE",
      kwargs: {
        tdb: [9, 20, 41],
        tr: [9, 25, 41],
        v: [-1, 0.9, 2.1],
        met: [0.9, 1.2, 4.1],
        clo: [-1, 0.5, 1.6],
        airspeed_control: false,
      },
      expected: {
        tdb: [NaN, 20, NaN],
        tr: [NaN, 25, NaN],
        v: [NaN, NaN, NaN],
        met: [NaN, 1.2, NaN],
        clo: [NaN, 0.5, NaN],
      },
    },
    {
      standard: "ASHRAE",
      kwargs: {
        tdb: [9, 20, 41],
        tr: [9, 25, 41],
        v: [-1, 0.3, 2.1],
        met: [0.9, 1.2, 4.1],
        clo: [-1, 0.5, 1.6],
        airspeed_control: false,
      },
      expected: {
        tdb: [NaN, 20, NaN],
        tr: [NaN, 25, NaN],
        v: [NaN, NaN, NaN],
        met: [NaN, 1.2, NaN],
        clo: [NaN, 0.5, NaN],
      },
    },
    {
      standard: "ASHRAE",
      kwargs: {
        tdb: [9, 20, 41],
        tr: [9, 39, 41],
        v: [-1, 0.9, 2.1],
        met: [0.9, 1.2, 4.1],
        clo: [-1, 0.5, 1.6],
        airspeed_control: false,
      },
      expected: {
        tdb: [NaN, 20, NaN],
        tr: [NaN, 39, NaN],
        v: [NaN, NaN, NaN],
        met: [NaN, 1.2, NaN],
        clo: [NaN, 0.5, NaN],
      },
    },
    {
      standard: "ASHRAE",
      kwargs: {
        tdb: [9, 20, 41],
        tr: [9, 25, 41],
        v: [-1, 0.9, 2.1],
        met: [0.9, 1.2, 4.1],
        clo: [-1, 0.8, 1.6],
        airspeed_control: false,
      },
      expected: {
        tdb: [NaN, 20, NaN],
        tr: [NaN, 25, NaN],
        v: [NaN, 0.9, NaN],
        met: [NaN, 1.2, NaN],
        clo: [NaN, 0.8, NaN],
      },
    },
  ])(
    "returns $expected when standard is $standard and kwargs is $kwargs",
    ({ standard, kwargs, expected }) => {
      const result = check_standard_compliance_array(standard, kwargs);
      deep_close_to_obj_arrays(result, expected, 2);
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
      expect(result).toBeCloseTo(expected, 2);
    },
  );

  it("throws an error if the ensemble is not valid", () => {
    expect(() =>
      clo_typical_ensembles("Sweet pants, short-sleeve shirt"),
    ).toThrow();
  });
});
