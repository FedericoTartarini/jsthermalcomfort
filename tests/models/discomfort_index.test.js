import { describe, expect } from "@jest/globals";
import { discomfort_index } from "../../src/models/discomfort_index";
import { testDataUrls } from "./comftest";
import { loadTestData, validateResult } from "./testUtils"; // Import shared utilities

let returnArray = false;

// use top-level await to load test data before tests are defined.
let { testData, tolerances } = await loadTestData(
  testDataUrls.discomfortIndex,
  returnArray,
);

describe("discomfort_index", () => {
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { tdb, rh } = inputs;
    const modelResult = discomfort_index(tdb, rh);

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });
});

describe("discomfort_index invalid input", () => {
  const valid = { tdb: 25, rh: 50 };

  test.each([
    ["tdb (undefined)", { ...valid, tdb: undefined }],
    ["rh (string)", { ...valid, rh: "string" }],
    ["tdb (null)", { ...valid, tdb: null }],
    ["rh (NaN)", { ...valid, rh: NaN }],
    ["tdb (Infinity)", { ...valid, tdb: Infinity }],
  ])("returns NaN result when %s is invalid", (_label, args) => {
    const result = discomfort_index(args.tdb, args.rh);
    expect(result.di).toBeNaN();
  });
});
