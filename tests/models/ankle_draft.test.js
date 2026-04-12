import { describe, expect, test } from "@jest/globals";
import { ankle_draft } from "../../src/models/ankle_draft.js";
import { testDataUrls } from "./comftest";
import { loadTestData, validateResult } from "./testUtils"; // Import shared utilities

let returnArray = false;

// use top-level await to load test data before tests are defined.
let { testData, tolerances } = await loadTestData(
  testDataUrls.ankleDraft,
  returnArray,
);

describe("ankle_draft", () => {
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { tdb, tr, vr, rh, met, clo, v_ankle, units } = inputs;
    const modelResult = ankle_draft(tdb, tr, vr, rh, met, clo, v_ankle, units);

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });
});

describe("ankle_draft invalid input", () => {
  const valid = {
    tdb: 25,
    tr: 25,
    vr: 0.2,
    rh: 50,
    met: 1.2,
    clo: 0.5,
    v_ankle: 0.1,
  };

  test.each([
    ["tdb", { ...valid, tdb: undefined }],
    ["tr", { ...valid, tr: "string" }],
    ["vr", { ...valid, vr: null }],
    ["rh", { ...valid, rh: NaN }],
    ["met", { ...valid, met: Infinity }],
    ["clo", { ...valid, clo: undefined }],
    ["v_ankle", { ...valid, v_ankle: undefined }],
  ])("returns NaN result when %s is invalid", (_label, args) => {
    const result = ankle_draft(
      args.tdb,
      args.tr,
      args.vr,
      args.rh,
      args.met,
      args.clo,
      args.v_ankle,
    );
    expect(result.ppd_ad).toBeNaN();
  });
});
