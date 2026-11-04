/**
 * Shared harness for the model tests: loads the validation-data fixtures that
 * pythermalcomfort's tests use and checks a model's result against a row.
 *
 * Mirroring an upstream test. A mirrored test carries an upstream test's
 * name, inputs and expected values into Vitest; follow these conventions so a
 * gap or a regression can be found by grepping either side:
 *
 * - One `describe` per upstream test file, named after that file
 *   (`test_pmv_ppd_iso.py` → `describe("test_pmv_ppd_iso", ...)`).
 * - A pytest class becomes a nested `describe` with the class name.
 * - Each test keeps the upstream function name verbatim
 *   (`test("test_pmv_ppd_iso_standard_validation", ...)`).
 * - `@pytest.mark.parametrize` becomes `test.each`, using upstream's `ids` as
 *   the case names where it gives them.
 * - A fixture row is passed to the model unchanged, `fn(inputs)`, as
 *   upstream's `fn(**inputs)`: the model takes one params object keyed like
 *   upstream's keyword arguments (ADR 0002).
 * - Same inputs, same expected values. Compare numbers with `approx`, with
 *   upstream's tolerance where it states one (`pytest.approx(..., abs=...)`,
 *   a fixture's `tolerance`), 1e-6 otherwise, which is also
 *   `validateResult`'s default for a key the fixture's `tolerance` does not
 *   name. An expected value is read through the representation mappings
 *   (ADR 0028): a flag's 1.0, 0.0 or NaN as `true`, `false` or `null`, a
 *   nullable output's NaN as `null`.
 * - Array or vector inputs run element-wise: one scalar case per element,
 *   the expected outputs indexed the same way. `loadTestData` does this for
 *   fixture rows (see `expandArrayRows`).
 * - A fixture test runs every row its upstream counterpart means to run, even
 *   where upstream's filter misses rows (the PMV tests match lowercase
 *   `"iso"`/`"ashrae"` against the fixture's uppercase labels).
 * - Error classes follow ADR 0022: `TypeError` for a wrong type, `RangeError`
 *   for a value outside its range or option set, `Error` otherwise. Assert
 *   the message too where upstream matches one (`pytest.raises(match=...)`).
 * - A `UserWarning` assertion becomes an assertion on the `warnings` rows. A
 *   `match=` on a range warning's text becomes assertions on the row's key,
 *   value and bound, as `expect.objectContaining({ key, value, bound })`, and
 *   an assertion of no warning with `limit_inputs` off becomes the registered
 *   gate-off rows (ADR 0024).
 * - For any upstream test that cannot be ported, write
 *   `test.todo("<upstream name>: <reason>")` so the gap stays visible in the
 *   test runner.
 * - Whole-object equality (`assert result == {...}`) becomes a field-by-field
 *   check of upstream's fields; extra JS-only fields on the result are fine.
 * - JS-only tests live in their own `describe` in the same file, after the
 *   mirrored ones. A JS-only test that a mirrored test now covers with the
 *   same inputs is deleted.
 * - A JS-only test compares an unrounded value with a value measured on
 *   upstream, or with any full-precision float, within `DEFAULT_TOLERANCE`
 *   (`tests/parity/harness.ts`): `approx(actual, expected, DEFAULT_TOLERANCE)`,
 *   or `expect.toBeApprox(expected, DEFAULT_TOLERANCE)` for a float inside
 *   `toEqual`. ECMA-262 (tc39.es/ecma262, §6.1.6.1.3 and §21.3.2, read
 *   2026-11-05) lets `**`, `Math.pow`, `Math.exp`, `Math.log` and the
 *   trigonometric functions return an "implementation-approximated" value, so
 *   their last bits can change with the engine. It compares exactly: a value
 *   the library rounds; an exact result (0, -0, ±Infinity, a NaN check, an
 *   integer, a boolean, a string, identity) or a value computed only with
 *   `+ - * /` and `Math.sqrt`, which ECMA-262 defines as correctly rounded; a
 *   value whose exact bits at a threshold or bin edge are the test's subject,
 *   with a comment saying a failure on a new engine is a parity finding to
 *   investigate, not a tolerance to widen; and the library compared with
 *   itself. A test that already compares within a tolerance keeps it.
 */
import { expect } from "vitest";
import * as pkg from "../../src/index.ts";
import type { ModelInfo } from "../../src/index.ts";

/**
 * Each v2 model info the package exports: a `*_INFO` export whose every input
 * has a `kind`.
 */
export const v2_infos = Object.entries(pkg as Record<string, unknown>)
  .filter(([export_name]) => export_name.endsWith("_INFO"))
  .map(([export_name, info]) => ({ export_name, info: info as ModelInfo }))
  .filter(({ info }) =>
    Object.values(info.inputs).every((entry) => "kind" in entry),
  );

/**
 * Whether `actual` is within `abs + rel * |expected|` of `expected`, numpy's
 * `isclose` form; the defaults are the header's 1e-6 absolute. A mirrored
 * test passes what upstream's comparison uses, its defaults included:
 * `np.isclose` and `np.allclose` rtol 1e-5 and atol 1e-8,
 * `np.testing.assert_allclose` rtol 1e-7 and atol 0, and `pytest.approx`
 * rel 1e-6 (its absolute 1e-12 taken as 0, since it takes the larger of the
 * two rather than their sum). A NaN, an infinity or a nullable output's `null`
 * is close to nothing, where `np.isclose` takes an infinity as close to
 * itself.
 *
 * @param actual - the value under test
 * @param expected - the reference value
 * @param tolerance - `rel`, relative to `|expected|`, and `abs`
 * @returns whether the two are within the tolerance
 */
