import { expect, describe, it, beforeAll } from "@jest/globals";
import { loadTestData, shouldSkipTest } from "./testUtils"; // Import shared utilities
import { pet_steady } from "../../src/models/pet_steady";
import { testDataUrls } from "./comftest";

let testData;
let tolerance;

beforeAll(async () => {
  const result = await loadTestData(testDataUrls.petSteady, "PET"); // Use the correct tolerance key
  testData = result.testData;
  tolerance = result.tolerance;
});

describe("pet_steady", () => {
  it("should run tests after data is loaded and skip data with arrays", () => {
    testData.data.forEach(({ inputs, outputs }) => {
      // Skip data that contains arrays
      if (
        shouldSkipTest(inputs) ||
        outputs === undefined ||
        outputs.PET === undefined
      ) {
        return;
      }

      const { tdb, tr, v, rh, met, clo } = inputs;
      const result = pet_steady(tdb, tr, v, rh, met, clo);

      // Compare results
      expect(result).toBeCloseTo(outputs.PET, tolerance);
    });
  });
});
