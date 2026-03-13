import { describe } from "@jest/globals";
import { utci } from "../../src/models/utci.js";
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
    // utci now always returns { utci, stress_category }
    const modelResult = utci(tdb, tr, v, rh, units);

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });

  test("always returns stress_category", () => {
    const result = utci(25, 25, 1.0, 50);
    expect(result).toHaveProperty("utci");
    expect(result).toHaveProperty("stress_category");
    expect(result.stress_category).toBe("no thermal stress");
  });

  test("round_output=false returns unrounded value", () => {
    const result = utci(25, 25, 1.0, 50, "SI", true, true, false);
    expect(typeof result.utci).toBe("number");
    // Should have more precision than 1 decimal place
    expect(result.stress_category).toBe("no thermal stress");
  });
});
