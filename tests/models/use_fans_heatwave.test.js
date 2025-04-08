import { describe, test } from "@jest/globals";
import { use_fans_heatwaves } from "../../src/models/use_fans_heatwave";
import { testDataUrls } from "./comftest"; // Import all test URLs from comftest.js
import { loadTestData, validateResult } from "./testUtils";

let returnArray = false;

// use top-level await to load test data before tests are defined.
let { testData, tolerances } = await loadTestData(
  testDataUrls.use_fans_heatwaves,
  returnArray,
);

describe("use_fans_heatwaves", () => {
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
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
      position: body_position,
      units,
      max_skin_blood_flow,
      kwargs,
    } = inputs;

    const modelResult = use_fans_heatwaves(
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
      max_skin_blood_flow,
      kwargs,
    );

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });
});
