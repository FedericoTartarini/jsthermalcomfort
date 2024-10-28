import { expect, describe, it, beforeAll } from "@jest/globals";
import { loadTestData, shouldSkipTest } from './testUtils'; // Import shared utilities
import { at } from "../../src/models/at.js";
import { testDataUrls } from './comftest';

let testData;
let tolerance;

beforeAll(async () => {
  const result = await loadTestData(testDataUrls.at, 'at');
  testData = result.testData;
  tolerance = result.tolerance;
});

describe("at", () => {
  it("should run tests after data is loaded and skip data with arrays", () => {
    testData.data.forEach(({ inputs, outputs }) => {
      if (shouldSkipTest(inputs) || outputs === undefined) {
        return; // Skip test
      }

      const { tdb, rh, v, q } = inputs;
      const result = at(tdb, rh, v, q);
      expect(result).toBeCloseTo(outputs.at, tolerance);
    });
  });
});
