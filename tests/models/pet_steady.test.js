import { describe, expect, test } from "@jest/globals";
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

// ---------------------------------------------------------------------------
// Input validation tests
// ---------------------------------------------------------------------------
describe("pet_steady input validation", () => {
  test.each([
    ["tdb", "20", 20, 0.15, 50, 1.37, 0.5],
    ["tr", 20, "20", 0.15, 50, 1.37, 0.5],
    ["v", 20, 20, "0.15", 50, 1.37, 0.5],
    ["rh", 20, 20, 0.15, "50", 1.37, 0.5],
    ["met", 20, 20, 0.15, 50, "1.37", 0.5],
    ["clo", 20, 20, 0.15, 50, 1.37, "0.5"],
  ])("throws TypeError if %s is not a number", (_, ...args) => {
    expect(() => pet_steady(...args)).toThrow(TypeError);
  });
});
