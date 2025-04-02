import { describe } from "@jest/globals";
import { discomfort_index } from "../../src/models/discomfort_index";
import { testDataUrls } from "./comftest";
import { loadTestData, validateResult } from "./testUtils"; // Import shared utilities

let returnArray = false;

// use top-level await to load test data before tests are defined.
let { testData, tolerances } = await loadTestData(
  testDataUrls.discomfortIndex,
  returnArray,
);

describe("discomfort_index", () => {
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { tdb, rh } = inputs;
    const modelResult = discomfort_index(tdb, rh);

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });
});
