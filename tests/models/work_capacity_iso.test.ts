import { describe, expect, test } from "vitest";
import {
  work_capacity_iso,
  WORK_CAPACITY_ISO_INFO,
} from "../../src/models/index.ts";
import { work_capacity_iso as work_capacity_iso_from_root } from "../../src/index.ts";
import { describeModelContract } from "./modelContract.ts";
import { approx } from "./testUtils.ts";

const call = (inputs: unknown) =>
  work_capacity_iso(inputs as Parameters<typeof work_capacity_iso>[0]);

// Mirrors pythermalcomfort v4.8.0 tests/test_work_capacity_iso.py. Its
// pytest.approx is rel 1e-3 or abs 1e-6; its list call runs element-wise.
describe("test_work_capacity_iso", () => {
  const _expected_capacity = (wbgt: number, met: number) => {
    const met_rest = 117.0;
    const wbgt_lim = 34.9 - met / 46.0;
    const wbgt_lim_rest = 34.9 - met_rest / 46.0;
    const cap = ((wbgt_lim_rest - wbgt) / (wbgt_lim_rest - wbgt_lim)) * 100.0;
    return Math.min(Math.max(cap, 0), 100);
  };

  test("test_scalar_typical", () => {
    // Upstream also asserts a WorkCapacity instance and a float capacity; a
    // JS result is a plain object.
    const wbgt = 30.0;
    const met = 200.0;
    const result = work_capacity_iso({ wbgt, met });
    const expected = _expected_capacity(wbgt, met);
    expect(approx(result.capacity, expected, { rel: 1e-3, abs: 0 })).toBe(true);
  });

  test("test_list_input_pairwise", () => {
    // Upstream also asserts an np.ndarray capacity; the model takes scalars.
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

describeModelContract(work_capacity_iso, WORK_CAPACITY_ISO_INFO, {
  wbgt: 30,
  met: 300,
});

const met_message = "Metabolic rate out of plausible range";

// What upstream's tests leave out, measured on pythermalcomfort 4.7.0 in the
// parity image.
describe("work_capacity_iso (JS-only)", () => {
  test.each([
    [28.0, 250.0, 100.0],
    [30.0, 300.0, 59.234972677595636],
    [31.0, 400.0, 22.04946996466432],
    [25.0, 1000.0, 38.323895809739525],
    [20.0, 2500.0, 23.85228703315149],
    [32.0, 150.0, 49.69696969696972],
    [33.0, 50.0, 44.17910447761201],
    [34.0, 50.0, 100.0],
    [25.0, 0.0, 0.0],
    [25.0, 2500.0, 14.200587494754513],
  ] as const)("wbgt %s, met %s gives %s", (wbgt, met, expected) => {
    const { capacity } = work_capacity_iso({ wbgt, met });
    expect(approx(capacity, expected, { rel: 1e-12, abs: 0 })).toBe(true);
  });

  test.each([
    [30.0, 100.0],
    [40.0, 0.0],
  ] as const)(
    "at the resting 117 W, wbgt %s gives %s, as upstream's division by zero clips",
    (wbgt, expected) => {
      expect(work_capacity_iso({ wbgt, met: 117 }).capacity).toBe(expected);
    },
  );

  test("at the resting 117 W, wbgt on the resting limit gives upstream's NaN, as null", () => {
    const wbgt = 34.9 - 117 / 46;
    expect(work_capacity_iso({ wbgt, met: 117 }).capacity).toBe(null);
  });

  test("wbgt on the resting limit with met below 117 W gives -0.0, as upstream's np.clip keeps it", () => {
    const wbgt = 34.9 - 117 / 46;
    expect(work_capacity_iso({ wbgt, met: 46 }).capacity).toBe(-0);
  });

  // Deviation work_capacity_iso-3.
  test.each([-10, -Number.MIN_VALUE, 2500.0001, 3000])(
    "met %s throws upstream's message as a RangeError",
    (met) => {
      expect(() => call({ wbgt: 25, met })).toThrow(
        new RangeError(met_message),
      );
    },
  );

  // Deviation work_capacity_iso-4.
  test.each([Infinity, -Infinity])(
    "met %s throws the parse's message as a RangeError",
    (met) => {
      expect(() => call({ wbgt: 25, met })).toThrow(
        new RangeError("met must be a finite number."),
      );
    },
  );

  test("checks met's range after the parse, as upstream's __post_init__ runs after BaseInputs'", () => {
    expect(() => call({ wbgt: "30", met: 3000 })).toThrow(
      new TypeError("wbgt must be a finite number."),
    );
  });

  // Deviation work_capacity_iso-2.
  test("returns no rows", () => {
    for (const [wbgt, met] of [
      [0, 0],
      [30, 117],
      [30, 300],
      [100, 2500],
    ] as const) {
      expect(work_capacity_iso({ wbgt, met }).warnings).toEqual([]);
    }
  });

  test("is exported from the package root as from its subpath", () => {
    expect(work_capacity_iso_from_root).toBe(work_capacity_iso);
  });
});
