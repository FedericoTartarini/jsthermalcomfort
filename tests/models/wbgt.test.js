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
    const { twb, tg, tdb, with_solar_load, round_output } = inputs;
    const modelResult = wbgt(twb, tg, { tdb, with_solar_load, round_output });

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

  it("round_output:true returns value rounded to 1 decimal place", () => {
    const result = wbgt(17.3, 40, { round_output: true });
    expect(result.wbgt).toBe(24.1);
  });

  it("round_output:false returns unrounded value", () => {
    const result = wbgt(17.3, 40, { round_output: false });
    expect(result.wbgt).toBeCloseTo(24.11, 5);
  });

  it("round_output:true and round_output:false produce different results", () => {
    const rounded = wbgt(17.3, 40, { round_output: true }).wbgt;
    const unrounded = wbgt(17.3, 40, { round_output: false }).wbgt;
    expect(rounded).not.toBe(unrounded);
  });
});

// ---------------------------------------------------------------------------
// Input validation tests
// ---------------------------------------------------------------------------
describe("wbgt input validation", () => {
  test.each([
    ["twb", "25", 32],
    ["tg", 25, "32"],
  ])("throws TypeError if %s is not a number", (_, ...args) => {
    expect(() => wbgt(...args)).toThrow(TypeError);
  });

  test("throws TypeError if tdb is not a number", () => {
    expect(() => wbgt(25, 32, { tdb: "20" })).toThrow(TypeError);
  });

  test("throws TypeError if round_output is not a boolean", () => {
    expect(() => wbgt(25, 32, { round_output: "true" })).toThrow(TypeError);
  });

  test("throws TypeError if with_solar_load is not a boolean", () => {
    expect(() => wbgt(25, 32, { with_solar_load: "true" })).toThrow(TypeError);
  });
});
