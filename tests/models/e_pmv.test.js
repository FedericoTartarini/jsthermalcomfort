import { describe, test } from "@jest/globals";
import { e_pmv } from "../../src/models/e_pmv";
import { testDataUrls } from "./comftest";
import { loadTestData, validateResult } from "./testUtils"; // Import shared utilities

let returnArray = false;

// use top-level await to load test data before tests are defined.
let { testData, tolerances } = await loadTestData(
  testDataUrls.ePmv,
  returnArray,
);

describe("e_pmv", () => {
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { tdb, tr, vr, rh, met, clo, e_coefficient } = inputs;
    const modelResult = e_pmv(tdb, tr, vr, rh, met, clo, e_coefficient);

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });
});
