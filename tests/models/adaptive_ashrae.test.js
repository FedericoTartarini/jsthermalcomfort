import { expect, describe, it, beforeAll } from "@jest/globals";
import { loadTestData, shouldSkipTest } from './testUtils'; // use the utils
import { adaptive_ashrae } from "../../src/models/adaptive_ashrae";
import { testDataUrls } from './comftest';

let testData;
let tolerance;

beforeAll(async () => {
  const result = await loadTestData(testDataUrls.adaptiveAshrae, 'tmp_cmf');
  testData = result.testData;
  tolerance = result.tolerance;
});

describe("adaptive_ashrae", () => {
  it("should run tests and skip data that contains arrays or undefined fields", () => {
    testData.data.forEach(({ inputs, outputs }) => {
      if (shouldSkipTest(inputs) || outputs === undefined) {
        return; // skip the test
      }

      const { tdb, tr, t_running_mean, v } = inputs;
      const result = adaptive_ashrae(tdb, tr, t_running_mean, v);

      if (isNaN(result.tmp_cmf) || outputs.tmp_cmf === null) {
        expect(result.tmp_cmf).toBeNaN();
      } else {
        expect(result.tmp_cmf).toBeCloseTo(outputs.tmp_cmf, tolerance);
      }

      if (outputs.acceptability_80 !== undefined) {
        expect(result.acceptability_80).toBe(outputs.acceptability_80);
      }

      if (outputs.acceptability_90 !== undefined) {
        expect(result.acceptability_90).toBe(outputs.acceptability_90);
      }
    });
  });
});
