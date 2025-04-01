import { expect, describe, it, beforeAll } from "@jest/globals";
import { loadTestData, shouldSkipTest } from "./testUtils"; // Use modular utilities to load data and check if test should be skipped
import { set_tmp } from "../../src/models/set_tmp";
import { testDataUrls } from "./comftest";

let testData;
let tolerance;

// Load test data before all tests
beforeAll(async () => {
  const result = await loadTestData(testDataUrls.setTmp, "set_tmp"); // Load remote data and extract tolerance
  testData = result.testData;
  tolerance = result.tolerance;
});

describe("set_tmp", () => {
  it("should run tests after data is loaded and skip data containing arrays", () => {
    if (!testData || !testData.data)
      throw new Error("Data not loaded or undefined");

    testData.data.forEach(({ inputs, outputs }) => {
      // Use shouldSkipTest to check and skip data containing arrays
      if (
        shouldSkipTest(inputs) ||
        outputs === undefined ||
        outputs.setTmp === undefined
      )
        return;

      const { tdb, tr, v, rh, met, clo, wme, kwargs } = inputs;
      const result = set_tmp(tdb, tr, v, rh, met, clo, wme, kwargs);

      // Use tolerance for accurate comparison
      expect(result).toBeCloseTo(outputs.setTmp, tolerance);
    });
  });
});
