import { describe, test } from "vitest";
import { pmv_e } from "../../src/models/index.ts";
import { testDataUrls } from "./comftest.ts";
import { loadTestData, validateResult } from "./testUtils.ts";

type Inputs = Parameters<typeof pmv_e>[0];

const { testData: reference_table, tolerances: tolerance } = await loadTestData(
  testDataUrls.ePmv,
);

// Mirrors pythermalcomfort v4.7.0 tests/test_e_pmv.py.
describe("test_e_pmv", () => {
  test.each(reference_table.data)("test_e_pmv: case %#", (entry) => {
    const { inputs, outputs } = entry;
    const result = pmv_e(inputs as unknown as Inputs);

    validateResult(result, outputs, tolerance, inputs);
  });
});
