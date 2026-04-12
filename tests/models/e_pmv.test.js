import { describe, expect, test } from "@jest/globals";
import { e_pmv } from "../../src/models/e_pmv";
import { testDataUrls } from "./comftest";
import { loadTestData, validateResult } from "./testUtils"; // Import shared utilities

let returnArray = false;

// use top-level await to load test data before tests are defined.
let { testData, tolerances } = await loadTestData(
  testDataUrls.ePmv,
  returnArray,
);

describe("e_pmv", () => {
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { tdb, tr, vr, rh, met, clo, e_coefficient } = inputs;
    const modelResult = e_pmv(tdb, tr, vr, rh, met, clo, e_coefficient);

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });
});

describe("e_pmv invalid input", () => {
  const valid = {
    tdb: 25,
    tr: 25,
    vr: 0.1,
    rh: 50,
    met: 1.2,
    clo: 0.5,
    e_coefficient: 0.6,
  };

  test.each([
    ["tdb", { ...valid, tdb: undefined }],
    ["tr", { ...valid, tr: "string" }],
    ["vr", { ...valid, vr: null }],
    ["rh", { ...valid, rh: NaN }],
    ["met", { ...valid, met: Infinity }],
    ["clo", { ...valid, clo: undefined }],
    ["e_coefficient", { ...valid, e_coefficient: undefined }],
  ])("returns NaN result when %s is invalid", (_label, args) => {
    const result = e_pmv(
      args.tdb,
      args.tr,
      args.vr,
      args.rh,
      args.met,
      args.clo,
      args.e_coefficient,
    );
    expect(result.e_pmv).toBeNaN();
  });
});
