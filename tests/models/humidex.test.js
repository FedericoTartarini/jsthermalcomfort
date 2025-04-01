import { expect, describe, it, beforeAll } from "@jest/globals";
import { loadTestData, shouldSkipTest } from "./testUtils"; // Import shared utilities
import { humidex } from "../../src/models/humidex";
import { testDataUrls } from "./comftest";

let testData;
let tolerance;

beforeAll(async () => {
  const result = await loadTestData(testDataUrls.humidex, "humidex"); // Use the correct tolerance key
  testData = result.testData;
  tolerance = result.tolerance;
});

describe("humidex", () => {
  it("should run tests after data is loaded and skip data with arrays", () => {
    testData.data.forEach(({ inputs, outputs }) => {
      // Skip data that contains arrays
      if (shouldSkipTest(inputs) || outputs === undefined) {
        return;
      }

      const { tdb, rh, round } = inputs;
      const options = round !== undefined ? { round } : undefined; // Add to options if round is provided

      const result = humidex(tdb, rh, options);

      // Compare results
      expect(result.humidex).toBeCloseTo(outputs.humidex, tolerance);
      expect(result.discomfort).toBe(outputs.discomfort);
    });
  });
});
