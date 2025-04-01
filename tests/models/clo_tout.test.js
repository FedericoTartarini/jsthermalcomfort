import { describe } from "@jest/globals";
import { clo_tout } from "../../src/models/clo_tout";
import { testDataUrls } from "./comftest";
import { loadTestData, validateResult } from "./testUtils";

let returnArray = false;

// use top-level await to load test data before tests are defined.
let { testData, tolerances } = await loadTestData(
  testDataUrls.cloTout,
  returnArray,
);

describe("clo_tout", () => {
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { tout, units } = inputs;
    const modelResult = clo_tout(tout, units);

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });
});
