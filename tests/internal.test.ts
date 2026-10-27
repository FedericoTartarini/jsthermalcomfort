import { describe, expect, test } from "vitest";
import * as validation from "../src/_internal/validation.ts";
import {
  _mapping,
  _valid_range,
  HEAT_INDEX_STRESS_CATEGORIES,
} from "../src/_internal/validation.ts";
import type { ModelWarning } from "../src/_internal/modelDocs.ts";

// Mirrors pythermalcomfort v4.6.2 tests/test_internal.py, which tests
// _internal directly, so it imports the kernels' own file (seam S2). A
// UserWarning becomes a range row (deviation _shared-3), and a `match=` on its
// text becomes assertions on the row's key, value and bound.
describe("test_internal", () => {
  const bound = { min: 10.0, max: 40.0 };

  describe("TestValidRange", () => {
    test("test_scalar_out_of_range_warns", () => {
      const warnings: ModelWarning[] = [];
      const result = _valid_range(50.0, bound, "tdb", "input", "°C", warnings);
      expect(warnings).toMatchObject([{ key: "tdb", value: 50.0, bound }]);
      expect(result).toBeNaN();
    });

    // Upstream's array, element-wise: one row per value outside the bound.
    test("test_array_out_of_range_warns", () => {
      const warnings: ModelWarning[] = [];
      const result = [20.0, 50.0, 30.0, 45.0].map((x) =>
        _valid_range(x, bound, "tdb", "input", "°C", warnings),
      );
      expect(warnings).toMatchObject([
        { key: "tdb", value: 50.0, bound },
        { key: "tdb", value: 45.0, bound },
      ]);
      expect(result[1]).toBeNaN();
      expect(result[3]).toBeNaN();
      expect([result[0], result[2]]).toEqual([20.0, 30.0]);
    });

    test("test_in_range_no_warning", () => {
      const warnings: ModelWarning[] = [];
      const result = _valid_range(25.0, bound, "tdb", "input", "°C", warnings);
      expect(warnings).toHaveLength(0);
      expect(result).toBe(25.0);
    });

    test.todo(
      "test_no_param_name_auto_extracts_from_caller: param_name is required, since JavaScript cannot read the caller's source",
    );
    test.todo(
      "test_no_param_name_literal_falls_back_to_unknown: param_name is required, since JavaScript cannot read the caller's source",
    );
  });

  test("test_internal_renames_have_no_compatibility_aliases", () => {
    expect(validation).not.toHaveProperty("valid_range");
    expect(validation).not.toHaveProperty("mapping");
    // Upstream's {15: "low", 25: "medium", 35: "high"}, element-wise.
    const bins = {
      edges: [15, 25, 35],
      labels: ["low", "medium", "high"],
      right: true,
    };
    expect([10, 20, 30].map((value) => _mapping(value, bins))).toEqual([
      "low",
      "medium",
      "high",
    ]);
  });

  describe.todo(
    "TestCheckAshrae55Compliance: mirrored when _check_ashrae55_compliance migrates",
  );
  test.todo(
    "test_validate_type: no counterpart, as the input definition's parse makes upstream's type checks",
  );
  test.todo(
    "test_base_inputs_store_normalized_numpy_scalar: no counterpart, as JavaScript has no numpy scalars",
  );
});

// What upstream's tests leave out: the row's other fields, and the unbounded
// side of upstream's (27.0, np.inf).
describe("_valid_range (JS-only)", () => {
  test("a row carries its kind, role and unit, frozen", () => {
    const warnings: ModelWarning[] = [];
    _valid_range(-1, { min: 0 }, "pa", "derived", "kPa", warnings);
    expect(warnings).toEqual([
      {
        kind: "range",
        key: "pa",
        role: "derived",
        value: -1,
        unit: "kPa",
        bound: { min: 0 },
      },
    ]);
    expect(Object.isFrozen(warnings[0])).toBe(true);
  });

  test("a missing side is unbounded, and the bounds are inclusive", () => {
    const warnings: ModelWarning[] = [];
    const valid = { min: 27 };
    expect(_valid_range(27, valid, "tdb", "input", "°C", warnings)).toBe(27);
    expect(_valid_range(1e300, valid, "tdb", "input", "°C", warnings)).toBe(
      1e300,
    );
    expect(warnings).toHaveLength(0);
    expect(
      _valid_range(26.999, valid, "tdb", "input", "°C", warnings),
    ).toBeNaN();
    expect(warnings).toHaveLength(1);
  });

  test("the row's bound is the object passed, not a copy", () => {
    const warnings: ModelWarning[] = [];
    const valid = Object.freeze({ max: 5 });
    _valid_range(6, valid, "pa (kPa)", "derived", "kPa", warnings);
    const [row] = warnings;
    expect(row?.kind === "range" && row.bound).toBe(valid);
  });
});

describe("_mapping (JS-only)", () => {
  // The example in _mapping's TSDoc. Upstream's docstring prints
  // ['low', 'medium', 'high'] (_internal/validation.py:206-207); pythermalcomfort
  // 4.6.2 returns ['medium', 'medium', 'high'] in the parity image.
  test("the TSDoc example gives what upstream returns", () => {
    const bins = {
      edges: [15, 25, 35],
      labels: ["low", "medium", "high"],
      right: true,
    };
    expect([20, 25, 30].map((t) => _mapping(t, bins))).toEqual([
      "medium",
      "medium",
      "high",
    ]);
  });
});

// Upstream's dict (_internal/validation.py:172), its keys as edges and its
// values as labels.
describe("HEAT_INDEX_STRESS_CATEGORIES", () => {
  test("holds upstream's thresholds and categories, frozen", () => {
    expect(HEAT_INDEX_STRESS_CATEGORIES).toEqual({
      edges: [32.0, 41.0, 54.0, 1000.0],
      labels: ["caution", "extreme caution", "danger", "extreme danger"],
    });
    expect(Object.isFrozen(HEAT_INDEX_STRESS_CATEGORIES)).toBe(true);
    expect(Object.isFrozen(HEAT_INDEX_STRESS_CATEGORIES.edges)).toBe(true);
    expect(Object.isFrozen(HEAT_INDEX_STRESS_CATEGORIES.labels)).toBe(true);
  });
});
