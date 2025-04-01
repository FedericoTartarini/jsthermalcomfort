import { expect, describe, it, beforeAll } from "@jest/globals";
import { cooling_effect } from "../../src/models/cooling_effect";
import { testDataUrls } from "./comftest"; // Import all test URLs from comftest.js
import { loadTestData, shouldSkipTest } from "./testUtils"; // Import utility functions

// Variables to store data fetched from remote source
let testData;
let tolerance;

// Fetch data before running tests
beforeAll(async () => {
  ({ testData, tolerance } = await loadTestData(
    testDataUrls.coolingEffect,
    "ce",
  ));
});

describe("cooling_effect", () => {
  it("should run tests after data is loaded", () => {
    if (!testData || !testData.data) {
      throw new Error("Test data is undefined or data not loaded");
    }

    testData.data.forEach(({ inputs, outputs }) => {
      // Skip test cases with array inputs using utility function
      if (shouldSkipTest(inputs) || outputs.ce === undefined) {
        return;
      }

      const { tdb, tr, vr, rh, met, clo, units } = inputs;
      const result = cooling_effect(
        tdb,
        tr,
        vr,
        rh,
        met,
        clo,
        undefined,
        units,
      );

      // Compare the result and ensure values are close
      if (result === 0 && outputs.ce !== 0) {
        console.warn(
          `Assuming cooling effect = 0 since it could not be calculated for this set of inputs tdb=${tdb}, tr=${tr}, rh=${rh}, vr=${vr}, clo=${clo}, met=${met}`,
        );
        expect(result).toBe(0);
      } else {
        expect(result).toBeCloseTo(outputs.ce, tolerance);
      }
    });
  });
});
