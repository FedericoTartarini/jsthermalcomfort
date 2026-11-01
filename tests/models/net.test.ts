import { describe, test } from "vitest";
import { net } from "../../src/models/index.ts";
import { testDataUrls } from "./comftest.ts";
import { loadTestData, validateResult } from "./testUtils.ts";

type Inputs = Parameters<typeof net>[0];

const { testData: reference_table, tolerances: tolerance } = await loadTestData(
  testDataUrls.net,
);

// Mirrors pythermalcomfort v4.7.0 tests/test_net.py.
describe("test_net", () => {
  test.each(reference_table.data)("test_net: fixture case %#", (entry) => {
    const { inputs, outputs } = entry;
    const result = net(inputs as unknown as Inputs);

    validateResult(result, outputs, tolerance, inputs);
  });
});
