import { describe } from "@jest/globals";
import { vertical_tmp_grad_ppd } from "../../src/models/vertical_tmp_grad_ppd";
import { testDataUrls } from "./comftest"; // Import all test URLs from comftest.js
import { loadTestData, validateResult } from "./testUtils"; // Import utility functions

let returnArray = false;

// use top-level await to load test data before tests are defined.
let { testData, tolerances } = await loadTestData(
  testDataUrls.verticalTmpGradPpd,
  returnArray,
);

describe("vertical_tmp_grad_ppd", () => {
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { tdb, tr, vr, rh, met, clo, vertical_tmp_grad, units } = inputs;
    const modelResult = vertical_tmp_grad_ppd(
      tdb,
      tr,
      vr,
      rh,
      met,
      clo,
      vertical_tmp_grad,
      units,
    );

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });
});

// ---------------------------------------------------------------------------
// Input validation tests
// ---------------------------------------------------------------------------
describe("vertical_tmp_grad_ppd input validation", () => {
  test.each([
    ["tdb", "25", 25, 0.1, 50, 1.2, 0.5, 7],
    ["tr", 25, "25", 0.1, 50, 1.2, 0.5, 7],
    ["vr", 25, 25, "0.1", 50, 1.2, 0.5, 7],
    ["rh", 25, 25, 0.1, "50", 1.2, 0.5, 7],
    ["met", 25, 25, 0.1, 50, "1.2", 0.5, 7],
    ["clo", 25, 25, 0.1, 50, 1.2, "0.5", 7],
    ["vertical_tmp_grad", 25, 25, 0.1, 50, 1.2, 0.5, "7"],
  ])("throws TypeError if %s is not a number", (_, ...args) => {
    expect(() => vertical_tmp_grad_ppd(...args)).toThrow(TypeError);
  });

  test("throws Error if units is not a valid enum", () => {
    expect(() =>
      vertical_tmp_grad_ppd(25, 25, 0.1, 50, 1.2, 0.5, 7, "INVALID"),
    ).toThrow(Error);
  });
});
