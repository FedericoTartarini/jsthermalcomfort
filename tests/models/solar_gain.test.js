import { describe } from "@jest/globals";
import { solar_gain } from "../../src/models/solar_gain";
import { testDataUrls } from "./comftest";
import { loadTestData, validateResult } from "./testUtils";

let returnArray = false;

// use top-level await to load test data before tests are defined.
let { testData, tolerances } = await loadTestData(
  testDataUrls.solarGain,
  returnArray,
);

describe("solar_gain", () => {
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const {
      sol_altitude,
      sharp,
      sol_radiation_dir,
      sol_transmittance,
      f_svv,
      f_bes,
      asw,
      posture,
    } = inputs;
    const modelResult = solar_gain(
      sol_altitude,
      sharp,
      sol_radiation_dir,
      sol_transmittance,
      f_svv,
      f_bes,
      asw,
      posture,
    );

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });
});
