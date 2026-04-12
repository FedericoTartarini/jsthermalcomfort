import { describe, expect, test } from "@jest/globals";
import { wc } from "../../src/models/wc.js";
import { testDataUrls } from "./comftest"; // Import all test URLs from comftest.js
import { loadTestData, validateResult } from "./testUtils"; // Import utility functions

let returnArray = false;

// use top-level await to load test data before tests are defined.
let { testData, tolerances } = await loadTestData(testDataUrls.wc, returnArray);

describe("test_wc", () => {
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { tdb, v, round } = inputs;
    const kwargs = { round };
    const modelResult = wc(tdb, v, kwargs);

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });
});

describe("wc invalid input", () => {
  const valid = { tdb: -5, v: 5 };

  test.each([
    ["tdb", { ...valid, tdb: undefined }],
    ["v", { ...valid, v: "string" }],
    ["tdb", { ...valid, tdb: null }],
    ["v", { ...valid, v: NaN }],
    ["tdb", { ...valid, tdb: Infinity }],
  ])("returns NaN when %s is invalid", (_label, args) => {
    const result = wc(args.tdb, args.v);
    expect(result.wci).toBeNaN();
  });
});
