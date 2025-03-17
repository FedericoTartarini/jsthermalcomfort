import { describe, test } from "@jest/globals";
import { a_pmv } from "../../src/models/a_pmv.js";
import { testDataUrls } from "./comftest";
import { loadTestData, validateResult } from "./testUtils"; // Use the utils

let output_variable = "a_pmv";

// use top-level await to load test data before tests are defined.
const { testData, tolerance } = await loadTestData(
  testDataUrls.aPmv,
  output_variable,
);

describe(output_variable, () => {
  test.each(testData.data.map((testCase, index) => [index, testCase]))(
    "Test case #%d",
    (_, testCase) => {
      const { inputs, outputs } = testCase;
      const expected = outputs.a_pmv;

      const { tdb, tr, vr, rh, met, clo, a_coefficient, wme } = inputs;
      const result = a_pmv(tdb, tr, vr, rh, met, clo, a_coefficient, wme);

      validateResult(result, expected, tolerance, { inputs, expected });
    },
  );
});
