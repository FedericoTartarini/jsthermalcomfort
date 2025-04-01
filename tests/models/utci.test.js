import { expect, describe, it, beforeAll } from "@jest/globals";
import { deep_close_to_array } from "../test_utilities";
import { utci, utci_array } from "../../src/models/utci.js";
import { testDataUrls } from "./comftest"; // Import all test URLs from comftest.js
import { loadTestData, shouldSkipTest } from "./testUtils"; // Import utility functions

// Variables to store data fetched from remote source
let testData;
let tolerance;

// Fetch data before running tests
beforeAll(async () => {
  ({ testData, tolerance } = await loadTestData(testDataUrls.utci, "utci"));
});

describe("utci", () => {
  it("should run tests and skip array or undefined fields", () => {
    if (!testData || !testData.data) {
      throw new Error("Test data is undefined or data not loaded");
    }

    // Iterate over each test case
    testData.data.forEach(({ inputs, outputs }) => {
      // Skip if any input value is an array
      if (shouldSkipTest(inputs)) {
        return; // Skip tests with array inputs
      }

      const { tdb, tr, rh, v, units, return_stress_category } = inputs;
      const expected = outputs.utci;

      // Skip comparison if expected is null, an object, or return_stress_category is set
      if (
        expected === null ||
        typeof expected === "object" ||
        return_stress_category
      ) {
        return;
      }

      // Calculate UTCI
      const result = utci(tdb, tr, v, rh, units, return_stress_category);

      if (isNaN(expected)) {
        expect(result).toBeNaN();
      } else {
        expect(result).toBeCloseTo(expected, tolerance);
      }
    });
  });
});

describe("utci_array", () => {
  it("should skip array input testing", () => {
    if (!testData || !testData.data) {
      throw new Error("Test data is undefined or data not loaded");
    }

    testData.data.forEach(({ inputs, outputs }) => {
      // Check if array inputs are present, and skip if so
      if (shouldSkipTest(inputs)) {
        return;
      }

      const { tdb, tr, rh, v, units } = inputs;
      const expected = outputs.utci_array;

      // Skip if valid array inputs are not provided
      if (
        !Array.isArray(tdb) ||
        !Array.isArray(tr) ||
        !Array.isArray(v) ||
        !Array.isArray(rh)
      ) {
        return;
      }

      // Calculate UTCI array
      const result = utci_array(tdb, tr, v, rh, units);

      // Compare each array result
      deep_close_to_array(result.utci, expected.utci, tolerance);

      // Ensure stress_category lengths are the same
      expect(result.stress_category.length).toBe(
        expected.stress_category.length,
      );
      for (let i = 0; i < result.stress_category.length; i++) {
        expect(result.stress_category[i]).toBe(expected.stress_category[i]);
      }
    });
  });
});
