import { beforeAll, describe, expect, it } from "@jest/globals";
import { a_pmv } from "../../src/models/a_pmv.js";
import { testDataUrls } from "./comftest";
import { loadTestData, shouldSkipTest } from "./testUtils"; // Use the utils

let testData;
let tolerance;

beforeAll(async () => {
  const result = await loadTestData(testDataUrls.aPmv, "a_pmv");
  testData = result.testData;
  tolerance = result.tolerance;
});

describe("a_pmv", () => {
  it("Runs the test after data is loaded and skips data containing arrays", () => {
    testData.data.forEach((testCase) => {
      const { inputs, outputs } = testCase;
      const expected = outputs.a_pmv;
      console.log("Inputs: ", inputs);
      console.log("Expected: ", expected);

      if (shouldSkipTest(inputs)) {
        console.log("Skipping test with array data");
        return; // skip the test
      }

      const { tdb, tr, vr, rh, met, clo, a_coefficient, wme } = inputs;
      const result = a_pmv(tdb, tr, vr, rh, met, clo, a_coefficient, wme);

      if (isNaN(result) || expected === null) {
        expect(result).toBeNaN();
      } else {
        expect(result).toBeCloseTo(expected, tolerance);
        console.log("actually close!");
      }
    });
  });
});
