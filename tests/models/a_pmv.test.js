import { describe, expect, test } from "@jest/globals";
import { a_pmv } from "../../src/models/a_pmv.js";
import { testDataUrls } from "./comftest";
import { loadTestData } from "./testUtils"; // Use the utils

// use top-level await to load test data before tests are defined.
const { testData, tolerance } = await loadTestData(testDataUrls.aPmv, "a_pmv");

describe("a_pmv", () => {
  test.each(testData.data.map((testCase, index) => [index, testCase]))(
    "Test case #%d",
    (index, testCase) => {
      const { inputs, outputs } = testCase;
      const expected = outputs.a_pmv;
      console.log(`Running test case #${index + 1}:`, inputs, expected);

      const { tdb, tr, vr, rh, met, clo, a_coefficient, wme } = inputs;
      const result = a_pmv(tdb, tr, vr, rh, met, clo, a_coefficient, wme);

      // if expected is an array, then result should be an array
      if (Array.isArray(expected)) {
        expect(Array.isArray(result)).toBe(true);
        // compare elements in the array
        result.forEach((element, index) => {
          if (isNaN(element) || expected[index] === null) {
            expect(element).toBeNaN();
          } else {
            expect(element).toBeCloseTo(expected[index], tolerance);
          }
        });
      } else {
        expect(Array.isArray(result)).toBe(false);
        if (isNaN(result) || expected === null) {
          expect(result).toBeNaN();
        } else {
          expect(result).toBeCloseTo(expected, tolerance);
        }
      }
    },
  );
});
