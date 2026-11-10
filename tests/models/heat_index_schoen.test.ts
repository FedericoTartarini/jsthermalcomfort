import { describe, expect, test } from "vitest";
import {
  heat_index_schoen,
  HEAT_INDEX_SCHOEN_INFO,
} from "../../src/models/index.ts";
import { heat_index_schoen as heat_index_schoen_from_root } from "../../src/index.ts";
import { psy_ta_rh } from "../../src/psychrometrics/index.ts";
import { HEAT_INDEX_RISK_CATEGORIES } from "../../src/_internal/validation.ts";
import { round } from "../../src/_internal/round.ts";
import { describeModelContract } from "./modelContract.ts";
import { approx } from "./testUtils.ts";

type Inputs = Parameters<typeof heat_index_schoen>[0];

// Mirrors pythermalcomfort v4.8.0 tests/test_heat_index_schoen.py. Its
// is_equal is np.allclose with atol 1e-6 and the default rtol, 1e-5, and its
// list and broadcast calls run element-wise.
describe("test_heat_index_schoen", () => {
  function _expected_heat_index_schoen(tdb: number, rh: number): number {
    // Calculate Schoen heat index from the published equation.
    const t_dew = psy_ta_rh(tdb, rh, 101325).dew_point_tmp;
    return (
      tdb -
      1.0799 * Math.exp(0.03755 * tdb) * (1 - Math.exp(0.0801 * (t_dew - 14)))
    );
  }

  function _expected_stress_category(hi: number): string | null {
    // Calculate heat stress categories from heat index thresholds.
    let category: string | null = "extreme danger";
    if (hi <= 54) category = "danger";
    if (hi <= 41) category = "extreme caution";
    if (hi <= 32) category = "caution";
    if (hi <= 27) category = "no risk";
    if (hi > 1000) category = null;
    return category;
  }

  test("test_scalar_rounding_default", () => {
    // Upstream also asserts an HI instance whose hi is a zero-dim ndarray; a
    // JS scalar has no shape.
    const result = heat_index_schoen({ tdb: 29, rh: 50 });
    const expected = round(_expected_heat_index_schoen(29, 50), 1);

    expect(approx(result.hi, expected, { rel: 1e-5, abs: 1e-6 })).toBe(true);
    expect(result.stress_category).toBe("caution");
  });

  test("test_scalar_no_rounding", () => {
    const result = heat_index_schoen({ tdb: 29, rh: 50, round_output: false });
    const expected = _expected_heat_index_schoen(29, 50);

    expect(approx(result.hi, expected, { rel: 1e-5, abs: 1e-6 })).toBe(true);
  });

  test("test_no_risk_category_below_lower_bound", () => {
    const result = heat_index_schoen({ tdb: 10, rh: 50 });

    expect(result.hi).toBeLessThan(27);
    expect(result.stress_category).toBe("no risk");
  });

  test("test_list_input", () => {
    const tdb = [29, 35, 45, 55];
    const rh = [50, 60, 70, 80];

    tdb.forEach((t, i) => {
      const h = rh[i] ?? NaN;
      const result = heat_index_schoen({ tdb: t, rh: h });
      const expected = round(_expected_heat_index_schoen(t, h), 1);

      expect(approx(result.hi, expected, { rel: 1e-5, abs: 1e-6 })).toBe(true);
      expect(result.stress_category).toBe(
        _expected_stress_category(_expected_heat_index_schoen(t, h)),
      );
    });
  });

  // Upstream's parametrize has no ids; `id` is the one pytest generates.
  test.each([
    {
      id: "26.689952-27.0-caution",
      tdb: 26.689952,
      boundary: 27.0,
      category: "caution",
    },
    {
      id: "30.436055-32.0-extreme caution",
      tdb: 30.436055,
      boundary: 32.0,
      category: "extreme caution",
    },
    {
      id: "35.979625-41.0-danger",
      tdb: 35.979625,
      boundary: 41.0,
      category: "danger",
    },
    {
      id: "41.740423-54.0-extreme danger",
      tdb: 41.740423,
      boundary: 54.0,
      category: "extreme danger",
    },
  ])(
    "test_category_uses_unrounded_heat_index[$id]",
    ({ tdb, boundary, category }) => {
      const rounded = heat_index_schoen({ tdb, rh: 50 });
      const unrounded = heat_index_schoen({
        tdb,
        rh: 50,
        round_output: false,
      });

      expect(unrounded.hi).toBeGreaterThan(boundary);
      expect(unrounded.hi).toBeLessThan(boundary + 0.05);
      expect(rounded.hi).toBe(boundary);
      expect(rounded.stress_category).toBe(category);
      expect(unrounded.stress_category).toBe(category);
    },
  );

  test.each([
    { id: "True", round_output: true },
    { id: "False", round_output: false },
  ])("test_category_rounding_with_broadcast[$id]", ({ round_output }) => {
    const results = [26.689952, 30.436055, 35.979625, 41.740423].map((tdb) =>
      heat_index_schoen({ tdb, rh: 50, round_output }),
    );

    expect(results.map((result) => result.stress_category)).toEqual([
      "caution",
      "extreme caution",
      "danger",
      "extreme danger",
    ]);
  });

  // Upstream's ValueError is a RangeError.
  test.each([
    { id: "tdb-string", tdb: "29", rh: 50, expected_error: TypeError },
    { id: "rh-string", tdb: 29, rh: "50", expected_error: TypeError },
    { id: "rh-negative", tdb: 29, rh: -1, expected_error: RangeError },
    { id: "rh-over-100", tdb: 29, rh: 101, expected_error: RangeError },
  ])(
    "test_invalid_inputs_raise_specific[$id]",
    ({ tdb, rh, expected_error }) => {
      expect(() => heat_index_schoen({ tdb, rh } as unknown as Inputs)).toThrow(
        expected_error,
      );
    },
  );
});

