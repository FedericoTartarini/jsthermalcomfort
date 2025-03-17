import fetch from "node-fetch"; // Import node-fetch to support data fetching

// Load test data and extract tolerance
export async function loadTestData(url, toleranceKey) {
  let testData;
  let tolerance;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    testData = await response.json();
    tolerance = testData.tolerance[toleranceKey];
  } catch (error) {
    console.error("Unable to fetch or parse test data:", error);
    throw error;
  }
  return { testData, tolerance };
}

// Check if the test should be skipped (if it contains array data)
export function shouldSkipTest(inputs) {
  const values = Object.values(inputs);
  return values.some((value) => Array.isArray(value));
}

/**
 * Validates the result against the expected value within a given tolerance.
 * Logs the input details if an assertion fails.
 *
 * @param {*} result - The result from the model function.
 * @param {*} expected - The expected result.
 * @param {number} tolerance - The tolerance for floating-point comparisons.
 * @param {Object} details - Additional context to log if the test fails.
 */
export function validateResult(result, expected, tolerance, details) {
  try {
    if (Array.isArray(expected)) {
      // array output
      expect(Array.isArray(result)).toBe(true);
      result.forEach((element, index) => {
        if (isNaN(element) || expected[index] === null) {
          expect(element).toBeNaN();
        } else {
          expect(element).toBeCloseTo(expected[index], tolerance);
        }
      });
    } else {
      // single value output
      expect(Array.isArray(result)).toBe(false);
      if (isNaN(result) || expected === null) {
        expect(result).toBeNaN();
      } else {
        expect(result).toBeCloseTo(expected, tolerance);
      }
    }
  } catch (error) {
    console.log("Test failed with the following context:");
    console.log("Details:", details);
    throw error;
  }
}
