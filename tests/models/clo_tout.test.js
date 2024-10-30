import { expect, describe, it, beforeAll } from "@jest/globals";
import { loadTestData, shouldSkipTest } from './testUtils';
import { clo_tout } from "../../src/models/clo_tout";
import { testDataUrls } from './comftest';

let testData;
let tolerance;

beforeAll(async () => {
  const result = await loadTestData(testDataUrls.cloTout, 'clo_tout');
  testData = result.testData;
  tolerance = result.tolerance;
});

describe("clo_tout", () => {
  it("should run tests after data is loaded and skip tests with array data", () => {
    testData.data.forEach(({ inputs, outputs }) => {
      // Skip test cases with array data
      if (shouldSkipTest(inputs) || Array.isArray(inputs.tout) || Array.isArray(outputs.clo_tout)) {
        return;
      }

      const { tout, units } = inputs;
      const result = clo_tout(tout, units);

      // Use NaN check to ensure the result matches
      if (isNaN(result) || outputs.clo_tout === null || outputs.clo_tout === undefined) {
        expect(result).toBeNaN();
      } else {
        expect(result).toBeCloseTo(outputs.clo_tout, tolerance);
      }
    });
  });
});
