import { expect, describe, it, beforeAll } from "@jest/globals";
import { loadTestData, shouldSkipTest } from "./testUtils";
import { two_nodes, two_nodes_array } from "../../src/models/two_nodes";
import { testDataUrls } from "./comftest"; // Import all test URLs from comftest.js

// Use the URL from comftest.js to fetch data for two_nodes tests
const testDataUrl = testDataUrls.twoNodes; // Ensure the correct URL is added in comftest.js

let testData;
let tolerance;

// Load data before tests
beforeAll(async () => {
  const result = await loadTestData(testDataUrl, 'twoNodes'); // Load data from URL using loadTestData
  testData = result.testData;
  tolerance = result.tolerance || 0.1; // Set a default tolerance
});

// General test function to verify results for different test functions
function runTest(testFunction, inputs, expected) {
  const {
    tdb, tr, v, rh, met, clo, wme, body_surface_area, p_atmospheric,
    body_position, max_skin_blood_flow, kwargs
  } = inputs;

  const result = testFunction(
    tdb, tr, v, rh, met, clo, wme, body_surface_area, p_atmospheric,
    body_position, max_skin_blood_flow, kwargs
  );

  expect(result).toBeCloseTo(expected, tolerance);
}

describe("two_nodes related tests", () => {
  it("should run two_nodes and two_nodes_array tests after data is loaded", () => {
    if (!testData || !testData.data) throw new Error("Test data is undefined or data not loaded");

    testData.data.forEach(({ inputs, expected }) => {
      // Skip empty or invalid data
      if (expected === undefined || expected === null) return;

      if (shouldSkipTest(inputs)) {
        // Test array data with two_nodes_array
        runTest(two_nodes_array, inputs, expected);
      } else {
        // Test non-array data with two_nodes
        runTest(two_nodes, inputs, expected);
      }
    });
  });
});
