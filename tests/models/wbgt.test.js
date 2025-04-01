import { expect, describe, it, beforeAll } from "@jest/globals";
import { wbgt } from "../../src/models/wbgt";
import { testDataUrls } from "./comftest"; // Import all test URLs from comftest.js
import { loadTestData } from "./testUtils"; // Import utility functions

// Variables to store data fetched from remote source
let testData;
let tolerance;

// Fetch data before running tests
beforeAll(async () => {
  ({ testData, tolerance } = await loadTestData(testDataUrls.wbgt, "wbgt"));
});

describe("wbgt", () => {
  it("should run tests and skip invalid data or handle errors gracefully", () => {
    if (!testData || !testData.data) {
      throw new Error("Test data is undefined or data not loaded");
    }

    // Iterate over each test case
    testData.data.forEach(({ inputs, outputs }) => {
      const { twb, tg, tdb, with_solar_load, round } = inputs;

      try {
        const result = wbgt(twb, tg, { tdb, with_solar_load, round });

        // Verify if the return value is close to the expected value
        if (outputs.wbgt !== undefined) {
          expect(result).toBeCloseTo(outputs.wbgt, tolerance);
        }
      } catch (error) {
        // Capture and handle specific error messages
        if (with_solar_load && tdb === undefined) {
          expect(error.message).toBe(
            "Please enter the dry bulb air temperature",
          );
        } else {
          throw error; // Re-throw if it’s another error
        }
      }
    });
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
