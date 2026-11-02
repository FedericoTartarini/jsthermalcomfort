import { describe, expect, test } from "vitest";
import { wbgt } from "../../src/models/index.ts";
import { testDataUrls } from "./comftest.ts";
import { loadTestData, validateResult } from "./testUtils.ts";

type Inputs = Parameters<typeof wbgt>[0];

const { testData: reference_table, tolerances: tolerance } = await loadTestData(
  testDataUrls.wbgt,
);

// Mirrors pythermalcomfort v4.7.0 tests/test_wbgt.py.
describe("test_wbgt", () => {
  test.each(reference_table.data)(
    "test_wbgt_with_url_cases: fixture case %#",
    (entry) => {
      const { inputs, outputs } = entry;
      const result = wbgt(inputs as unknown as Inputs);

      validateResult(result, outputs, tolerance, inputs);
    },
  );

  // Test wbgt value error
  // Upstream's ValueError is a TypeError (deviation wbgt-3).
  test("test_wbgt", () => {
    expect(() => wbgt({ twb: 25, tg: 32, with_solar_load: true })).toThrow(
      TypeError,
    );
  });

  //  Calculate WBGT with twb and tg set to None
  test("test_calculate_wbgt_with_twb_and_tg_set_to_none", () => {
    expect(() =>
      wbgt({ twb: null, tg: null } as unknown as Parameters<typeof wbgt>[0]),
    ).toThrow(TypeError);
  });
});
