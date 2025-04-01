import { describe, test } from "@jest/globals";
import { a_pmv } from "../../src/models/a_pmv.js";
import { testDataUrls } from "./comftest";
import { loadTestData, validateResult } from "./testUtils"; // Use the utils

let returnArray = false;

// use top-level await to load test data before tests are defined.
let { testData, tolerances } = await loadTestData(
  testDataUrls.aPmv,
  returnArray,
);

describe("a_pmv", () => {
  // automatically number each test case
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { tdb, tr, vr, rh, met, clo, a_coefficient, wme } = inputs;

    const modelResult = a_pmv(tdb, tr, vr, rh, met, clo, a_coefficient, wme);

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });
});
