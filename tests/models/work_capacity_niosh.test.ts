import { describe, expect, expectTypeOf, test } from "vitest";
import {
  work_capacity_niosh,
  WORK_CAPACITY_NIOSH_INFO,
} from "../../src/models/index.ts";
import type { WorkCapacityStandardsInputs } from "../../src/models/index.ts";
import { work_capacity_niosh as work_capacity_niosh_from_root } from "../../src/index.ts";
import type { InputsOf } from "../../src/_internal/modelInfo.ts";
import { describeModelContract } from "./modelContract.ts";
import { approx } from "./testUtils.ts";

const call = (inputs: unknown) =>
  work_capacity_niosh(inputs as Parameters<typeof work_capacity_niosh>[0]);

// Mirrors pythermalcomfort v4.8.0 tests/test_work_capacity_niosh.py. Its
// pytest.approx is rel 1e-3 or abs 1e-6; its list call runs element-wise.
describe("test_work_capacity_niosh", () => {
  const _expected_capacity = (wbgt: number, met: number) => {
    const met_rest = 117.0;
    const wbgt_lim = 56.7 - 11.5 * Math.log10(met);
    const wbgt_lim_rest = 56.7 - 11.5 * Math.log10(met_rest);
    const cap = ((wbgt_lim_rest - wbgt) / (wbgt_lim_rest - wbgt_lim)) * 100;
    return Math.min(Math.max(cap, 0), 100);
  };

  test("test_scalar_typical", () => {
    // Upstream also asserts a WorkCapacity instance and a float capacity; a
    // JS result is a plain object.
    const wbgt = 25.0;
    const met = 200.0;
    const result = work_capacity_niosh({ wbgt, met });
    const expected = _expected_capacity(wbgt, met);
    expect(approx(result.capacity, expected, { rel: 1e-3, abs: 0 })).toBe(true);
  });

  test("test_list_input_pairwise", () => {
    // Upstream also asserts an np.ndarray capacity; the model takes scalars.
    const pairs = [
      [20.0, 150.0],
      [30.0, 250.0],
      [40.0, 350.0],
    ] as const;
    for (const [wbgt, met] of pairs) {
      const result = work_capacity_niosh({ wbgt, met });
      const expected = _expected_capacity(wbgt, met);
      expect(approx(result.capacity, expected, { rel: 1e-3, abs: 0 })).toBe(
        true,
      );
    }
  });

  test("test_exact_wbgt_lim_full_capacity", () => {
    const met = 300.0;
    const wbgt_lim = 56.7 - 11.5 * Math.log10(met);
    const result = work_capacity_niosh({ wbgt: wbgt_lim, met });
    expect(approx(result.capacity, 100.0, { rel: 0, abs: 1e-6 })).toBe(true);
  });

  test("test_resting_limit_zero_capacity", () => {
    const met = 200.0;
    const wbgt_lim_rest = 56.7 - 11.5 * Math.log10(117.0);
    const result = work_capacity_niosh({ wbgt: wbgt_lim_rest, met });
    expect(approx(result.capacity, 0.0, { rel: 0, abs: 1e-6 })).toBe(true);
  });

  test("test_low_wbgt_clamped_to_100", () => {
    const result = work_capacity_niosh({ wbgt: 0.0, met: 250.0 });
    expect(approx(result.capacity, 100.0, { rel: 0, abs: 1e-6 })).toBe(true);
  });

  test("test_high_wbgt_clamped_to_0", () => {
    const result = work_capacity_niosh({ wbgt: 100.0, met: 250.0 });
    expect(approx(result.capacity, 0.0, { rel: 0, abs: 1e-6 })).toBe(true);
  });

  // Upstream's ValueError is a RangeError.
  test("test_negative_met_raises", () => {
    expect(() => work_capacity_niosh({ wbgt: 25.0, met: -10.0 })).toThrow(
      RangeError,
    );
  });

  test("test_met_above_max_raises", () => {
    expect(() => work_capacity_niosh({ wbgt: 25.0, met: 3000.0 })).toThrow(
      RangeError,
    );
  });
});

describeModelContract(work_capacity_niosh, WORK_CAPACITY_NIOSH_INFO, {
  wbgt: 30,
  met: 300,
});

const met_message = "Metabolic rate out of plausible range";
const wbgt_lim_rest = 56.7 - 11.5 * Math.log10(117);

// What upstream's tests leave out, measured on pythermalcomfort 4.7.0 in the
// parity image.
describe("work_capacity_niosh (JS-only)", () => {
  test.each([
    [28.0, 250.0, 100.0],
    [30.0, 300.0, 62.003258471944356],
    [31.0, 400.0, 31.205248150906062],
    [25.0, 1000.0, 73.87051227556731],
    [20.0, 2500.0, 84.46061166091113],
    [32.0, 150.0, 73.80559934543169],
    [33.0, 50.0, 1.9815770048692232],
    [36.0, 50.0, 72.63660440462813],
    [38.0, 50.0, 100.0],
    [25.0, 2500.0, 51.764145949502584],
  ] as const)("wbgt %s, met %s gives %s", (wbgt, met, expected) => {
    const { capacity } = work_capacity_niosh({ wbgt, met });
    expect(approx(capacity, expected, { rel: 1e-12, abs: 0 })).toBe(true);
  });

  test.each([
    [30.0, 100.0],
    [40.0, 0.0],
  ] as const)(
    "at the resting 117 W, wbgt %s gives %s, as upstream's division by zero clips",
    (wbgt, expected) => {
      expect(work_capacity_niosh({ wbgt, met: 117 }).capacity).toBe(expected);
    },
  );

  test("at the resting 117 W, wbgt on the resting limit gives upstream's NaN, as null", () => {
    expect(
      work_capacity_niosh({ wbgt: wbgt_lim_rest, met: 117 }).capacity,
    ).toBe(null);
  });

  test("wbgt on the resting limit with met below 117 W gives -0.0, as upstream's np.clip keeps it", () => {
    expect(work_capacity_niosh({ wbgt: wbgt_lim_rest, met: 46 }).capacity).toBe(
      -0,
    );
  });

  test.each([
    [0, 25.0, -0],
    [0, wbgt_lim_rest, -0],
    [0, 40.0, 0],
    [-0, 25.0, -0],
  ] as const)(
    "at met %s W, where log10 gives -inf, wbgt %s gives %s, as upstream's does",
    (met, wbgt, expected) => {
      expect(work_capacity_niosh({ wbgt, met }).capacity).toBe(expected);
    },
  );

  // Deviation work_capacity_niosh-3.
  test.each([-10, -Number.MIN_VALUE, 2500.0001, 3000])(
    "met %s throws upstream's message as a RangeError",
    (met) => {
      expect(() => call({ wbgt: 25, met })).toThrow(
        new RangeError(met_message),
      );
    },
  );

  // Deviation work_capacity_niosh-4.
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

  test("its INFO gives WorkCapacityStandardsInputs, the type work_capacity_iso declares", () => {
    expectTypeOf<
      InputsOf<typeof WORK_CAPACITY_NIOSH_INFO>
    >().toEqualTypeOf<WorkCapacityStandardsInputs>();
  });

  // Deviation work_capacity_niosh-2.
  test("returns no rows", () => {
    for (const [wbgt, met] of [
      [0, 0],
      [30, 117],
      [30, 300],
      [100, 2500],
    ] as const) {
      expect(work_capacity_niosh({ wbgt, met }).warnings).toEqual([]);
    }
  });

  test("is exported from the package root as from its subpath", () => {
    expect(work_capacity_niosh_from_root).toBe(work_capacity_niosh);
  });
});
