import { describe, expect, test } from "@jest/globals";
import { utci } from "../../src/models/utci.js";
import { testDataUrls } from "./comftest"; // Import all test URLs from comftest.js
import { loadTestData, validateResult } from "./testUtils"; // Import utility functions

let returnArray = false;

// use top-level await to load test data before tests are defined.
let { testData, tolerances } = await loadTestData(
  testDataUrls.utci,
  returnArray,
);

describe("utci", () => {
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { tdb, tr, rh, v, units } = inputs;
    const return_stress_category =
      inputs.return_stress_category || !!expectedOutput.stress_category;
    const modelResult = utci(tdb, tr, v, rh, units, return_stress_category);

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });
});

describe("utci invalid input", () => {
  const valid = { tdb: 25, tr: 25, v: 0.5, rh: 50 };

  test.each([
    ["tdb", { ...valid, tdb: undefined }],
    ["tr", { ...valid, tr: "string" }],
    ["v", { ...valid, v: null }],
    ["rh", { ...valid, rh: NaN }],
    ["tdb", { ...valid, tdb: Infinity }],
  ])("returns NaN when %s is invalid", (_label, args) => {
    const result = utci(args.tdb, args.tr, args.v, args.rh);
    expect(result.utci).toBeNaN();
  });
});
