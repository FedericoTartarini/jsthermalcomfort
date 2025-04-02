import { describe, test } from "@jest/globals";
import { heat_index } from "../../src/models/heat_index";
import { testDataUrls } from "./comftest";
import { loadTestData, validateResult } from "./testUtils"; // Import shared utilities

let returnArray = false;

// use top-level await to load test data before tests are defined.
let { testData, tolerances } = await loadTestData(
  testDataUrls.heatIndex,
  returnArray,
);

describe("heat_index", () => {
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { tdb, rh, options } = inputs;
    const modelResult = heat_index(tdb, rh, options);

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });
});
