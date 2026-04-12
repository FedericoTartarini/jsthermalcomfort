import { describe, expect, test } from "@jest/globals";
import { at } from "../../src/models/at.js";
import { testDataUrls } from "./comftest";
import { loadTestData, validateResult } from "./testUtils"; // Import shared utilities

let returnArray = false;

// use top-level await to load test data before tests are defined.
let { testData, tolerances } = await loadTestData(testDataUrls.at, returnArray);

describe("at", () => {
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { tdb, rh, v, q } = inputs;
    const modelResult = at(tdb, rh, v, q);

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });
});

describe("at invalid input", () => {
  const valid = { tdb: 25, rh: 30, v: 0.1 };

  test.each([
    ["tdb (undefined)", { ...valid, tdb: undefined }],
    ["rh (string)", { ...valid, rh: "string" }],
    ["v (null)", { ...valid, v: null }],
    ["tdb (NaN)", { ...valid, tdb: NaN }],
    ["rh (Infinity)", { ...valid, rh: Infinity }],
  ])("returns NaN result when %s is invalid", (_label, args) => {
    const result = at(args.tdb, args.rh, args.v);
    expect(result.at).toBeNaN();
  });
});
