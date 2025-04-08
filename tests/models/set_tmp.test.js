import { describe, test } from "@jest/globals";
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
