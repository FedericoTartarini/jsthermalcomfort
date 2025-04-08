import { describe } from "@jest/globals";
import { utci } from "../../src/models/utci.js";
import { testDataUrls } from "./comftest"; // Import all test URLs from comftest.js
import { loadTestData, validateResult } from "./testUtils"; // Import utility functions

let returnArray = false;

// use top-level await to load test data before tests are defined.
let { testData, tolerances } = await loadTestData(
  testDataUrls.utci,
  returnArray,
);

describe("utci", () => {
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { tdb, tr, rh, v, units, return_stress_category } = inputs;
    const modelResult = utci(tdb, tr, v, rh, units, return_stress_category);

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });
});
