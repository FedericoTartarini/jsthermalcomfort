import { expect, describe, it, beforeAll } from "@jest/globals";
import fetch from "node-fetch";
import { find_span, solar_gain } from "../../src/models/solar_gain";
import { testDataUrls } from "./comftest";

// Use the URL from comftest.js to fetch data for solar_gain tests
const testDataUrl = testDataUrls.solarGain;

let testData;
let tolerance;

// Load data before all tests
beforeAll(async () => {
  const response = await fetch(testDataUrl);
  if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

  const fetchedData = await response.json();
  testData = fetchedData.data || []; // Directly get the data field
  tolerance = fetchedData.tolerance || {}; // Extract tolerance values
});

// Test code for find_span
describe("find_span", () => {
  it("should run tests after data is loaded", () => {
    if (!testData || testData.length === 0) {
      throw new Error("Find_span test data not loaded or undefined");
    }

    testData.forEach(({ inputs, outputs }) => {
      if (!inputs.arr || !inputs.x) return;

      const { arr, x } = inputs;
      const result = find_span(arr, x);
      expect(result).toBe(outputs.expected);
    });
  });
});

// Test code for solar_gain
describe("solar_gain", () => {
  it("should run solar_gain tests after data is loaded", () => {
    if (!testData || testData.length === 0) {
      throw new Error("Solar_gain test data not loaded or undefined");
    }

    testData.forEach(({ inputs, outputs }) => {
      if (!inputs.sol_altitude || !inputs.sol_radiation_dir) return;

      const {
        sol_altitude,
        sharp,
        sol_radiation_dir,
        sol_transmittance,
        f_svv,
        f_bes,
        asw,
        posture,
      } = inputs;

      const result = solar_gain(
        sol_altitude,
        sharp,
        sol_radiation_dir,
        sol_transmittance,
        f_svv,
        f_bes,
        asw,
        posture,
      );

      expect(result.erf).toBeCloseTo(outputs.erf, tolerance.erf);
      expect(result.delta_mrt).toBeCloseTo(
        outputs.delta_mrt,
        tolerance.delta_mrt,
      );
    });
  });
});
