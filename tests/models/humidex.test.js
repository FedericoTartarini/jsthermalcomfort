import { describe, expect, test } from "@jest/globals";
import { humidex } from "../../src/models/humidex";
import { testDataUrls } from "./comftest";
import { loadTestData, validateResult } from "./testUtils"; // Import shared utilities

let returnArray = false;

// use top-level await to load test data before tests are defined.
let { testData, tolerances } = await loadTestData(
  testDataUrls.humidex,
  returnArray,
);

describe("humidex", () => {
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { tdb, rh, options } = inputs;
    const modelResult = humidex(tdb, rh, options);

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });
});

describe("humidex invalid input", () => {
  const valid = { tdb: 25, rh: 50 };

  test.each([
    ["tdb=undefined", { ...valid, tdb: undefined }],
    ["rh='string'", { ...valid, rh: "string" }],
    ["tdb=null", { ...valid, tdb: null }],
    ["rh=NaN", { ...valid, rh: NaN }],
    ["tdb=Infinity", { ...valid, tdb: Infinity }],
  ])("returns NaN result when %s is invalid", (_label, args) => {
    const result = humidex(args.tdb, args.rh);
    expect(result.humidex).toBeNaN();
  });
});
