import { describe, test } from "@jest/globals";
import { adaptive_en } from "../../src/models/adaptive_en";
import { testDataUrls } from "./comftest";
import { loadTestData, validateResult } from "./testUtils"; // use the utils

let returnArray = false;

let { testData, tolerance } = await loadTestData(
  testDataUrls.adaptiveEn,
  returnArray,
);

describe("adaptive_en", () => {
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { tdb, tr, t_running_mean, v, units } = inputs;
    const modelResult = adaptive_en(tdb, tr, t_running_mean, v, units);

    validateResult(modelResult, expectedOutput, tolerance, inputs);
  });
});
