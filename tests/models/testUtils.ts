/**
 * Shared harness for the model tests: loads the validation-data fixtures that
 * pythermalcomfort's tests use and checks a model's result against a row.
 *
 * Mirroring an upstream test. A mirrored test carries an upstream test's
 * name, inputs and expected values into Jest; follow these conventions so a
 * gap or a regression can be found by grepping either side:
 *
 * - One `describe` per upstream test file, named after that file
 *   (`test_pmv_ppd_iso.py` → `describe("test_pmv_ppd_iso", ...)`).
 * - A pytest class becomes a nested `describe` with the class name.
 * - Each test keeps the upstream function name verbatim
 *   (`test("test_pmv_ppd_iso_standard_validation", ...)`).
 * - `@pytest.mark.parametrize` becomes `test.each`, using upstream's `ids` as
 *   the case names where it gives them.
 * - Same inputs, same expected values. Use upstream's tolerance where it
 *   states one (`pytest.approx(..., abs=...)`, a fixture's `tolerance`), 1e-6
 *   otherwise, which is also `validateResult`'s default for a key the
 *   fixture's `tolerance` does not name.
 * - Array or vector inputs run element-wise: one scalar case per element,
 *   the expected outputs indexed the same way. `loadTestData` does this for
 *   fixture rows (see `expandArrayRows`).
 * - A fixture test runs every row its upstream counterpart means to run, even
 *   where upstream's filter misses rows (the PMV tests match lowercase
 *   `"iso"`/`"ashrae"` against the fixture's uppercase labels).
 * - Error classes: `ValueError` → `Error`, `TypeError` → `TypeError`. Assert
 *   the message too where upstream matches one (`pytest.raises(match=...)`).
 * - A `UserWarning` assertion becomes an assertion on the `warnings` rows
 *   where the model returns them (PMV). Otherwise, and for any upstream test
 *   that cannot be ported, write `test.todo("<upstream name>: <reason>")`
 *   so the gap stays visible in the test runner.
 * - Whole-object equality (`assert result == {...}`) becomes a field-by-field
 *   check of upstream's fields; extra JS-only fields on the result are fine.
 * - JS-only tests live in their own `describe` in the same file, after the
 *   mirrored ones. A JS-only test that a mirrored test now covers with the
 *   same inputs is deleted.
 */
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
 * Expand every row whose `inputs` hold arrays into one scalar case per
 * element: element `i` of each array input and of each array output, with
 * the scalar inputs and outputs repeated. Rows without array inputs are kept
 * as they are, and the order of the cases follows the fixture. Pure helper so
 * it can be unit-tested without a network round trip.
 *
 * @param {Array<{ inputs: Object, outputs?: Object }>} rows
 * @returns {Array} the scalar cases
 */
export function expandArrayRows<
  T extends {
    inputs: Record<string, unknown>;
    outputs?: Record<string, unknown>;
  },
>(rows: T[]): T[] {
  return rows.flatMap((row) => {
    const lengths = new Set(
      Object.values(row.inputs)
        .filter(Array.isArray)
        .map((value) => value.length),
    );
    if (lengths.size === 0) return [row];
    if (lengths.size > 1) {
      throw new Error(
        `expandArrayRows: array inputs differ in length in ${JSON.stringify(row.inputs)}`,
      );
    }
    const [length] = lengths;
    const elementAt = (values: Record<string, unknown>, index: number) =>
      Object.fromEntries(
        Object.entries(values).map(([key, value]) => {
          if (!Array.isArray(value)) return [key, value];
          if (value.length !== length) {
            throw new Error(
              `expandArrayRows: "${key}" has length ${value.length}, ` +
                `the row's array inputs have length ${length}`,
            );
          }
          return [key, value[index]];
        }),
      );
    return Array.from({ length }, (_, index) => ({
      ...row,
      inputs: elementAt(row.inputs, index),
      ...(row.outputs && { outputs: elementAt(row.outputs, index) }),
    }));
  });
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

  // If returnArray is false, expand rows with array inputs into scalar cases.
  // Callers iterate `testData.data`, so an empty dataset would register
  // zero tests yet report green; assertNonEmptyRows turns that into a hard
  // failure with a descriptive message.
  if (!returnArray && Array.isArray(testData.data)) {
    testData.data = assertNonEmptyRows(
      expandArrayRows(testData.data),
      `loadTestData (url=${url})`,
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

      // Use the specified tolerance if available, otherwise upstream's 1e-6
      const tol =
        tolerances && tolerances[key] !== undefined ? tolerances[key] : 1e-6;

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
