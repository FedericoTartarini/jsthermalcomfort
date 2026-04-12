import { describe, expect, it, test } from "@jest/globals";
import { wbgt } from "../../src/models/wbgt";
import { testDataUrls } from "./comftest"; // Import all test URLs from comftest.js
import { loadTestData, validateResult } from "./testUtils"; // Import utility functions

let returnArray = false;

// use top-level await to load test data before tests are defined.
let { testData, tolerances } = await loadTestData(
  testDataUrls.wbgt,
  returnArray,
);

describe("wbgt", () => {
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { twb, tg, tdb, with_solar_load, round } = inputs;
    const modelResult = wbgt(twb, tg, { tdb, with_solar_load, round });

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });

  it("should throw an error when with_solar_load is set and tdb is not provided", () => {
    try {
      wbgt(0, 0, { with_solar_load: true });
    } catch (error) {
      // Verify specific error message
      expect(error.message).toBe("Please enter the dry bulb air temperature");
    }
  });
});

describe("wbgt invalid input", () => {
  const valid = { twb: 25, tg: 32 };

  describe("with round=true (default)", () => {
    test.each([
      ["twb", { ...valid, twb: undefined }],
      ["tg", { ...valid, tg: "string" }],
      ["twb", { ...valid, twb: null }],
      ["tg", { ...valid, tg: NaN }],
      ["twb", { ...valid, twb: Infinity }],
    ])("returns NaN when %s is invalid", (_label, args) => {
      const result = wbgt(args.twb, args.tg);
      expect(result).toBeNaN();
    });
  });

  describe("with round=false", () => {
    test.each([
      ["twb", { ...valid, twb: undefined }],
      ["tg", { ...valid, tg: "string" }],
      ["twb", { ...valid, twb: null }],
      ["tg", { ...valid, tg: NaN }],
      ["twb", { ...valid, twb: Infinity }],
    ])("returns NaN object when %s is invalid", (_label, args) => {
      const result = wbgt(args.twb, args.tg, { round: false });
      expect(result.wbgt).toBeNaN();
    });
  });
});
