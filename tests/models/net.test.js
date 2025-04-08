import { describe, test } from "@jest/globals";
import { net } from "../../src/models/net";
import { testDataUrls } from "./comftest";
import { loadTestData, validateResult } from "./testUtils"; // Import shared utilities

let returnArray = false;

// use top-level await to load test data before tests are defined.
let { testData, tolerances } = await loadTestData(
  testDataUrls.net,
  returnArray,
);

describe("net", () => {
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { tdb, rh, v, options } = inputs;
    const modelResult = net(tdb, rh, v, options);

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });
});
