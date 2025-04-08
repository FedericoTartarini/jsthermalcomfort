import { describe, expect, it, test } from "@jest/globals";
import { wbgt } from "../../src/models/wbgt";
import { testDataUrls } from "./comftest"; // Import all test URLs from comftest.js
import { loadTestData, validateResult } from "./testUtils"; // Import utility functions

let returnArray = false;

// use top-level await to load test data before tests are defined.
let { testData, tolerances } = await loadTestData(
  testDataUrls.wbgt,
  returnArray,
);

describe("wbgt", () => {
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { twb, tg, tdb, with_solar_load, round } = inputs;
    const modelResult = wbgt(twb, tg, { tdb, with_solar_load, round });

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });

  it("should throw an error when with_solar_load is set and tdb is not provided", () => {
    try {
      wbgt(0, 0, { with_solar_load: true });
    } catch (error) {
      // Verify specific error message
      expect(error.message).toBe("Please enter the dry bulb air temperature");
    }
  });
});
