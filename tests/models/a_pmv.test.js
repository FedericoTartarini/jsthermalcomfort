import { describe, expect, test } from "@jest/globals";
import { a_pmv } from "../../src/models/a_pmv.js";
import { testDataUrls } from "./comftest";
import { loadTestData, validateResult } from "./testUtils"; // Use the utils

let returnArray = false;

// use top-level await to load test data before tests are defined.
let { testData, tolerances } = await loadTestData(
  testDataUrls.aPmv,
  returnArray,
);

describe("a_pmv", () => {
  // automatically number each test case
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { tdb, tr, vr, rh, met, clo, a_coefficient, wme } = inputs;

    const modelResult = a_pmv(tdb, tr, vr, rh, met, clo, a_coefficient, wme);

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });
});

describe("a_pmv invalid input", () => {
  const valid = {
    tdb: 25,
    tr: 25,
    vr: 0.1,
    rh: 50,
    met: 1.2,
    clo: 0.5,
    a_coefficient: 0.293,
  };

  test.each([
    ["tdb", { ...valid, tdb: undefined }],
    ["tr", { ...valid, tr: "string" }],
    ["vr", { ...valid, vr: null }],
    ["rh", { ...valid, rh: NaN }],
    ["met", { ...valid, met: Infinity }],
    ["clo", { ...valid, clo: undefined }],
    ["a_coefficient", { ...valid, a_coefficient: undefined }],
  ])("returns NaN result when %s is invalid", (_label, args) => {
    const result = a_pmv(
      args.tdb,
      args.tr,
      args.vr,
      args.rh,
      args.met,
      args.clo,
      args.a_coefficient,
    );
    expect(result.a_pmv).toBeNaN();
  });
});