export function approx(
  actual: number | null,
  expected: number,
  { rel = 0, abs = 1e-6 }: { rel?: number; abs?: number } = {},
): boolean {
  if (actual === null) return false;
  return Math.abs(actual - expected) <= abs + rel * Math.abs(expected);
}

declare module "vitest" {
  interface AsymmetricMatchersContaining {
    /**
     * `approx` as an asymmetric matcher, for a float inside `toEqual`:
     * `expect.toBeApprox(expected, tolerance)` stands where the float goes,
     * hence its `number` type.
     */
    toBeApprox: (
      expected: number,
      tolerance?: { rel?: number; abs?: number },
    ) => number;
  }
}

expect.extend({
  toBeApprox(
    received: number | null,
    expected: number,
    tolerance?: { rel?: number; abs?: number },
  ) {
    return {
      pass: approx(received, expected, tolerance),
      message: () =>
        `expected ${String(received)} to be within ` +
        `${JSON.stringify(tolerance ?? {})} of ${String(expected)}`,
    };
  },
});

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
    // One length, by the two checks above.
    const [length = 0] = lengths;
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
  return_array = false,
): Promise<{
  testData: Fixture;
  tolerances: Record<string, number> | undefined;
}> {
  let test_data: Fixture;
  let tolerances: Record<string, number> | undefined;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    test_data = (await response.json()) as Fixture;
    tolerances = test_data.tolerance;
  } catch (error) {
    console.error("Unable to fetch or parse test data:", error);
    throw error;
  }

  // If return_array is false, expand rows with array inputs into scalar cases.
  // Callers iterate `testData.data`, so an empty dataset would register
  // zero tests yet report green; assertNonEmptyRows turns that into a hard
  // failure with a descriptive message.
  if (!return_array && Array.isArray(test_data.data)) {
    test_data.data = assertNonEmptyRows(
      expandArrayRows(test_data.data),
      `loadTestData (url=${url})`,
    );
  }
  return { testData: test_data, tolerances };
}

/**
 * Validates the model's output against the expected outputs using specified tolerances.
 *
 * @param {*} model_result - The output from the model function, which can be either a primitive value or an object.
 * @param {Object} expected_outputs - An object containing the expected outputs, with keys matching those in model_result.
 * @param {Object} tolerances - An object specifying tolerance values for numeric comparisons for each key.
 * @param {Object} inputs - The input parameters used to generate model_result, logged in case of test failure.
 */

export function validateResult(
  model_result: unknown,
  expected_outputs: Record<string, unknown>,
  tolerances: Record<string, number> | undefined,
  inputs: unknown,
): void {
  // Silent-skip guards. Without these, an empty/missing `expected_outputs`
  // makes Object.keys(...).forEach run zero assertions and the test reports
  // green. A null/undefined `model_result` against non-empty expectations is
  // also treated as a hard failure rather than letting the property access
  // throw mid-loop with a confusing TypeError.
  if (
    typeof (expected_outputs as unknown) !== "object" ||
    (expected_outputs as unknown) === null
  ) {
    throw new Error(
      "validateResult: expectedOutputs must be a non-null object.",
    );
  }
  const expected_keys = Object.keys(expected_outputs);
  if (expected_keys.length === 0) {
    throw new Error(
      "validateResult: expectedOutputs is empty; refusing to run zero assertions.",
    );
  }
  if (model_result === null || model_result === undefined) {
    throw new Error(
      "validateResult: modelResult is null/undefined but expectedOutputs has keys.",
    );
  }

  try {
    expected_keys.forEach((key) => {
      // A primitive model_result indexes to undefined, which the assertions
      // below then report against the expected value.
      const actual_value = (model_result as Record<string, unknown>)[key];
      // The data write upstream's NaN as null, which a nullable output
      // returns as null (decision 310), so null compares exactly.
      const expected_value = expected_outputs[key];

      // Use the specified tolerance if available, otherwise upstream's 1e-6
      const tol = tolerances?.[key] ?? 1e-6;

      // Handle arrays
      if (Array.isArray(expected_value)) {
        expect(Array.isArray(actual_value)).toBe(true);
        // Length check guards against the silent-skip where a longer actual
        // array slips trailing elements past the per-index loop.
        expect(actual_value).toHaveLength(expected_value.length);
        expected_value.forEach((exp: unknown, index) => {
          const act = (actual_value as unknown[])[index];
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
      } else if (typeof expected_value === "number") {
        // Handle numeric values
        if (isNaN(expected_value)) {
          expect(actual_value).toBeNaN();
        } else {
          // typeof guard prevents JS coercion false-passes (see array branch).
          expect(typeof actual_value).toBe("number");
          expect(
            Math.abs((actual_value as number) - expected_value),
          ).toBeLessThanOrEqual(tol + Number.EPSILON * 100);
        }
      } else {
        // For booleans or other types
        expect(actual_value).toEqual(expected_value);
      }
    });
  } catch (error) {
    console.log("Test failed with the following context:");
    console.log("Inputs:", inputs);
    console.log("Expected outputs:", expected_outputs);
    console.log("Model outputs:", model_result);
    throw error;
  }
}
