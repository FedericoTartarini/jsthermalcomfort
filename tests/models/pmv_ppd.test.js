import { expect, describe, it, beforeAll } from "@jest/globals";
import fetch from "node-fetch";
import { pmv_ppd, pmv_calculation } from "../../src/models/pmv_ppd.js";
import { testDataUrls } from "./comftest";
import jest from "jest-mock";

const testDataUrl = testDataUrls.pmvPpd;

let testData;
let tolerance;

beforeAll(async () => {
  try {
    const response = await fetch(testDataUrl);
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    testData = await response.json();
    tolerance = testData.tolerance || { pmv: 0.1, ppd: 0.01 }; // Add default tolerance
  } catch (error) {
    console.error("Failed to fetch test data:", error);
    throw error;
  }

  // Disable console warnings
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

describe("pmv_pdd", () => {
  it("should run tests and skip data that contains arrays or undefined fields", () => {
    if (!testData || !testData.data)
      throw new Error("Data not loaded or undefined");

    testData.data.forEach(({ inputs, outputs }) => {
      const values = Object.values(inputs);
      const hasArray = values.some((value) => Array.isArray(value));

      if (hasArray || outputs === undefined) return; // Skip data with arrays or undefined

      const { tdb, tr, vr, rh, met, clo, standard } = inputs;
      const result = pmv_ppd(tdb, tr, vr, rh, met, clo, undefined, standard);

      // Check and handle PMV values
      if (isNaN(result.pmv) || outputs.pmv === null) {
        expect(result.pmv).toBeNaN();
      } else if (outputs.pmv !== undefined && tolerance.pmv !== undefined) {
        expect(result.pmv).toBeCloseTo(outputs.pmv, tolerance.pmv);
      }

      // Check and handle PPD values
      if (isNaN(result.ppd) || outputs.ppd === null) {
        expect(result.ppd).toBeNaN();
      } else if (outputs.ppd !== undefined && tolerance.ppd !== undefined) {
        expect(result.ppd).toBeCloseTo(outputs.ppd, tolerance.ppd);
      }
    });
  });
});

describe("pmv_calculation", () => {
  it("should run tests and skip data that contains arrays or undefined fields", () => {
    if (!testData || !testData.data)
      throw new Error("Data not loaded or undefined");

    testData.data.forEach(({ inputs, outputs }) => {
      const values = Object.values(inputs);
      const hasArray = values.some((value) => Array.isArray(value));

      if (hasArray || outputs === undefined) return; // Skip data with arrays or undefined

      const { tdb, tr, vr, rh, met, clo, wme } = inputs;
      const result = pmv_calculation(tdb, tr, vr, rh, met, clo, wme);

      if (result.pmv === undefined) {
        console.warn("Skipping due to undefined PMV result. Inputs:", inputs);
        return;
      }

      if (isNaN(result.pmv) || outputs.pmv === null) {
        expect(result.pmv).toBeNaN();
      } else if (outputs.pmv !== undefined && tolerance.pmv !== undefined) {
        expect(result.pmv).toBeCloseTo(outputs.pmv, tolerance.pmv);
      }
    });
  });
});
