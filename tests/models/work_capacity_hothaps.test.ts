import { describe, expect, test } from "vitest";
import {
  work_capacity_hothaps,
  WORK_CAPACITY_HOTHAPS_INFO,
} from "../../src/models/index.ts";
import { work_capacity_hothaps as work_capacity_hothaps_from_root } from "../../src/index.ts";
import { WorkIntensity } from "../../src/utilities/index.ts";
import { describeModelContract } from "./modelContract.ts";
import { approx } from "./testUtils.ts";

const call = (inputs: unknown) =>
  work_capacity_hothaps(inputs as Parameters<typeof work_capacity_hothaps>[0]);

// Mirrors pythermalcomfort v4.8.0 tests/test_work_capacity_hothaps.py. Its
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

  test("test_scalar_heavy", () => {
    // Upstream also asserts a WorkCapacity instance and a float capacity; a
    // JS result is a plain object.
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

describeModelContract(work_capacity_hothaps, WORK_CAPACITY_HOTHAPS_INFO, {
  wbgt: 30,
});

const work_intensity_message =
  "work_intensity must be one of ['heavy', 'moderate', 'light']";

// What upstream's tests leave out, measured on pythermalcomfort 4.7.0 in the
// parity image.
describe("work_capacity_hothaps (JS-only)", () => {
  test.each([
    [20, "heavy", 99.93678523325094],
    [25.5, "heavy", 96.53454572629144],
    [28, "moderate", 95.25438460639754],
    [31.4, "light", 91.270941835105],
    [35, "heavy", 20.249425229307455],
    [40, "light", 13.299353450358598],
    [45, "moderate", 10.344485432347462],
  ] as const)("wbgt %s, %s gives %s", (wbgt, work_intensity, expected) => {
    const { capacity } = work_capacity_hothaps({ wbgt, work_intensity });
    expect(approx(capacity, expected, { rel: 1e-12, abs: 0 })).toBe(true);
  });

  test("work_intensity in any case gives its value, as upstream lower-cases it", () => {
    const { capacity } = call({ wbgt: 30, work_intensity: "HEAVY" });
    expect(approx(capacity, 66.30396938573278, { rel: 1e-12, abs: 0 })).toBe(
      true,
    );
  });

  test("a negative wbgt gives upstream's NaN, as null", () => {
    expect(work_capacity_hothaps({ wbgt: -5 }).capacity).toBe(null);
  });

  // Deviation work_capacity_hothaps-3, deviation work_capacity_hothaps-4,
  // deviation work_capacity_hothaps-5.
  test.each([
    ["", RangeError],
    ["extreme", RangeError],
    [5, TypeError],
    [true, TypeError],
    [null, TypeError],
    [["heavy", "light"], TypeError],
    [["heavy", "invalid"], TypeError],
  ])("work_intensity %j throws upstream's message as a %O", (value, error) => {
    expect(() => call({ wbgt: 30, work_intensity: value })).toThrow(
      new error(work_intensity_message),
    );
  });

  // Deviation work_capacity_hothaps-2.
  test("returns no rows", () => {
    for (const wbgt of [-5, 0, 30, 100]) {
      expect(work_capacity_hothaps({ wbgt }).warnings).toEqual([]);
    }
  });

  test("is exported from the package root as from its subpath", () => {
    expect(work_capacity_hothaps_from_root).toBe(work_capacity_hothaps);
  });
});
