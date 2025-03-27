import fetch from "node-fetch"; // Import node-fetch to support data fetching

// Load test data and extract tolerance
export async function loadTestData(url, toleranceKey, returnArray = false) {
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

  // If returnArray is false, filter out test cases that have array inputs.
  if (!returnArray && Array.isArray(testData.data)) {
    testData.data = testData.data.filter((testCase) => {
      return Object.values(testCase.inputs).every(
        (value) => !Array.isArray(value),
      );
    });
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
 * @param {*} modelResult - The result from the model function.
 * @param {*} expectedOutput - The expected result.
 * @param {number} tolerance - The tolerance for floating-point comparisons.
 * @param {Object} details - Additional context to log if the test fails.
 */

export function validateResult(modelResult, expectedOutput, tolerance, inputs) {
  try {
    // testing for arrays
    if (Array.isArray(expectedOutput)) {
      // array output
      expect(Array.isArray(modelResult)).toBe(true);
      modelResult.forEach((element, index) => {
        if (isNaN(element) || expectedOutput[index] === null) {
          expect(element).toBeNaN();
        } else {
          expect(element).toBeCloseTo(expectedOutput[index], tolerance);
        }
      });
    } else {
      // single value output
      expect(Array.isArray(modelResult)).toBe(false);
      if (isNaN(modelResult) || expectedOutput === null) {
        expect(modelResult).toBeNaN();
      } else {
        expect(modelResult).toBeCloseTo(expectedOutput, tolerance);
      }
    }
  } catch (error) {
    console.log("Test failed with the following context:");
    console.log("Inputs:", inputs);
    console.log("Outputs:", expectedOutput);
    throw error;
  }
}
