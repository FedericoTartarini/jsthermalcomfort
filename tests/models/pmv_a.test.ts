import { describe, expect, test } from "vitest";
import { pmv_a } from "../../src/models/index.ts";
import { testDataUrls } from "./comftest.ts";
import { loadTestData, validateResult } from "./testUtils.ts";

type Inputs = Parameters<typeof pmv_a>[0];

const { testData: reference_table, tolerances: tolerance } = await loadTestData(
  testDataUrls.aPmv,
);

// Mirrors pythermalcomfort v4.7.0 tests/test_a_pmv.py.
describe("test_a_pmv", () => {
  test.each(reference_table.data)("test_a_pmv: case %#", (entry) => {
    const { inputs, outputs } = entry;
    const result = pmv_a(inputs as unknown as Inputs);

    validateResult(result, outputs, tolerance, inputs);
  });

  test("test_a_pmv_wrong_input_type", () => {
    const inputs = {
      tdb: 25,
      tr: 25,
      vr: 0.1,
      rh: 50,
      met: 1.2,
      clo: 0.5,
      a_coefficient: 7,
    };
    expect(() => pmv_a({ ...inputs, tdb: "25" } as unknown as Inputs)).toThrow(
      TypeError,
    );
    expect(() =>
      pmv_a({ ...inputs, units: "celsius" } as unknown as Inputs),
    ).toThrow(RangeError);
  });

  test("test_not_valid_units", () => {
    expect(() =>
      pmv_a({
        tdb: 25,
        tr: 25,
        vr: 0.1,
        rh: 50,
        met: 1.2,
        clo: 0.5,
        a_coefficient: 7,
        units: "wrong",
      } as unknown as Inputs),
    ).toThrow(RangeError);
  });
});
