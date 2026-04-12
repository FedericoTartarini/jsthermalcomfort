import { describe, expect, test } from "@jest/globals";
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

describe("vertical_tmp_grad_ppd invalid input", () => {
  const valid = {
    tdb: 25,
    tr: 25,
    vr: 0.1,
    rh: 50,
    met: 1.2,
    clo: 0.5,
    vertical_tmp_grad: 5,
  };

  test.each([
    ["tdb", { ...valid, tdb: undefined }],
    ["tr", { ...valid, tr: "string" }],
    ["vr", { ...valid, vr: null }],
    ["rh", { ...valid, rh: NaN }],
    ["met", { ...valid, met: Infinity }],
    ["clo", { ...valid, clo: undefined }],
    ["vertical_tmp_grad", { ...valid, vertical_tmp_grad: undefined }],
  ])("returns NaN when %s is invalid", (_label, args) => {
    const result = vertical_tmp_grad_ppd(
      args.tdb,
      args.tr,
      args.vr,
      args.rh,
      args.met,
      args.clo,
      args.vertical_tmp_grad,
    );
    expect(result.ppd_vg).toBeNaN();
  });
});
