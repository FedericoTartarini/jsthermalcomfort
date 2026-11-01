import { describe, test } from "vitest";
import { discomfort_index } from "../../src/models/index.ts";
import { testDataUrls } from "./comftest.ts";
import { loadTestData, validateResult } from "./testUtils.ts";

type Inputs = Parameters<typeof discomfort_index>[0];

const { testData: reference_table, tolerances: tolerance } = await loadTestData(
  testDataUrls.discomfortIndex,
);

// Mirrors pythermalcomfort v4.7.0 tests/test_discomfort_index.py.
describe("test_discomfort_index", () => {
  test.each(reference_table.data)(
    "test_discomfort_index: fixture case %#",
    (entry) => {
      const { inputs, outputs } = entry;
      const result = discomfort_index(inputs as unknown as Inputs);

      validateResult(result, outputs, tolerance, inputs);
    },
  );
});
