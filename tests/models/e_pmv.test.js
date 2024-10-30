import { expect, describe, it, beforeAll } from "@jest/globals";
import { loadTestData, shouldSkipTest } from './testUtils'; // Import shared utilities
import { e_pmv } from "../../src/models/e_pmv";
import { testDataUrls } from './comftest';

let testData;
let tolerance;

beforeAll(async () => {
  const result = await loadTestData(testDataUrls.ePmv, 'pmv'); // Use the correct tolerance key
  testData = result.testData;
  tolerance = result.tolerance;
});

describe("e_pmv", () => {
  it("should run tests after data is loaded and skip data with arrays", () => {
    testData.data.forEach(({ inputs, outputs }) => {
      // Skip data that contains arrays
      if (shouldSkipTest(inputs) || outputs === undefined || outputs.pmv === undefined) {
        return;
      }

      const { tdb, tr, vr, rh, met, clo, e_coefficient } = inputs;
      const result = e_pmv(tdb, tr, vr, rh, met, clo, e_coefficient);

      // Compare results
      expect(result).toBeCloseTo(outputs.pmv, tolerance);
    });
  });
});
