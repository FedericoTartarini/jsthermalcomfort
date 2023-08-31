import { describe, expect, it } from "@jest/globals";
import {
  body_surface_area,
  v_relative,
  clo_dynamic,
  units_converter,
  running_mean_outdoor_temperature,
  f_svv,
  valid_range,
} from "../../src/utilities/utilities";
import { deep_close_to_array, deep_close_to_obj } from "../test_utilities";

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
    { v: [1.0, 2.0, 3.0], met: 2.0, expected: [1.3, 2.3, 3.3] },
    { v: -1.5, met: 1.5, expected: -1.5 + 0.3 * 0.5 },
  ])(
    "returns $expected when v is $v and met is $met",
    ({ v, met, expected }) => {
      const result = v_relative(v, met);

      if (Array.isArray(v)) deep_close_to_array(result, expected, 4);
      else expect(result).toBeCloseTo(expected, 4);
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
      clo: [1, 1, 2],
      met: [1, 0.5, 0.5],
      standard: "ASHRAE",
      expected: [1, 1, 2],
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
      clo: [1, 1, 1],
      met: [1, 1.2, 2.0],
      standard: undefined,
      expected: [1, 1, 0.8],
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
      const result = clo_dynamic(clo, met, standard);
      if (Array.isArray(clo)) deep_close_to_array(result, expected, tolerance);
      else expect(result).toBeCloseTo(expected, tolerance);
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
      deep_close_to_obj(result, expected, 2);
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
      expected: [20, 30, 40, 50],
    },
    {
      range: [1, 2, 3, 4, 5, 6],
      valid: [2, 5],
      expected: [2, 3, 4, 5],
    },
  ])(
    "returns $expected when valid is $valid and range is $range",
    ({ range, valid, expected }) => {
      const result = valid_range(range, valid);
      expect(result).toStrictEqual(expected);
    },
  );
});
