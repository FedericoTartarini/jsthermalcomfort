import { expect } from "@jest/globals";
import fetch from "node-fetch"; // Import node-fetch to support data fetching

/** One row of a validation-data fixture: the model inputs and expected outputs. */
export interface FixtureRow {
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  [key: string]: unknown;
}

/** A validation-data fixture file as fetched from the shared repository. */
export interface Fixture {
  data: FixtureRow[];
  tolerance?: Record<string, number>;
  [key: string]: unknown;
}

/**
 * Drop rows whose `inputs` contain any array-valued field. Pure helper so it
 * can be unit-tested without a network round trip.
 *
 * @param {Array<{ inputs: Object }>} rows
 * @returns {Array}
 */
export function filterScalarRows<T extends { inputs: Record<string, unknown> }>(
  rows: T[],
): T[] {
  return rows.filter((row) =>
    Object.values(row.inputs).every((value) => !Array.isArray(value)),
  );
}

/**
 * Throw if the supplied row set is empty. Callers that filter the dataset
 * after `loadTestData` (e.g. by standard, by units) can wrap their result in
 * this helper so a fixture drift that empties the filter shows up as a hard
 * failure rather than a silent `test.each([])` that registers zero row tests.
 *
 * @param {Array} rows
 * @param {string} label - human-readable description for the error message
 * @returns {Array} the same rows, unchanged, when non-empty
 */
export function assertNonEmptyRows<T>(rows: T[], label: string): T[] {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(
      `${label}: 0 rows after filtering. ` +
        `test.each([]) would register zero tests and report green.`,
    );
  }
  return rows;
}

// Load test data and extract tolerance
export async function loadTestData(
  url: string,
  returnArray = false,
): Promise<{
  testData: Fixture;
  tolerances: Record<string, number> | undefined;
}> {
  let testData: Fixture;
  let tolerances: Record<string, number> | undefined;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    testData = (await response.json()) as Fixture;
    tolerances = testData.tolerance;
  } catch (error) {
    console.error("Unable to fetch or parse test data:", error);
    throw error;
  }

  // If returnArray is false, filter out test cases that have array inputs.
  // Callers iterate `testData.data`, so an empty dataset would register
  // zero tests yet report green; assertNonEmptyRows turns that into a hard
  // failure with a descriptive message.
  if (!returnArray && Array.isArray(testData.data)) {
    testData.data = assertNonEmptyRows(
      filterScalarRows(testData.data),
      `loadTestData scalar filter (url=${url})`,
    );
  }
  return { testData, tolerances };
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
  modelResult: unknown,
  expectedOutputs: Record<string, unknown>,
  tolerances: Record<string, number> | undefined,
  inputs: unknown,
): void {
  // Silent-skip guards. Without these, an empty/missing `expectedOutputs`
  // makes Object.keys(...).forEach run zero assertions and the test reports
  // green. A null/undefined `modelResult` against non-empty expectations is
  // also treated as a hard failure rather than letting the property access
  // throw mid-loop with a confusing TypeError.
  if (
    expectedOutputs === null ||
    expectedOutputs === undefined ||
    typeof expectedOutputs !== "object"
  ) {
    throw new Error(
      "validateResult: expectedOutputs must be a non-null object.",
    );
  }
  const expectedKeys = Object.keys(expectedOutputs);
  if (expectedKeys.length === 0) {
    throw new Error(
      "validateResult: expectedOutputs is empty; refusing to run zero assertions.",
    );
  }
  if (modelResult === null || modelResult === undefined) {
    throw new Error(
      "validateResult: modelResult is null/undefined but expectedOutputs has keys.",
    );
  }

  try {
    expectedKeys.forEach((key) => {
      const expectedValue =
        expectedOutputs[key] === null ? NaN : expectedOutputs[key];
      // A primitive modelResult indexes to undefined, which the assertions
      // below then report against the expected value.
      const actualValue = (modelResult as Record<string, unknown>)[key];

      // Use the specified tolerance if available, otherwise default to a strict 0.0001
      const tol =
        tolerances && tolerances[key] !== undefined ? tolerances[key] : 0.0001;

      // Handle arrays
      if (Array.isArray(expectedValue)) {
        expect(Array.isArray(actualValue)).toBe(true);
        // Length check guards against the silent-skip where a longer actual
        // array slips trailing elements past the per-index loop.
        expect(actualValue).toHaveLength(expectedValue.length);
        expectedValue.forEach((exp: unknown, index) => {
          const act = (actualValue as unknown[])[index];
          if (typeof exp === "number") {
            if (isNaN(exp)) {
              expect(act).toBeNaN();
            } else {
              // typeof guard prevents JS coercion false-passes:
              // null - 0, false - 0, [] - 0, "1" - 1 all evaluate to a
              // tolerable difference in plain Math.abs comparison.
              expect(typeof act).toBe("number");
              expect(Math.abs((act as number) - exp)).toBeLessThanOrEqual(
                tol + Number.EPSILON * 100,
              );
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
          // typeof guard prevents JS coercion false-passes (see array branch).
          expect(typeof actualValue).toBe("number");
          expect(
            Math.abs((actualValue as number) - expectedValue),
          ).toBeLessThanOrEqual(tol + Number.EPSILON * 100);
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
