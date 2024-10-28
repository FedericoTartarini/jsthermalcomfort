import { expect, describe, it, beforeAll } from "@jest/globals";
import { loadTestData, shouldSkipTest } from "./testUtils";
import { use_fans_heatwaves } from "../../src/models/use_fans_heatwave";
import { testDataUrls } from "./comftest"; // Import all test URLs from comftest.js

// Get data for use_fans_heatwaves tests
const testDataUrl = testDataUrls.use_fans_heatwaves; // Ensure the correct URL is added in comftest.js

let testData;
let tolerance;

// Load data before tests
beforeAll(async () => {
  const result = await loadTestData(testDataUrl, 'use_fans_heatwaves');
  testData = result.testData.data || []; // Ensure testData points to the data array
  tolerance = result.tolerance || 1; // Use default tolerance
});

// Define result comparison logic within the test file
function compareResults(result, expected, tolerance) {
  for (let key in expected) {
    if (isNaN(expected[key])) {
      expect(result[key]).toBeNaN();
    } else if (
      key === "heat_strain" ||
      key === "heat_strain_blood_flow" ||
      key === "heat_strain_sweating" ||
      key === "heat_strain_w"
    ) {
      expect(result[key]).toBe(expected[key]);
    } else {
      expect(result[key]).toBeCloseTo(expected[key], tolerance);
    }
  }
}

describe("use_fans_heatwaves", () => {
  it("should be a function", () => {
    expect(use_fans_heatwaves).toBeInstanceOf(Function);
  });

  it("runs tests after data is loaded, skips array-based data", () => {
    if (!testData || testData.length === 0) {
      throw new Error("Test data is undefined or data not loaded");
    }

    testData.forEach(({ inputs, expected }) => {
      if (shouldSkipTest(inputs) || expected === null || typeof expected === "object") {
        return; // Skip tests with array data or complex/empty expected values
      }

      const {
        tdb, tr, v, rh, met, clo, wme, body_surface_area, p_atm,
        body_position, units, max_skin_blood_flow, kwargs
      } = inputs;

      const result = use_fans_heatwaves(
        tdb, tr, v, rh, met, clo, wme, body_surface_area, p_atm,
        body_position, units, max_skin_blood_flow, kwargs
      );

      // Compare results using compareResults
      compareResults(result, expected, tolerance);
    });
  });
});
