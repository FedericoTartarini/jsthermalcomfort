import { describe, expect, test } from "@jest/globals";
import { mapping, utci } from "../../src/models/utci.js";
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

describe("mapping() stress category classification (Issue #147)", () => {
  // Boundary values belong to the lower category (right-inclusive convention).
  test.each([
    // exact boundaries
    [-40, "extreme cold stress"],
    [-27, "very strong cold stress"],
    [-13, "strong cold stress"],
    [0, "moderate cold stress"],
    [9, "slight cold stress"],
    [26, "no thermal stress"],
    [32, "moderate heat stress"],
    [38, "strong heat stress"],
    [46, "very strong heat stress"],
    // bug-exposing inputs from the issue and real user reports
    [15.2, "no thermal stress"],
    [28.9, "moderate heat stress"],
    [50, "extreme heat stress"],
    // midpoint and out-of-range inputs
    [-50, "extreme cold stress"],
    [-100, "extreme cold stress"],
    [-33.5, "very strong cold stress"],
    [-20, "strong cold stress"],
    [-6.5, "moderate cold stress"],
    [4.5, "slight cold stress"],
    [17.5, "no thermal stress"],
    [29, "moderate heat stress"],
    [35, "strong heat stress"],
    [42, "very strong heat stress"],
    [47, "extreme heat stress"],
    [100, "extreme heat stress"],
    [0.001, "slight cold stress"],
  ])("UTCI %p should map to %p", (utciValue, expectedCategory) => {
    expect(mapping(utciValue)).toBe(expectedCategory);
  });

  // just above each finite boundary bumps to the next category
  test.each([
    [-39.999, "very strong cold stress"],
    [-26.999, "strong cold stress"],
    [-12.999, "moderate cold stress"],
    [0.0001, "slight cold stress"],
    [9.0001, "no thermal stress"],
    [26.0001, "moderate heat stress"],
    [32.0001, "strong heat stress"],
    [38.0001, "very strong heat stress"],
    [46.0001, "extreme heat stress"],
  ])("UTCI %p should map to %p", (utciValue, expectedCategory) => {
    expect(mapping(utciValue)).toBe(expectedCategory);
  });

  test.each([[NaN], [Infinity], [-Infinity]])(
    "UTCI %p should map to NaN",
    (utciValue) => {
      expect(mapping(utciValue)).toBeNaN();
    },
  );
});

describe("utci() stress_category with invalid inputs (Issue #147)", () => {
  test("out-of-range inputs yield utci=NaN and stress_category=NaN", () => {
    // tdb=51 is outside limit_inputs [-50, 50], so utci_approx becomes NaN;
    // stress_category must propagate NaN instead of a misleading label.
    const result = utci(51, 22, 16, 50, "SI", true);
    expect(result.utci).toBeNaN();
    expect(result.stress_category).toBeNaN();
  });
});
