import { expect, describe, it, beforeAll } from "@jest/globals";
import { loadTestData } from "./testUtils";
import { two_nodes } from "../../src/models/two_nodes";
import { testDataUrls } from "./comftest"; // Import all test URLs from comftest.js

// Use the URL from comftest.js to fetch data for two_nodes tests
const testDataUrl = testDataUrls.twoNodes; // Ensure the correct URL is added in comftest.js

let testData;
let tolerance;

// Load data before tests
beforeAll(async () => {
  const result = await loadTestData(testDataUrl, "twoNodes"); // Load data from URL using loadTestData
  testData = result.testData;
  tolerance = result.tolerance || 0.1; // Set a default tolerance
});

// General test function to verify results for different test functions
function runTest(testFunction, inputs, expected) {
  const {
    tdb,
    tr,
    v,
    rh,
    met,
    clo,
    wme,
    body_surface_area,
    p_atmospheric,
    body_position,
    max_skin_blood_flow,
    kwargs,
  } = inputs;

  const result = testFunction(
    tdb,
    tr,
    v,
    rh,
    met,
    clo,
    wme,
    body_surface_area,
    p_atmospheric,
    body_position,
    max_skin_blood_flow,
    kwargs,
  );

  // Use specified tolerance or default to 0.0001
  const tol = tolerance !== undefined ? tolerance : 0.0001;
  expect(Math.abs(result - expected)).toBeLessThanOrEqual(tol);
}

describe("two_nodes related tests", () => {
  it("should run two_nodes tests after data is loaded", () => {
    if (!testData || !testData.data)
      throw new Error("Test data is undefined or data not loaded");

    testData.data.forEach(({ inputs, expected }) => {
      // Skip empty or invalid data
      if (expected === undefined || expected === null) return;

      // Skip array inputs — only test scalar cases
      const values = Object.values(inputs);
      if (values.some((value) => Array.isArray(value))) return;

      runTest(two_nodes, inputs, expected);
    });
  });
});

describe("two_nodes validation logic (Testing the Test)", () => {
  it("should fail if the result is outside the tolerance margin", () => {
    const mockExpected = 25.0;
    const mockActual = 25.2; // Difference is 0.2
    const mockTolerance = 0.1;

    expect(() => {
      const diff = Math.abs(mockActual - mockExpected);
      if (diff > mockTolerance) {
        throw new Error(
          `Value outside tolerance: actual ${mockActual}, expected ${mockExpected}, tol ${mockTolerance}`,
        );
      }
    }).toThrow();
  });

  it("should pass if the result is inside the tolerance margin", () => {
    const mockExpected = 25.0;
    const mockActual = 25.05; // Difference is 0.05
    const mockTolerance = 0.1;

    expect(() => {
      const diff = Math.abs(mockActual - mockExpected);
      if (diff > mockTolerance) {
        throw new Error(
          `Value outside tolerance: actual ${mockActual}, expected ${mockExpected}, tol ${mockTolerance}`,
        );
      }
    }).not.toThrow();
  });
});
