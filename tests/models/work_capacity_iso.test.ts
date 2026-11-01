import { describe, expect, test } from "vitest";
import { work_capacity_iso } from "../../src/models/index.ts";
import { approx } from "./testUtils.ts";

// Mirrors pythermalcomfort v4.7.0 tests/test_work_capacity_iso.py. Its
// pytest.approx is rel 1e-3 or abs 1e-6; its list call runs element-wise.
describe("test_work_capacity_iso", () => {
  const _expected_capacity = (wbgt: number, met: number) => {
    const met_rest = 117.0;
    const wbgt_lim = 34.9 - met / 46.0;
    const wbgt_lim_rest = 34.9 - met_rest / 46.0;
    const cap = ((wbgt_lim_rest - wbgt) / (wbgt_lim_rest - wbgt_lim)) * 100.0;
    return Math.min(Math.max(cap, 0), 100);
  };

  // Upstream also asserts a WorkCapacity instance and a float capacity; a JS
  // result is a plain object.
  test("test_scalar_typical", () => {
    const wbgt = 30.0;
    const met = 200.0;
    const result = work_capacity_iso({ wbgt, met });
    const expected = _expected_capacity(wbgt, met);
    expect(approx(result.capacity, expected, { rel: 1e-3, abs: 0 })).toBe(true);
  });

  test("test_list_input_pairwise", () => {
    const pairs = [
      [20.0, 100.0],
      [30.0, 200.0],
      [40.0, 300.0],
    ] as const;
    for (const [wbgt, met] of pairs) {
      const result = work_capacity_iso({ wbgt, met });
      const expected = _expected_capacity(wbgt, met);
      expect(approx(result.capacity, expected, { rel: 1e-3, abs: 0 })).toBe(
        true,
      );
    }
  });

  test("test_exact_wbgt_lim_full_capacity", () => {
    const met = 250.0;
    const wbgt_lim = 34.9 - met / 46.0;
    const result = work_capacity_iso({ wbgt: wbgt_lim, met });
    expect(approx(result.capacity, 100.0, { rel: 0, abs: 1e-6 })).toBe(true);
  });

  test("test_resting_limit_zero_capacity", () => {
    const met = 250.0;
    const wbgt_lim_rest = 34.9 - 117.0 / 46.0;
    const result = work_capacity_iso({ wbgt: wbgt_lim_rest, met });
    expect(approx(result.capacity, 0.0, { rel: 0, abs: 1e-6 })).toBe(true);
  });

  test("test_low_wbgt_clamped_to_100", () => {
    const result = work_capacity_iso({ wbgt: 0.0, met: 500.0 });
    expect(approx(result.capacity, 100.0, { rel: 0, abs: 1e-6 })).toBe(true);
  });

  test("test_high_wbgt_clamped_to_0", () => {
    const result = work_capacity_iso({ wbgt: 100.0, met: 500.0 });
    expect(approx(result.capacity, 0.0, { rel: 0, abs: 1e-6 })).toBe(true);
  });

  // Upstream's ValueError is a RangeError.
  test("test_negative_met_raises", () => {
    expect(() => work_capacity_iso({ wbgt: 25.0, met: -10.0 })).toThrow(
      RangeError,
    );
  });

  test("test_met_above_max_raises", () => {
    expect(() => work_capacity_iso({ wbgt: 25.0, met: 3000.0 })).toThrow(
      RangeError,
    );
  });
});
