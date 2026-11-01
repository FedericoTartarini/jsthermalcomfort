import { describe, expect, test } from "vitest";
import { work_capacity_hothaps } from "../../src/models/index.ts";
import { WorkIntensity } from "../../src/utilities/index.ts";
import { approx } from "./testUtils.ts";

const call = (inputs: unknown) =>
  work_capacity_hothaps(inputs as Parameters<typeof work_capacity_hothaps>[0]);

// Mirrors pythermalcomfort v4.7.0 tests/test_work_capacity_hothaps.py. Its
// pytest.approx is rel 1e-3 or 1e-6; its list call runs element-wise.
describe("test_work_capacity_hothaps", () => {
  const _expected_capacity = (
    wbgt: number,
    divisor: number,
    exponent: number,
  ) =>
    Math.min(
      Math.max(100 * (0.1 + 0.9 / (1 + (wbgt / divisor) ** exponent)), 0),
      100,
    );

  // Upstream also asserts a WorkCapacity instance and a float capacity; a JS
  // result is a plain object.
  test("test_scalar_heavy", () => {
    const result = work_capacity_hothaps({
      wbgt: 30.0,
      work_intensity: WorkIntensity.HEAVY,
    });
    const expected = _expected_capacity(30.0, 30.94, 16.64);
    expect(approx(result.capacity, expected, { rel: 1e-3, abs: 0 })).toBe(true);
  });

  test("test_scalar_moderate", () => {
    const result = work_capacity_hothaps({
      wbgt: 30.0,
      work_intensity: WorkIntensity.MODERATE,
    });
    const expected = _expected_capacity(30.0, 32.93, 17.81);
    expect(approx(result.capacity, expected, { rel: 1e-3, abs: 0 })).toBe(true);
  });

  test("test_scalar_light", () => {
    const result = work_capacity_hothaps({
      wbgt: 30.0,
      work_intensity: WorkIntensity.LIGHT,
    });
    const expected = _expected_capacity(30.0, 34.64, 22.72);
    expect(approx(result.capacity, expected, { rel: 1e-3, abs: 0 })).toBe(true);
  });

  test("test_list_input", () => {
    const wbgts = [20.0, 40.0];
    for (const wbgt of wbgts) {
      const result = work_capacity_hothaps({ wbgt, work_intensity: "heavy" });
      const expected = _expected_capacity(wbgt, 30.94, 16.64);
      expect(approx(result.capacity, expected, { rel: 1e-3, abs: 0 })).toBe(
        true,
      );
    }
  });

  test("test_low_wbgt_clamped_to_100", () => {
    const result = work_capacity_hothaps({
      wbgt: 0.0,
      work_intensity: "light",
    });
    expect(approx(result.capacity, 100.0, { rel: 1e-6, abs: 0 })).toBe(true);
  });

  test("test_high_wbgt_approaches_10_percent", () => {
    const result = work_capacity_hothaps({
      wbgt: 100.0,
      work_intensity: "moderate",
    });
    expect(approx(result.capacity, 10.0, { rel: 1e-3, abs: 0 })).toBe(true);
  });

  // Upstream's ValueError is a RangeError.
  test("test_invalid_intensity_raises", () => {
    expect(() => call({ wbgt: 30.0, work_intensity: "invalid" })).toThrow(
      RangeError,
    );
  });

  test("test_work_intensity_accepts_enum", () => {
    expect(
      work_capacity_hothaps({
        wbgt: 30,
        work_intensity: WorkIntensity.MODERATE,
      }).capacity,
    ).toBe(
      work_capacity_hothaps({ wbgt: 30, work_intensity: "moderate" }).capacity,
    );
  });
});
