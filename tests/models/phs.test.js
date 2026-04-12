import { beforeAll, describe, expect, it, test } from "@jest/globals";
import fetch from "node-fetch";
import { phs } from "../../src/models/phs";
import { testDataUrls } from "./comftest"; // Import test URLs from comftest.js

const testDataUrl = testDataUrls.phs;

let testData;
let tolerance;

beforeAll(async () => {
  try {
    const response = await fetch(testDataUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch test data: ${response.statusText}`);
    }

    testData = await response.json();
    tolerance = testData.tolerance; // Retrieve tolerance from remote data
  } catch (error) {
    console.error("Unable to fetch or parse test data:", error);
    throw error;
  }
});

describe("phs", () => {
  it("should run tests and skip data that contains arrays or undefined fields", () => {
    if (!testData || !testData.data) {
      throw new Error("Test data is not properly loaded");
    }

    testData.data.forEach(({ inputs, outputs }) => {
      // Check for arrays or undefined values in inputs or outputs
      const hasArrayOrUndefined =
        Object.values(inputs).some(
          (value) => Array.isArray(value) || value === undefined,
        ) || Object.values(outputs).some((value) => Array.isArray(value));

      if (hasArrayOrUndefined || outputs === undefined) {
        console.warn(
          `Skipping test due to missing or invalid inputs/outputs: inputs=${JSON.stringify(
            inputs,
          )}`,
        );
        return;
      }

      let result;
      try {
        result = phs(
          inputs.tdb,
          inputs.tr,
          inputs.v,
          inputs.rh,
          inputs.met,
          inputs.clo,
          inputs.posture,
          inputs.wme,
          "7933-2004",
          inputs,
        );

        // Compare values with field-specific tolerance
        for (let [key, value] of Object.entries(outputs)) {
          if (key.startsWith("d_lim")) {
            // Allow +/- 1.5 minute due to float accumulation boundary crossing
            expect(Math.abs(result[key] - value)).toBeLessThanOrEqual(1.5);
          } else if (key === "sweat_loss_g" || key === "evap_load_wm2_min") {
            // Allow +/- 10 grams / units due to float accumulation
            expect(Math.abs(result[key] - value)).toBeLessThanOrEqual(10);
          } else if (key === "sweat_rate_watt") {
            // Allow +/- 0.3 diff since JS uses half-up rounding (266.15 -> 266.2) vs Python banker's rounding (266.1)
            expect(Math.abs(result[key] - value)).toBeLessThanOrEqual(0.3);
          } else {
            // Use the specified tolerance if available, otherwise default to a strict 0.0001
            const tol =
              tolerance && tolerance[key] !== undefined
                ? tolerance[key]
                : 0.0001;
            expect(Math.abs(result[key] - value)).toBeLessThanOrEqual(tol);
          }
        }
      } catch (error) {
        console.error("Test failed with inputs:", inputs);
        if (typeof result !== "undefined") {
          console.error("Received result:", result);
          console.error("Expected result:", outputs);
        }
        throw error; // Re-throw to display specific error details
      }
    });
  });
});

describe("phs invalid input", () => {
  const valid = {
    tdb: 40,
    tr: 40,
    v: 0.3,
    rh: 35,
    met: 150,
    clo: 0.5,
    posture: 2,
  };

  test.each([
    ["tdb=undefined", { ...valid, tdb: undefined }],
    ["tr='string'", { ...valid, tr: "string" }],
    ["v=null", { ...valid, v: null }],
    ["rh=NaN", { ...valid, rh: NaN }],
    ["met=Infinity", { ...valid, met: Infinity }],
    ["clo=undefined", { ...valid, clo: undefined }],
  ])("returns NaN result when %s is invalid", (_label, args) => {
    const result = phs(
      args.tdb,
      args.tr,
      args.v,
      args.rh,
      args.met,
      args.clo,
      args.posture,
    );
    expect(result.t_re).toBeNaN();
  });
});
