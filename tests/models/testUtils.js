import fetch from "node-fetch"; // Import node-fetch to support data fetching

// Load test data and extract tolerance
export async function loadTestData(url, returnArray = false) {
  let testData;
  let tolerances;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    testData = await response.json();
    tolerances = testData.tolerance;
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
  return { testData, tolerances };
}

// Check if the test should be skipped (if it contains array data)
export function shouldSkipTest(inputs) {
  const values = Object.values(inputs);
  return values.some((value) => Array.isArray(value));
}

/**
 * Validates the model's output against the expected outputs using specified tolerances.
 *
 * @param {*} modelResult - The output from the model function, which can be either a primitive value or an object.
 * @param {Object} expectedOutputs - An object containing the expected outputs, with keys matching those in modelResult.
 * @param {Object} tolerances - An object specifying tolerance values for numeric comparisons for each key.
 * @param {Object} inputs - The input parameters used to generate modelResult, logged in case of test failure.
 */

export function validateResult(
  modelResult,
  expectedOutputs,
  tolerances,
  inputs,
) {
  try {
    Object.keys(expectedOutputs).forEach((key) => {
      const expectedValue =
        expectedOutputs[key] === null ? NaN : expectedOutputs[key];
      const actualValue = modelResult[key];

      // expected output might contain variables whose tolerance is not defined
      const tol = (tolerances && tolerances[key]) || 0;

      // Handle arrays
      if (Array.isArray(expectedValue)) {
        expect(Array.isArray(actualValue)).toBe(true);
        expectedValue.forEach((exp, index) => {
          const act = actualValue[index];
          if (typeof exp === "number") {
            if (isNaN(exp)) {
              expect(act).toBeNaN();
            } else {
              expect(act).toBeCloseTo(exp, tol);
            }
          } else {
            expect(act).toEqual(exp);
          }
        });
      } else if (typeof expectedValue === "number") {
        // Handle numeric values
        if (isNaN(expectedValue)) {
          expect(actualValue).toBeNaN();
        } else {
          expect(actualValue).toBeCloseTo(expectedValue, tol);
        }
      } else {
        // For booleans or other types
        expect(actualValue).toEqual(expectedValue);
      }
    });
  } catch (error) {
    console.log("Test failed with the following context:");
    console.log("Inputs:", inputs);
    console.log("Expected outputs:", expectedOutputs);
    console.log("Model outputs:", modelResult);
    throw error;
  }
}
