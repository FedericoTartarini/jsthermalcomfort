import { describe, expect } from "@jest/globals";
import { athb } from "../../src/models/athb.js";
import { testDataUrls } from "./comftest";
import { loadTestData, validateResult } from "./testUtils"; // Import shared utilities

let returnArray = false;

// use top-level await to load test data before tests are defined.
let { testData, tolerances } = await loadTestData(
  testDataUrls.athb,
  returnArray,
);

describe("athb", () => {
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { tdb, tr, vr, rh, met, t_running_mean } = inputs;
    const modelResult = athb(tdb, tr, vr, rh, met, t_running_mean);

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });
});

describe("athb invalid input", () => {
  const valid = {
    tdb: 25,
    tr: 25,
    vr: 0.1,
    rh: 50,
    met: 1.1,
    t_running_mean: 20,
  };

  test.each([
    ["tdb", { ...valid, tdb: undefined }],
    ["tr", { ...valid, tr: "string" }],
    ["vr", { ...valid, vr: null }],
    ["rh", { ...valid, rh: NaN }],
    ["met", { ...valid, met: Infinity }],
  ])("returns NaN result when %s is invalid", (_label, args) => {
    const result = athb(
      args.tdb,
      args.tr,
      args.vr,
      args.rh,
      args.met,
      args.t_running_mean,
    );
    expect(result.athb_pmv).toBeNaN();
  });
});
