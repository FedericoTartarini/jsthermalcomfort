import { describe, expect, test } from "@jest/globals";
import { set_tmp } from "../../src/models/set_tmp";
import { testDataUrls } from "./comftest";
import { loadTestData, validateResult } from "./testUtils"; // Use modular utilities to load data and check if test should be skipped

let returnArray = false;

// use top-level await to load test data before tests are defined.
let { testData, tolerances } = await loadTestData(
  testDataUrls.setTmp,
  returnArray,
);

describe("set_tmp", () => {
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs } = testCase;
    const {
      tdb,
      tr,
      v,
      rh,
      met,
      clo,
      wme,
      body_surface_area,
      p_atm,
      body_position,
      units,
      limit_inputs = false,
      round,
      calculate_ce,
    } = inputs;

    const kwargs = {
      round,
      calculate_ce,
    };

    const modelResult = set_tmp(
      tdb,
      tr,
      v,
      rh,
      met,
      clo,
      wme,
      body_surface_area,
      p_atm,
      body_position,
      units,
      limit_inputs,
      kwargs,
    );

    validateResult(modelResult, outputs, tolerances, inputs);
  });
});

// ---------------------------------------------------------------------------
// Input validation tests
// ---------------------------------------------------------------------------
describe("set_tmp input validation", () => {
  test.each([
    ["tdb", "25", 25, 0.1, 50, 1.2, 0.5],
    ["tr", 25, "25", 0.1, 50, 1.2, 0.5],
    ["v", 25, 25, "0.1", 50, 1.2, 0.5],
    ["rh", 25, 25, 0.1, "50", 1.2, 0.5],
    ["met", 25, 25, 0.1, 50, "1.2", 0.5],
    ["clo", 25, 25, 0.1, 50, 1.2, "0.5"],
    ["wme", 25, 25, 0.1, 50, 1.2, 0.5, "0"],
  ])("throws TypeError if %s is not a number", (_, ...args) => {
    expect(() => set_tmp(...args)).toThrow(TypeError);
  });

  test("throws Error if body_position is not a valid enum", () => {
    expect(() =>
      set_tmp(25, 25, 0.1, 50, 1.2, 0.5, 0, undefined, undefined, "INVALID"),
    ).toThrow(Error);
  });

  test("throws Error if units is not a valid enum", () => {
    expect(() =>
      set_tmp(
        25,
        25,
        0.1,
        50,
        1.2,
        0.5,
        0,
        undefined,
        undefined,
        "standing",
        "INVALID",
      ),
    ).toThrow(Error);
  });

  test("throws TypeError if limit_inputs is not a boolean", () => {
    expect(() =>
      set_tmp(
        25,
        25,
        0.1,
        50,
        1.2,
        0.5,
        0,
        undefined,
        undefined,
        "standing",
        "SI",
        "true",
      ),
    ).toThrow(TypeError);
  });

  test("throws TypeError if kwargs.calculate_ce is not a boolean", () => {
    expect(() =>
      set_tmp(
        25,
        25,
        0.1,
        50,
        1.2,
        0.5,
        0,
        undefined,
        undefined,
        "standing",
        "SI",
        true,
        {
          calculate_ce: "true",
        },
      ),
    ).toThrow(TypeError);
  });

  test("throws TypeError if kwargs.round is not a boolean", () => {
    expect(() =>
      set_tmp(
        25,
        25,
        0.1,
        50,
        1.2,
        0.5,
        0,
        undefined,
        undefined,
        "standing",
        "SI",
        true,
        {
          round: "true",
        },
      ),
    ).toThrow(TypeError);
  });
});
