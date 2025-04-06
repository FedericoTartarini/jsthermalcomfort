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
