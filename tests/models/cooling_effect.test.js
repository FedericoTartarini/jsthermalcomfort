import { describe } from "@jest/globals";
import { cooling_effect } from "../../src/models/cooling_effect";
import { testDataUrls } from "./comftest"; // Import all test URLs from comftest.js
import { loadTestData, validateResult } from "./testUtils"; // Import utility functions

let returnArray = false;

// use top-level await to load test data before tests are defined.
let { testData, tolerances } = await loadTestData(
  testDataUrls.coolingEffect,
  returnArray,
);

describe("cooling_effect", () => {
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { tdb, tr, vr, rh, met, clo, wme, units } = inputs;
    const modelResult = cooling_effect(tdb, tr, vr, rh, met, clo, wme, units);

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });
});
