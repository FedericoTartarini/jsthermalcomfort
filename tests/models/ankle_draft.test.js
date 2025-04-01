import { expect, describe, it, beforeAll } from "@jest/globals";
import { loadTestData, shouldSkipTest } from "./testUtils"; // Import shared utilities
import { ankle_draft } from "../../src/models/ankle_draft.js";
import { testDataUrls } from "./comftest";

let testData;
let tolerance;

beforeAll(async () => {
  const result = await loadTestData(testDataUrls.ankleDraft, "PPD_ad");
  testData = result.testData;
  tolerance = result.tolerance;
});

describe("ankle_draft", () => {
  it("should run tests after data is loaded and skip data with arrays", () => {
    testData.data.forEach(({ inputs, outputs }) => {
      if (shouldSkipTest(inputs) || outputs === undefined) {
        return; // Skip test
      }

      const { tdb, tr, vr, rh, met, clo, v_ankle, units } = inputs;
      const result = ankle_draft(tdb, tr, vr, rh, met, clo, v_ankle, units)[
        "PPD_ad"
      ];
      expect(result).toBeCloseTo(outputs.PPD_ad, tolerance);
    });
  });
});
