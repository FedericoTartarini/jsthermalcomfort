import { expect, describe, it, beforeAll } from "@jest/globals";
import { loadTestData, shouldSkipTest } from './testUtils'; // Use the utils
import { a_pmv } from "../../src/models/a_pmv.js";
import { testDataUrls } from './comftest';

let testData;
let tolerance;

beforeAll(async () => {
  const result = await loadTestData(testDataUrls.aPmv, 'pmv');
  testData = result.testData;
  tolerance = result.tolerance;
});

describe("a_pmv", () => {
  it("Runs the test after data is loaded and skips data containing arrays", () => {
    testData.data.forEach(({ inputs, expected }) => {
      if (shouldSkipTest(inputs) || expected === undefined) {
        return; // skip the test
      }

      const { tdb, tr, vr, rh, met, clo, a_coefficient, wme } = inputs;
      const result = a_pmv(tdb, tr, vr, rh, met, clo, a_coefficient, wme);

      if (isNaN(result) || expected === null) {
        expect(result).toBeNaN();
      } else {
        expect(result).toBeCloseTo(expected, tolerance);
      }
    });
  });
});
