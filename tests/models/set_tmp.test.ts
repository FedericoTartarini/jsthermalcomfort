import { describe, expect, test } from "vitest";
import { set_tmp } from "../../src/models/index.ts";
import { testDataUrls } from "./comftest.ts";
import { loadTestData, validateResult } from "./testUtils.ts";

type Inputs = Parameters<typeof set_tmp>[0];

const { testData: reference_table, tolerances: tolerance } = await loadTestData(
  testDataUrls.setTmp,
);

// Mirrors pythermalcomfort v4.7.0 tests/test_set.py.
// Upstream's arrays are called element-wise.
describe("test_set", () => {
  test.each(reference_table.data)("test_set_url: fixture case %#", (entry) => {
    const { inputs, outputs } = entry;
    const result = set_tmp({
      ...(inputs as unknown as Inputs),
      round_output: true,
      limit_inputs: false,
    });

    validateResult(result, outputs, tolerance, inputs);
  });

  test.each([
    [41, 20, 0.1, 1.1, 0.5],
    [20, 41, 0.1, 1.1, 0.5],
    [20, 20, 2.1, 1.1, 0.5],
    [20, 20, 0.1, 0.7, 0.5],
    [20, 20, 0.1, 1.1, 2.1],
    [39, 39, 0.1, 3.9, 1.9],
  ])(
    "test_set_npnan: tdb %s, tr %s, v %s, met %s, clo %s",
    (tdb, tr, v, met, clo) => {
      expect(set_tmp({ tdb, tr, v, rh: 50, met, clo }).set).toBeNaN();
    },
  );

  test("test_set_continuous_at_critical_wettedness", () => {
    // np.round(np.arange(32.5, 34.0, 0.001), 3): 1,500 temperatures
    const t = Array.from({ length: 1500 }, (_, i) => (32500 + i) / 1000);
    const result = t.map(
      (tdb) =>
        set_tmp({
          tdb,
          tr: tdb,
          v: 0.1,
          rh: 70,
          met: 1.1,
          clo: 0.5,
          round_output: false,
          limit_inputs: false,
        }).set,
    );
    const diff = result.slice(1).map((value, i) => value - (result[i] ?? NaN));
    const max_step = Math.max(...diff.map(Math.abs));
    expect(max_step).toBeLessThan(0.01);
    // monotonic, so cooling_effect has a single root
    expect(diff.every((step) => step > 0)).toBe(true);
  });
});
