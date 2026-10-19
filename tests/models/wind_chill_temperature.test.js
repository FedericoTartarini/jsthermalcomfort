import { describe, expect, test } from "@jest/globals";
import { wind_chill_temperature } from "../../src/models/wind_chill_temperature.js";
import { loadTestData, validateResult } from "./testUtils.js";

// Match pythermalcomfort 4.5.0's pinned validation dataset.
const { testData, tolerances } = await loadTestData(
  "https://raw.githubusercontent.com/FedericoTartarini/validation-data-comfort-models/v1.0.0/ts_wind_chill_temperature.json",
  true,
);

describe("test_wind_chill_temperature", () => {
  test.each(testData.data)("Test case #%#", ({ inputs, outputs }) => {
    const { tdb, v, round_output } = inputs;
    validateResult(
      wind_chill_temperature(tdb, v, round_output),
      outputs,
      tolerances,
      inputs,
    );
  });
});

describe("TestWct", () => {
  test("test_wct_single_float_inputs", () => {
    const result = wind_chill_temperature(-5.0, 5.5);
    expect(typeof result.wct).toBe("number");
    expect(result.wct).toBe(-7.5);
  });
  test("test_wct_empty_lists", () => {
    expect(wind_chill_temperature([], []).wct).toEqual([]);
  });
  test("test_wct_list_inputs", () => {
    expect(
      wind_chill_temperature([-5.0, -10.0], [5.5, 10.0], true).wct,
    ).toEqual([-7.5, -15.3]);
  });
  test("test_wct_round_output_false_returns_unrounded", () => {
    const result = wind_chill_temperature(-5.0, 5.5, false);
    const expected =
      13.12 + 0.6215 * -5.0 - 11.37 * 5.5 ** 0.16 + 0.3965 * -5.0 * 5.5 ** 0.16;
    expect(Math.abs(result.wct - expected)).toBeLessThan(1e-9);
    expect(result.wct).not.toBe(-7.5);
  });
  test("test_wct_non_numeric_inputs", () => {
    expect(() => wind_chill_temperature("invalid", 5.5)).toThrow(TypeError);
    expect(() => wind_chill_temperature(-5.0, "invalid")).toThrow(TypeError);
    expect(() => wind_chill_temperature("invalid", "invalid")).toThrow(
      TypeError,
    );
  });
});

describe("NumPy parity edge cases", () => {
  test.each([
    [[-5, -10], 5.5],
    [-5, [5.5, 10]],
    [[-5, -10], [5.5]],
    [[-5], [5.5, 10]],
  ])("broadcasts %j and %j", (tdb, v) => {
    const temperatures = Array.isArray(tdb) ? tdb : [tdb];
    const speeds = Array.isArray(v) ? v : [v];
    const expected = [0, 1].map(
      (i) =>
        wind_chill_temperature(
          temperatures[i % temperatures.length],
          speeds[i % speeds.length],
          false,
        ).wct,
    );
    expect(wind_chill_temperature(tdb, v, false).wct).toEqual(expected);
  });
  test("broadcasts trailing dimensions", () => {
    expect(wind_chill_temperature([[-5], [-10]], [5.5, 10]).wct).toEqual([
      [wind_chill_temperature(-5, 5.5).wct, wind_chill_temperature(-5, 10).wct],
      [
        wind_chill_temperature(-10, 5.5).wct,
        wind_chill_temperature(-10, 10).wct,
      ],
    ]);
  });
  test.each([
    [[], 5.5],
    [-5, []],
    [[], [5.5]],
    [[-5], []],
  ])("broadcasts empty inputs %j %j", (tdb, v) => {
    expect(wind_chill_temperature(tdb, v).wct).toEqual([]);
  });
  test("rejects incompatible and ragged shapes", () => {
    expect(() => wind_chill_temperature([-5, -10], [1, 2, 3])).toThrow(
      RangeError,
    );
    expect(() => wind_chill_temperature([[-5], [-10, -15]], 5)).toThrow(
      RangeError,
    );
  });
  test("rejects nonnumeric array elements and invalid rounding flags", () => {
    expect(() => wind_chill_temperature([-5, "bad"], 5)).toThrow(TypeError);
    expect(() => wind_chill_temperature(-5, 5, "true")).toThrow(TypeError);
  });
  test("propagates NaN like NumPy", () => {
    expect(wind_chill_temperature(NaN, 5).wct).toBeNaN();
    expect(wind_chill_temperature(-5, -1).wct).toBeNaN();
  });
  test("rounds halfway values to even like NumPy", () => {
    expect(wind_chill_temperature(0.4911591355599212, 1, false).wct).toBe(2.25);
    expect(wind_chill_temperature(0.4911591355599212, 1).wct).toBe(2.2);
  });
});
