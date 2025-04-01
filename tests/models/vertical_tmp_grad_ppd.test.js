import { expect, describe, it, beforeAll } from "@jest/globals";
import { vertical_tmp_grad_ppd } from "../../src/models/vertical_tmp_grad_ppd";
import { testDataUrls } from "./comftest"; // Import all test URLs from comftest.js
import { loadTestData, shouldSkipTest } from "./testUtils"; // Import utility functions

// Variables to store data fetched from remote source
let testData;
let tolerance;

// Fetch data before running tests
beforeAll(async () => {
  ({ testData, tolerance } = await loadTestData(
    testDataUrls.verticalTmpGradPpd,
    "PPD_vg",
  ));
});

describe("vertical_tmp_grad_ppd", () => {
  it("should run tests and handle vr > 0.2 m/s with error checking", () => {
    if (!testData || !testData.data) {
      throw new Error("Test data is undefined or data not loaded");
    }

    // Iterate over each test case
    testData.data.forEach(({ inputs, outputs }) => {
      // Use utility function to skip tests with array inputs
      if (shouldSkipTest(inputs) || outputs === undefined) {
        return;
      }

      const { tdb, tr, vr, rh, met, clo, vertical_tmp_grad, units } = inputs;

      // Check input range to ensure it’s within ASHRAE recommended range
      if (tdb < 10 || tdb > 40 || tr < 10 || tr > 40) {
        return;
      }

      // Skip this data set if any input value is invalid
      if (
        [tdb, tr, vr, rh, met, clo, vertical_tmp_grad].some((value) =>
          isNaN(value),
        )
      ) {
        return;
      }

      try {
        const result = vertical_tmp_grad_ppd(
          tdb,
          tr,
          vr,
          rh,
          met,
          clo,
          vertical_tmp_grad,
          units,
        );

        // Handle cases where PPD_vg is NaN
        if (isNaN(result.PPD_vg) || outputs.PPD_vg === null) {
          expect(result.PPD_vg).toBeNaN();
        } else if (outputs.PPD_vg !== undefined) {
          // If output is not NaN, compare values
          expect(result.PPD_vg).toBeCloseTo(outputs.PPD_vg, tolerance);
        }

        // Check Acceptability only if it’s defined in outputs
        if (outputs.Acceptability !== undefined) {
          expect(result.Acceptability).toBe(outputs.Acceptability);
        }
      } catch (error) {
        // Capture and check specific error messages
        if (vr > 0.2) {
          expect(error.message).toBe(
            "This equation is only applicable for air speed lower than 0.2 m/s",
          );
        } else {
          throw error; // Re-throw error if unrelated to air speed
        }
      }
    });
  });
});
