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

// ---------------------------------------------------------------------------
// Input validation tests
// ---------------------------------------------------------------------------
describe("clo_tout input validation", () => {
  test("throws TypeError if tout is not a number", () => {
    expect(() => clo_tout("20")).toThrow(TypeError);
  });

  test("throws Error if units is not a valid enum", () => {
    expect(() => clo_tout(20, "INVALID")).toThrow(Error);
  });
});
