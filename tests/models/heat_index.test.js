import { expect, describe, it, beforeAll } from "@jest/globals";
import { loadTestData, shouldSkipTest } from './testUtils'; // Import shared utilities
import { heat_index } from "../../src/models/heat_index";
import { testDataUrls } from './comftest';

let testData;
let tolerance;

beforeAll(async () => {
  const result = await loadTestData(testDataUrls.heatIndex, 'hi'); // Use the correct tolerance key
  testData = result.testData;
  tolerance = result.tolerance || 0.1; // Set default tolerance to 0.1
});

describe("heat_index", () => {
  it("should run tests after data is loaded and skip data with arrays", () => {
    testData.data.forEach(({ inputs, outputs }) => {
      // Skip data that contains arrays
      if (shouldSkipTest(inputs) || outputs === undefined || outputs.hi === undefined) {
        return;
      }

      const { tdb, rh, units } = inputs;
      const options = units ? { units } : undefined; // Set options if units are provided

      const result = heat_index(tdb, rh, options);

      // Compare results
      expect(result).toBeCloseTo(outputs.hi, tolerance);
    });
  });
});
