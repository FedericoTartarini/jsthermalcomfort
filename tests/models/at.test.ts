import { describe, expect, test } from "vitest";
import { at } from "../../src/models/index.ts";
import { testDataUrls } from "./comftest.ts";
import { approx, loadTestData, validateResult } from "./testUtils.ts";

type Inputs = Parameters<typeof at>[0];

const { testData: reference_table, tolerances: tolerance } = await loadTestData(
  testDataUrls.at,
);

// Mirrors pythermalcomfort v4.7.0 tests/test_at.py. Its is_equal is
// np.isclose or np.allclose with the given atol and the default rtol, 1e-5,
// and its list call runs element-wise.
describe("test_at", () => {
  test.each(reference_table.data)("test_at: fixture case %#", (entry) => {
    const { inputs, outputs } = entry;
    const result = at(inputs as unknown as Inputs);

    validateResult(result, outputs, tolerance, inputs);
  });

  // tests/test_at.py:25 calls is_equal without asserting its result; this asserts it.
  test("test_at_list_input", () => {
    const tdb = [25, 25, 25];
    const rh = [30, 30, 30];
    const v = [0.1, 0.1, 0.1];

    tdb.forEach((t, i) => {
      const result = at({ tdb: t, rh: rh[i] ?? NaN, v: v[i] ?? NaN });
      expect(approx(result.at, 24.1, { rel: 1e-5, abs: 0.1 })).toBe(true);
    });
  });

  // tests/test_at.py:31 calls is_equal without asserting its result, and its
  // 25.3 is not what 4.7.0 returns, 30.9 (upstream draft 46); this asserts 30.9.
  test("test_at_q", () => {
    const result = at({ tdb: 25, rh: 30, v: 0.1, q: 100 });
    expect(approx(result.at, 30.9, { rel: 1e-5, abs: 0.1 })).toBe(true);
  });
});
