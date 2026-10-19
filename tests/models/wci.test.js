import { describe, expect, test } from "@jest/globals";
import models, { wci as exportedWci } from "../../src/models/index.js";
import { wci } from "../../src/models/wci.js";
import { testDataUrls } from "./comftest.js";
import { loadTestData, validateResult } from "./testUtils.js";

// Mirror pythermalcomfort/tests/test_wind_chill_index.py, including all rows.
const { testData, tolerances } = await loadTestData(testDataUrls.wci, true);

test("test_calculates_wci", () => {
  for (const { inputs, outputs } of testData.data) {
    const { tdb, v, round_output } = inputs;
    validateResult(wci(tdb, v, round_output), outputs, tolerances, inputs);
  }
});

describe("TestWc", () => {
  test("test_raises_type_error_tdb_not_provided", () => {
    expect(() => wci(undefined, 0.1)).toThrow(TypeError);
  });
  test("test_raises_type_error_v_not_provided", () => {
    expect(() => wci(0)).toThrow(TypeError);
  });
  test("test_raises_type_error_tdb_not_float", () => {
    expect(() => wci("0", 0.1)).toThrow(TypeError);
  });
});

describe("wci API alignment", () => {
  test("exports the canonical function through both model entry points", () => {
    expect(exportedWci).toBe(wci);
    expect(models.wci).toBe(wci);
  });
  test("round_output defaults to true and false preserves precision", () => {
    expect(wci(0, 0.1)).toEqual({ wci: 518.6 });
    expect(wci(0, 0.1, false).wci).toBeCloseTo(518.5877043196023, 10);
  });
  test.each([
    [
      [-5, -10],
      [5.5, 10],
      [1255.2, 1603.9],
    ],
    [[0, -5], 0.1, [518.6, 597.2]],
    [0, [0.1, 1.5], [518.6, 813.5]],
    [[0], [0.1, 1.5], [518.6, 813.5]],
    [[0, -5], [0.1], [518.6, 597.2]],
    [[], 0.1, []],
    [0, [], []],
    [[], [], []],
  ])("supports Python scalar/list broadcasting: %j, %j", (tdb, v, expected) => {
    expect(wci(tdb, v)).toEqual({ wci: expected });
  });
  test("does not round array results when round_output is false", () => {
    expect(wci([0], [0.1], false).wci[0]).toBeCloseTo(518.5877043196023, 10);
  });
  test("rounds halfway values to even like NumPy", () => {
    expect(wci(41.20761353865395, 0, false).wci).toBe(-99.75);
    expect(wci(41.20761353865395, 0).wci).toBe(-99.8);
  });
  test("rejects incompatible array lengths", () => {
    expect(() => wci([0, 1], [1, 2, 3])).toThrow(RangeError);
  });
  test.each([
    [0, "0.1"],
    [null, 0.1],
    [[0, "1"], 0.1],
    [0, ["1"]],
    [0, 0.1, "true"],
    [0, 0.1, null],
  ])("rejects invalid input types: %j", (...args) => {
    expect(() => wci(...args)).toThrow(TypeError);
  });
  test("propagates NaN and negative wind speed like NumPy", () => {
    expect(wci(NaN, 0.1).wci).toBeNaN();
    expect(wci(0, -1).wci).toBeNaN();
  });
});
