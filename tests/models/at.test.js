import { describe } from "@jest/globals";
import { at } from "../../src/models/at.js";
import { testDataUrls } from "./comftest";
import { loadTestData, validateResult } from "./testUtils"; // Import shared utilities

let returnArray = false;

// use top-level await to load test data before tests are defined.
let { testData, tolerances } = await loadTestData(testDataUrls.at, returnArray);

describe("at", () => {
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { tdb, rh, v, q } = inputs;
    const modelResult = at(tdb, rh, v, q);

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });
});