describeModelContract(heat_index_schoen, HEAT_INDEX_SCHOEN_INFO, {
  tdb: 29,
  rh: 50,
});

// What upstream's tests leave out, measured on pythermalcomfort 4.7.0 in the
// parity image.
describe("heat_index_schoen (JS-only)", () => {
  // A call with inputs the type rejects, to test the runtime.
  const call = (inputs: unknown) => () => heat_index_schoen(inputs as Inputs);

  test.each([
    [10, 50, 8.941855034981682, "no risk"],
    [29, 50, 30.04629295772395, "caution"],
    [35, 60, 41.551584343965835, "danger"],
    [45, 70, 79.96403779495269, "extreme danger"],
    [25, 100, 28.902919828894223, "caution"],
    [-40, 50, -40.2385812798619, "no risk"],
  ])("tdb %s, rh %s gives %s, %s", (tdb, rh, expected, category) => {
    const result = heat_index_schoen({ tdb, rh, round_output: false });
    expect(approx(result.hi, expected, { rel: 1e-12, abs: 0 })).toBe(true);
    expect(result.stress_category).toBe(category);
  });

  // deviation heat_index_schoen-1 (heat_index_schoen.py:70, _internal/validation.py:289)
  test("the stress category bins are the shared HEAT_INDEX_RISK_CATEGORIES, not a copy", () => {
    expect(HEAT_INDEX_SCHOEN_INFO.outputs.stress_category.classifier).toBe(
      HEAT_INDEX_RISK_CATEGORIES,
    );
  });

  // _internal/validation.py:242-244, as upstream's _mapping maps it.
  test("an hi above 1000 has a null category", () => {
    const result = heat_index_schoen({ tdb: 70, rh: 100, round_output: false });
    expect(approx(result.hi, 1382.4282571690032, { rel: 1e-12, abs: 0 })).toBe(
      true,
    );
    expect(result.stress_category).toBe(null);
  });

  // psychrometrics/dew_point_tmp.py:53, as upstream's log(0) gives it.
  test("rh 0 gives a null hi and a null category", () => {
    const result = heat_index_schoen({ tdb: 25, rh: 0 });
    expect(result.hi).toBe(null);
    expect(result.stress_category).toBe(null);
  });

  // Deviation _shared-57, through psy_ta_rh's dew_point_tmp.
  test("an rh outside [0, 100] throws dew_point_tmp's message as a RangeError", () => {
    for (const rh of [-0.1, 100.1]) {
      expect(call({ tdb: 29, rh })).toThrow(
        new RangeError("Relative humidity must be between 0 and 100%."),
      );
    }
  });

  // Deviation heat_index_schoen-2.
  test("returns no rows", () => {
    for (const [tdb, rh] of [
      [-20, 0],
      [29, 50],
      [70, 100],
    ] as const) {
      expect(heat_index_schoen({ tdb, rh }).warnings).toEqual([]);
    }
  });

  test("is exported from the package root as from its subpath", () => {
    expect(heat_index_schoen_from_root).toBe(heat_index_schoen);
  });
});
