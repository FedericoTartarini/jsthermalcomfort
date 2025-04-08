import { describe, test } from "@jest/globals";
import { pmv_ppd } from "../../src/models/pmv_ppd.js";
import { testDataUrls } from "./comftest";
import { loadTestData, validateResult } from "./testUtils.js";

let returnArray = false;

// use top-level await to load test data before tests are defined.
let { testData, tolerances } = await loadTestData(
  testDataUrls.pmvPpd,
  returnArray,
);

describe("pmv_pdd", () => {
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const {
      tdb,
      tr,
      vr,
      rh,
      met,
      clo,
      wme,
      standard,
      units,
      limit_inputs,
      airspeed_control,
    } = inputs;

    const kwargs = {
      units,
      limit_inputs,
      airspeed_control,
    };

    const modelResult = pmv_ppd(
      tdb,
      tr,
      vr,
      rh,
      met,
      clo,
      wme,
      standard,
      kwargs,
    );

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });
});
