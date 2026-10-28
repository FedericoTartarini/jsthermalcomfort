import { describe, test } from "vitest";
import { pmv_athb } from "../../src/models/index.ts";
import { testDataUrls } from "./comftest.ts";
import { loadTestData, validateResult } from "./testUtils.ts";

type Inputs = Parameters<typeof pmv_athb>[0];

const { testData: reference_table, tolerances: tolerance } = await loadTestData(
  testDataUrls.athb,
);

// Mirrors pythermalcomfort v4.7.0 tests/test_athb.py.
describe("test_athb", () => {
  test.each(reference_table.data)("test_athb: case %#", (entry) => {
    const { inputs, outputs } = entry;
    const result = pmv_athb(inputs as unknown as Inputs);

    validateResult(result, outputs, tolerance, inputs);
  });
});
