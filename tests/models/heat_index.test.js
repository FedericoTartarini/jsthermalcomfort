import { describe, expect, test } from "@jest/globals";
import { heat_index } from "../../src/models/heat_index";
import { testDataUrls } from "./comftest";
import { loadTestData, validateResult } from "./testUtils"; // Import shared utilities

let returnArray = false;

// use top-level await to load test data before tests are defined.
let { testData, tolerances } = await loadTestData(
  testDataUrls.heatIndex,
  returnArray,
);

describe("heat_index", () => {
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { tdb, rh, options } = inputs;
    const modelResult = heat_index(tdb, rh, options);

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });
});

describe("heat_index invalid input", () => {
  const valid = { tdb: 30, rh: 80 };

  test.each([
    ["tdb=undefined", { ...valid, tdb: undefined }],
    ["rh='string'", { ...valid, rh: "string" }],
    ["tdb=null", { ...valid, tdb: null }],
    ["rh=NaN", { ...valid, rh: NaN }],
    ["tdb=Infinity", { ...valid, tdb: Infinity }],
  ])("returns NaN result when %s is invalid", (_label, args) => {
    const result = heat_index(args.tdb, args.rh);
    expect(result.hi).toBeNaN();
  });
});
