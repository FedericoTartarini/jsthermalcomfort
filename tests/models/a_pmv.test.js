import { describe, test } from "@jest/globals";
import { a_pmv, a_pmv_array } from "../../src/models/a_pmv.js";
import { testDataUrls } from "./comftest";
import { loadTestData, validateResult } from "./testUtils"; // Use the utils

let output_variable = "a_pmv";

// use top-level await to load test data before tests are defined.
let { testData, tolerance } = await loadTestData(
  testDataUrls.aPmv,
  output_variable,
  false,
);

describe(output_variable, () => {
  // automatically number each test case
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs } = testCase;
    const expectedOutput = outputs.a_pmv;
    const { tdb, tr, vr, rh, met, clo, a_coefficient, wme } = inputs;

    // Determine if any input is an array
    const hasArrayInput = Object.values(inputs).some((value) =>
      Array.isArray(value),
    );

    // Choose the appropriate function based on whether any inputs are arrays
    const modelResult = hasArrayInput
      ? a_pmv_array(tdb, tr, vr, rh, met, clo, a_coefficient, wme)
      : a_pmv(tdb, tr, vr, rh, met, clo, a_coefficient, wme);

    validateResult(modelResult, expectedOutput, tolerance, inputs);
  });
});
