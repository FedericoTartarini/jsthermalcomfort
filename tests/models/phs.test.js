import { expect, describe, it, test, beforeAll } from "@jest/globals";
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

// ---------------------------------------------------------------------------
// Input validation tests
// ---------------------------------------------------------------------------
describe("phs input validation", () => {
  test.each([
    ["tdb", "40", 40, 0.3, 33.85, 2.5, 0.5, "standing"],
    ["tr", 40, "40", 0.3, 33.85, 2.5, 0.5, "standing"],
    ["v", 40, 40, "0.3", 33.85, 2.5, 0.5, "standing"],
    ["rh", 40, 40, 0.3, "33.85", 2.5, 0.5, "standing"],
    ["met", 40, 40, 0.3, 33.85, "2.5", 0.5, "standing"],
    ["clo", 40, 40, 0.3, 33.85, 2.5, "0.5", "standing"],
    ["wme", 40, 40, 0.3, 33.85, 2.5, 0.5, "standing", "0"],
  ])("throws TypeError if %s is not a number", (_, ...args) => {
    expect(() => phs(...args)).toThrow(TypeError);
  });

  test("throws Error if model is not a valid enum", () => {
    expect(() =>
      phs(40, 40, 0.3, 33.85, 2.5, 0.5, "standing", 0, "INVALID"),
    ).toThrow(Error);
  });

  test("throws TypeError if kwargs.round is not a boolean", () => {
    expect(() =>
      phs(40, 40, 0.3, 33.85, 2.5, 0.5, "standing", 0, "7933-2023", {
        round: "true",
      }),
    ).toThrow(TypeError);
  });

  test("throws Error if posture is an invalid string", () => {
    expect(() => phs(40, 40, 0.3, 33.85, 2.5, 0.5, "invalid")).toThrow(Error);
  });

  test("throws Error if posture is an invalid number", () => {
    expect(() => phs(40, 40, 0.3, 33.85, 2.5, 0.5, 5)).toThrow(Error);
  });

  test.each([
    ["i_mst", { i_mst: "0.38" }],
    ["a_p", { a_p: "0.54" }],
    ["weight", { weight: "75" }],
    ["height", { height: "1.8" }],
    ["walk_sp", { walk_sp: "0" }],
    ["theta", { theta: "0" }],
    ["acclimatized", { acclimatized: "100" }],
    ["duration", { duration: "480" }],
    ["f_r", { f_r: "0.42" }],
    ["t_sk", { t_sk: "34.1" }],
    ["t_cr", { t_cr: "36.8" }],
    ["t_re", { t_re: "36.8" }],
    ["t_cr_eq", { t_cr_eq: "36.8" }],
    ["t_sk_t_cr_wg", { t_sk_t_cr_wg: "0.3" }],
    ["sweat_rate_watt", { sweat_rate_watt: "0" }],
    ["evap_load_wm2_min", { evap_load_wm2_min: "0" }],
  ])("throws TypeError if kwargs.%s is not a number", (_, kwargs) => {
    expect(() =>
      phs(40, 40, 0.3, 33.85, 2.5, 0.5, "standing", 0, "7933-2023", kwargs),
    ).toThrow(TypeError);
  });

  test("throws Error if kwargs.drink is not a valid enum", () => {
    expect(() =>
      phs(40, 40, 0.3, 33.85, 2.5, 0.5, "standing", 0, "7933-2023", {
        drink: 2,
      }),
    ).toThrow(Error);
  });
});
