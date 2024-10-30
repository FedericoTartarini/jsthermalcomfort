import { describe, it, beforeAll } from "@jest/globals";
import { wc } from "../../src/models/wc.js";
import { deep_close_to_obj } from "../test_utilities.js";
import { testDataUrls } from './comftest'; // Import all test URLs from comftest.js
import { loadTestData, shouldSkipTest } from "./testUtils"; // Import utility functions

// Variables to store data fetched from remote source
let testData;
let tolerance;

// Fetch data before running tests
beforeAll(async () => {
  ({ testData, tolerance } = await loadTestData(testDataUrls.wc, 'wc'));
});

describe("test_wc", () => {
  it("should run tests and skip data that contains arrays or undefined fields", () => {
    if (!testData || !testData.data) {
      throw new Error("Test data is undefined or data not loaded");
    }

    testData.data.forEach(({ inputs, expected }) => {
      // Use shouldSkipTest to skip data containing array inputs
      if (shouldSkipTest(inputs) || expected === undefined) {
        return;
      }

      const { tdb, v } = inputs;
      const result = wc(tdb, v);

      // Compare calculated results
      deep_close_to_obj(result, expected, tolerance);
    });
  });
});
