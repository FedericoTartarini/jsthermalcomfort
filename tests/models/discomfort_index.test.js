import { expect, describe, it, beforeAll } from "@jest/globals";
import { loadTestData, shouldSkipTest } from './testUtils'; // Import shared utilities
import { discomfort_index } from "../../src/models/discomfort_index";
import { testDataUrls } from './comftest';

let testData;
let tolerance;

beforeAll(async () => {
  const result = await loadTestData(testDataUrls.discomfortIndex, 'discomfort_index'); // Use the correct tolerance key
  testData = result.testData;
  tolerance = result.tolerance;
});

describe("discomfort_index", () => {
  it("should run tests after data is loaded and skip data with arrays", () => {
    testData.data.forEach(({ inputs, outputs }) => {
      // Skip data that contains arrays
      if (shouldSkipTest(inputs) || outputs === undefined) {
        return;
      }

      const { tdb, rh } = inputs;
      const result = discomfort_index(tdb, rh);

      // Compare results
      expect(result.di).toBeCloseTo(outputs.di, tolerance);
      expect(result.discomfort_condition).toBe(outputs.discomfort_condition);
    });
  });
});
