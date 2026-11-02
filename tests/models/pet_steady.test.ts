import { describe, expect, test } from "vitest";
import { pet_steady } from "../../src/models/index.ts";
import { testDataUrls } from "./comftest.ts";
import { loadTestData, validateResult } from "./testUtils.ts";

const { testData: test_data, tolerances } = await loadTestData(
  testDataUrls.petSteady,
);

const PET_TEST_MATRIX = [
  // 'tdb', 'tr', 'rh', 'v', 'met', 'clo', 'exp'
  [20, 20, 50, 0.15, 1.37, 0.5, 18.85],
  [30, 30, 50, 0.15, 1.37, 0.5, 30.6],
  [20, 20, 50, 0.5, 1.37, 0.5, 17.16],
  [21, 21, 50, 0.1, 1.37, 0.9, 21.08],
  [20, 20, 50, 0.1, 1.37, 0.9, 19.92],
  [-5, 40, 2, 0.5, 1.37, 0.9, 7.82],
  [-5, -5, 50, 5.0, 1.37, 0.9, -13.38],
  [30, 60, 80, 1.0, 1.37, 0.9, 44.63],
  [30, 30, 80, 1.0, 1.37, 0.9, 32.21],
] as const;

// Mirrors pythermalcomfort v4.7.0 tests/test_pet_steady.py.
describe("test_pet_steady", () => {
  test.each(test_data.data)("test_pet_steady: fixture case %#", (row) => {
    const { inputs, outputs } = row;
    const result = pet_steady(
      inputs as unknown as Parameters<typeof pet_steady>[0],
    );

    validateResult(result, outputs, tolerances, inputs);
  });

  // Upstream fills arrays of the shapes (10, 10), 10 and (3, 3, 3) with each
  // row's values; the model takes scalars (deviation _shared-5), so each row
  // is one call, the same for every shape.
  test.each(PET_TEST_MATRIX)(
    "test_pet_array: tdb %d, tr %d, rh %d, v %d, met %d, clo %d",
    (tdb, tr, rh, v, met, clo, exp) => {
      const res = pet_steady({ tdb, tr, rh, v, met, clo }).pet;
      expect(res).toBe(exp);
    },
  );
});
