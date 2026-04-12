import { describe, expect, test } from "@jest/globals";
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

describe("pmv_ppd invalid input", () => {
  const valid = { tdb: 25, tr: 25, vr: 0.1, rh: 50, met: 1.2, clo: 0.5 };

  test.each([
    ["tdb", { ...valid, tdb: undefined }],
    ["tr", { ...valid, tr: "string" }],
    ["vr", { ...valid, vr: null }],
    ["rh", { ...valid, rh: NaN }],
    ["met", { ...valid, met: Infinity }],
    ["clo", { ...valid, clo: undefined }],
  ])("returns NaN result when %s is invalid", (_label, args) => {
    const result = pmv_ppd(
      args.tdb,
      args.tr,
      args.vr,
      args.rh,
      args.met,
      args.clo,
    );
    expect(result.pmv).toBeNaN();
  });
});
