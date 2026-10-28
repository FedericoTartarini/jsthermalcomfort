import { describe, test } from "vitest";
import { use_fans_heatwaves } from "../../src/models/index.ts";
import { testDataUrls } from "./comftest.ts";
import { loadTestData, validateResult } from "./testUtils.ts";

type Inputs = Parameters<typeof use_fans_heatwaves>[0];

const { testData: reference_table, tolerances: tolerance } = await loadTestData(
  testDataUrls.use_fans_heatwaves,
);

// Mirrors pythermalcomfort v4.7.0 tests/test_use_fans_heatwaves.py. Upstream's
// arrays are called element-wise.
describe("test_use_fans_heatwaves", () => {
  test.each(reference_table.data)(
    "test_use_fans_heatwaves: fixture case %#",
    (entry) => {
      const { inputs, outputs } = entry;
      const result = use_fans_heatwaves(inputs as unknown as Inputs);

      validateResult(result, outputs, tolerance, inputs);
    },
  );
});
