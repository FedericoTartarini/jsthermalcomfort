import { expect, describe, it, beforeAll } from "@jest/globals";
import { loadTestData, shouldSkipTest } from './testUtils'; // Import shared utilities
import { net } from "../../src/models/net";
import { testDataUrls } from './comftest';

let testData;
let tolerance;

beforeAll(async () => {
  const result = await loadTestData(testDataUrls.net, 'net'); // Use the correct tolerance key
  testData = result.testData;
  tolerance = result.tolerance;
});

describe("net", () => {
  it("should run tests after data is loaded and skip data with arrays", () => {
    testData.data.forEach(({ inputs, outputs }) => {
      // Skip data that contains arrays
      if (shouldSkipTest(inputs) || outputs === undefined) {
        return;
      }

      const { tdb, rh, v, round } = inputs;
      const options = round !== undefined ? { round } : undefined; // Pass round parameter if provided

      const result = net(tdb, rh, v, options);

      // Compare results
      expect(result).toBeCloseTo(outputs.net, tolerance);
    });
  });
});
