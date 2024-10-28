import { expect, describe, it, beforeAll } from "@jest/globals";
import { loadTestData, shouldSkipTest } from './testUtils'; // Import shared utilities
import { athb } from "../../src/models/athb.js";
import { testDataUrls } from './comftest';

let testData;
let tolerance;

beforeAll(async () => {
  const result = await loadTestData(testDataUrls.athb, 'athb_pmv'); // Use the correct tolerance key
  testData = result.testData;
  tolerance = result.tolerance;
});

describe("athb", () => {
  it("should run tests after data is loaded and skip data with arrays", () => {
    testData.data.forEach(({ inputs, outputs }) => {
      // Skip data that contains arrays
      if (shouldSkipTest(inputs) || Array.isArray(outputs.athb_pmv)) {
        return;
      }

      const { tdb, tr, rh, met, clo, wme } = inputs;
      const result = athb(tdb, tr, rh, met, clo, wme);

      // Check if the result is close to the expected value
      if (isNaN(result) || outputs.athb_pmv === null || outputs.athb_pmv === undefined) {
        expect(result).toBeNaN();
      } else {
        expect(result).toBeCloseTo(outputs.athb_pmv, tolerance);
      }
    });
  });
});
