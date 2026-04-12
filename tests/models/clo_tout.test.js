import { describe, expect } from "@jest/globals";
import { clo_tout } from "../../src/models/clo_tout";
import { testDataUrls } from "./comftest";
import { loadTestData, validateResult } from "./testUtils";

let returnArray = false;

// use top-level await to load test data before tests are defined.
let { testData, tolerances } = await loadTestData(
  testDataUrls.cloTout,
  returnArray,
);

describe("clo_tout", () => {
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { tout, units } = inputs;
    const modelResult = clo_tout(tout, units);

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });
});

describe("clo_tout invalid input", () => {
  const valid = { tout: 25 };

  test.each([
    ["tout (undefined)", { ...valid, tout: undefined }],
    ["tout (string)", { ...valid, tout: "string" }],
    ["tout (null)", { ...valid, tout: null }],
    ["tout (NaN)", { ...valid, tout: NaN }],
    ["tout (Infinity)", { ...valid, tout: Infinity }],
  ])("returns NaN result when %s is invalid", (_label, args) => {
    const result = clo_tout(args.tout);
    expect(result.clo_tout).toBeNaN();
  });
});
