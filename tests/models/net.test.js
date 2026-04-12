import { describe, expect, test } from "@jest/globals";
import { net } from "../../src/models/net";
import { testDataUrls } from "./comftest";
import { loadTestData, validateResult } from "./testUtils"; // Import shared utilities

let returnArray = false;

// use top-level await to load test data before tests are defined.
let { testData, tolerances } = await loadTestData(
  testDataUrls.net,
  returnArray,
);

describe("net", () => {
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { tdb, rh, v, options } = inputs;
    const modelResult = net(tdb, rh, v, options);

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });
});

describe("net invalid input", () => {
  const valid = { tdb: 37, rh: 100, v: 3.5 };

  test.each([
    ["tdb=undefined", { ...valid, tdb: undefined }],
    ["rh='string'", { ...valid, rh: "string" }],
    ["v=null", { ...valid, v: null }],
    ["tdb=NaN", { ...valid, tdb: NaN }],
    ["rh=Infinity", { ...valid, rh: Infinity }],
  ])("returns NaN result when %s is invalid", (_label, args) => {
    const result = net(args.tdb, args.rh, args.v);
    expect(result.net).toBeNaN();
  });
});
