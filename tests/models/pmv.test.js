import { expect, describe, it, beforeAll } from "@jest/globals";
import { loadTestData, shouldSkipTest } from './testUtils'; // Use modular utilities to load data and skip array checks
import { pmv } from "../../src/models/pmv.js";
import { testDataUrls } from './comftest';

let testData;
let tolerance;

beforeAll(async () => {
  const result = await loadTestData(testDataUrls.pmv, 'pmv'); // Load remote data and extract tolerance
  testData = result.testData;
  tolerance = result.tolerance;
});

describe("pmv", () => {
  it("should run tests after data is loaded and skip data containing arrays", () => {
    if (!testData || !testData.data) throw new Error("Data not loaded or undefined");

    testData.data.forEach(({ inputs, outputs }) => {
      // Use shouldSkipTest to check and skip data containing arrays
      if (shouldSkipTest(inputs) || outputs === undefined) return;

      const { tdb, tr, vr, rh, met, clo, standard } = inputs;
      const result = pmv(tdb, tr, vr, rh, met, clo, undefined, standard);

      // Compare calculated result with expected output
      expect(result).toBeCloseTo(outputs.pmv, tolerance);
    });
  });
});
