import { describe } from "@jest/globals";
import { humidex } from "../../src/models/humidex";
import { testDataUrls } from "./comftest";
import { loadTestData, validateResult } from "./testUtils"; // Import shared utilities

let returnArray = false;

// use top-level await to load test data before tests are defined.
let { testData, tolerances } = await loadTestData(
  testDataUrls.humidex,
  returnArray,
);

describe("humidex", () => {
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { tdb, rh, options } = inputs;
    const modelResult = humidex(tdb, rh, options);

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });
});
