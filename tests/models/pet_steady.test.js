import { describe } from "@jest/globals";
import { pet_steady } from "../../src/models/pet_steady";
import { testDataUrls } from "./comftest";
import { loadTestData, validateResult } from "./testUtils"; // Import shared utilities

let returnArray = false;

// use top-level await to load test data before tests are defined.
let { testData, tolerances } = await loadTestData(
  testDataUrls.petSteady,
  returnArray,
);

describe("pet_steady", () => {
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { tdb, tr, v, rh, met, clo } = inputs;
    const modelResult = pet_steady(tdb, tr, v, rh, met, clo);

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });
});
