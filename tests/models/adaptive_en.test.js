import { expect, describe, it, beforeAll } from "@jest/globals";
import { loadTestData, shouldSkipTest } from './testUtils'; // use the utils
import { adaptive_en } from "../../src/models/adaptive_en";
import { testDataUrls } from './comftest';

let testData;
let tolerance;

beforeAll(async () => {
  const result = await loadTestData(testDataUrls.adaptiveEn, 'tmp_cmf');
  testData = result.testData;
  tolerance = result.tolerance;
});

describe("adaptive_en", () => {
  it("should run tests and skip data that contains arrays", () => {
    testData.data.forEach(({ inputs, outputs }) => {
      if (shouldSkipTest(inputs)) {
        return; // skip the test
      }

      const { tdb, tr, t_running_mean, v } = inputs;
      const result = adaptive_en(tdb, tr, t_running_mean, v);

      if (outputs.tmp_cmf === null) {
        expect(result.tmp_cmf).toBeNaN();
      } else {
        expect(result.tmp_cmf).toBeCloseTo(outputs.tmp_cmf, tolerance);
      }

      expect(result.acceptability_cat_i).toBe(outputs.acceptability_cat_i);
      expect(result.acceptability_cat_ii).toBe(outputs.acceptability_cat_ii);
      expect(result.acceptability_cat_iii).toBe(outputs.acceptability_cat_iii);
    });
  });
});
