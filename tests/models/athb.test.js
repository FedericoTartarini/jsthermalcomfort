import { describe } from "@jest/globals";
import { athb } from "../../src/models/athb.js";
import { testDataUrls } from "./comftest";
import { loadTestData, validateResult } from "./testUtils"; // Import shared utilities

let returnArray = false;

// use top-level await to load test data before tests are defined.
let { testData, tolerances } = await loadTestData(
  testDataUrls.athb,
  returnArray,
);

describe("athb", () => {
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { tdb, tr, vr, rh, met, t_running_mean } = inputs;
    const modelResult = athb(tdb, tr, vr, rh, met, t_running_mean);

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });
});
