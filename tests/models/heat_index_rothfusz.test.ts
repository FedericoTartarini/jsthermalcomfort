import { describe, expect, test } from "vitest";
import {
  heat_index_rothfusz,
  HEAT_INDEX_ROTHFUSZ_INFO,
} from "../../src/models/index.ts";
import { heat_index_rothfusz as heat_index_rothfusz_from_root } from "../../src/index.ts";
import { HEAT_INDEX_RISK_CATEGORIES } from "../../src/_internal/validation.ts";
import { test_data_urls } from "./comftest.ts";
import { describeModelContract } from "./modelContract.ts";
import { approx, loadTestData, validateResult } from "./testUtils.ts";

type Inputs = Parameters<typeof heat_index_rothfusz>[0];

const { testData: test_data, tolerances } = await loadTestData(
  test_data_urls.heatIndex,
);

// upstream's (27.0, np.inf), which _valid_range's message prints as [27.0, inf]
const TDB_BOUND = { min: 27 };

// Mirrors pythermalcomfort v4.8.0 tests/test_heat_index_rothfusz.py. A
// UserWarning becomes a range row, and a `match=` on its text becomes
// assertions on the row's key, value and bound.
describe("test_heat_index_rothfusz", () => {
  test.each(test_data.data)("test_heat_index: fixture case %#", (row) => {
    const { inputs, outputs } = row;
    // As upstream, `heat_index_rothfusz(**inputs, limit_inputs=False)`, so
    // the fixture validates the regression independently of the gate.
    const result = heat_index_rothfusz({
      ...inputs,
      limit_inputs: false,
    } as unknown as Inputs);

    validateResult(result, outputs, tolerances, inputs);
  });

  test("test_single_input_caution", () => {
    // Upstream also asserts a zero-dim ndarray; a JS scalar has no shape.
    const result = heat_index_rothfusz({ tdb: 29, rh: 50, round_output: true });
    expect(approx(result.hi, 29.7, { rel: 1e-3, abs: 0 })).toBe(true);
    expect(result.stress_category).toBe("caution");
  });

  test("test_below_threshold_produces_nan", () => {
    const result = heat_index_rothfusz({ tdb: 25, rh: 80 });
    expect(result.warnings).toEqual([expect.objectContaining({ key: "tdb" })]);
    expect(result.hi).toBe(null);
    expect(result.stress_category).toBe(null);
  });

  // Upstream matches r"'tdb' has value 25\.0.*\[27\.0, inf\]".
  test("test_below_threshold_warns_scalar", () => {
    expect(heat_index_rothfusz({ tdb: 25, rh: 80 }).warnings).toEqual([
      expect.objectContaining({ key: "tdb", value: 25, bound: TDB_BOUND }),
    ]);
  });

  // Upstream's arrays, element-wise: its match r"'tdb'.*\[20\.0\].*\[1\]"
  // becomes a row on element 1 alone.
  test("test_below_threshold_warns_array", () => {
    const first = heat_index_rothfusz({ tdb: 30.0, rh: 70.0 });
    const second = heat_index_rothfusz({ tdb: 20.0, rh: 90.0 });
    const third = heat_index_rothfusz({ tdb: 28.5, rh: 50.0 });
    expect([first, second, third].map((result) => result.warnings)).toEqual([
      [],
      [expect.objectContaining({ key: "tdb", value: 20, bound: TDB_BOUND })],
      [],
    ]);
    expect(second.hi).toBe(null);
    expect(Number.isFinite(first.hi) && Number.isFinite(third.hi)).toBe(true);
  });

  // Upstream asserts that no warning was recorded, since it checks only under
  // limit_inputs. The library returns the range rows whatever limit_inputs is,
  // so this call has its tdb row beside a finite hi.
  test("test_limit_inputs_false_no_warning", () => {
    const result = heat_index_rothfusz({
      tdb: 25,
      rh: 80,
      limit_inputs: false,
    });
    expect(result.warnings).toEqual([
      expect.objectContaining({ key: "tdb", value: 25, bound: TDB_BOUND }),
    ]);
    expect(Number.isFinite(result.hi)).toBe(true);
  });

  // Upstream's vectors, element-wise; its `pytest.warns(UserWarning)` becomes
  // the row on the element below 27 °C.
  test("test_vector_input_no_rounding", () => {
    const first = heat_index_rothfusz({
      tdb: 30.0,
      rh: 70.0,
      round_output: false,
    });
    const second = heat_index_rothfusz({
      tdb: 20.0,
      rh: 90.0,
      round_output: false,
    });
    const third = heat_index_rothfusz({
      tdb: 28.5,
      rh: 50.0,
      round_output: false,
    });
    expect(
      [first, second, third].map((result) => result.warnings.length),
    ).toEqual([0, 1, 0]);
    // First element has multiple decimals and matches expected formula
    expect(approx(first.hi, 35.33, { rel: 1e-2, abs: 0 })).toBe(true);
    // Second element below threshold ⇒ null
    expect(second.hi).toBe(null);
    // Third element above threshold ⇒ finite number
    expect(Number.isFinite(third.hi)).toBe(true);
    expect(first.stress_category).toBe("extreme caution");
  });

  // Upstream's parametrize has no ids; `id` is the one pytest generates, which
  // Vitest's %s would print as 27 rather than 27.0.
  test.each([
    {
      id: "26.583615-27.0-caution",
      tdb: 26.583615,
      boundary: 27.0,
      category: "caution",
    },
    {
      id: "30.645013-32.0-extreme caution",
      tdb: 30.645013,
      boundary: 32.0,
      category: "extreme caution",
    },
    {
      id: "35.152822-41.0-danger",
      tdb: 35.152822,
      boundary: 41.0,
      category: "danger",
    },
    {
      id: "39.775673-54.0-extreme danger",
      tdb: 39.775673,
      boundary: 54.0,
      category: "extreme danger",
    },
  ])(
    "test_category_uses_unrounded_heat_index[$id]",
    ({ tdb, boundary, category }) => {
      const rounded = heat_index_rothfusz({ tdb, rh: 50, limit_inputs: false });
      const unrounded = heat_index_rothfusz({
        tdb,
        rh: 50,
        round_output: false,
        limit_inputs: false,
      });

      expect(unrounded.hi).toBeGreaterThan(boundary);
      expect(unrounded.hi).toBeLessThan(boundary + 0.05);
      expect(rounded.hi).toBe(boundary);
      expect(rounded.stress_category).toBe(category);
      expect(unrounded.stress_category).toBe(category);
    },
  );

  // Upstream broadcasts rh = 50 over the tdb array; element-wise here, and
  // its `pytest.warns(UserWarning)` becomes the row on the last element.
  test.each([
    { id: "True", round_output: true },
    { id: "False", round_output: false },
  ])(
    "test_category_rounding_with_broadcast_and_invalid_input[$id]",
    ({ round_output }) => {
      const results = [30.645013, 35.152822, 39.775673, 25].map((tdb) =>
        heat_index_rothfusz({ tdb, rh: 50, round_output }),
      );

      expect(
        results.slice(0, 3).map((result) => result.stress_category),
      ).toEqual(["extreme caution", "danger", "extreme danger"]);
      expect(results.map((result) => result.warnings.length)).toEqual([
        0, 0, 0, 1,
      ]);
      expect(results[3]?.hi).toBe(null);
      expect(results[3]?.stress_category).toBe(null);
    },
  );
});

describeModelContract(
  heat_index_rothfusz,
  HEAT_INDEX_ROTHFUSZ_INFO,
  { tdb: 30, rh: 80 },
  { tdb: 25, rh: 80 },
);

// The per-model checks of the template (ADRs 0022-0024), through the public
// entry: what upstream's tests leave out, and what only the library adds.
describe("heat_index_rothfusz (JS-only)", () => {
  // deviation heat_index_rothfusz-2 (heat_index_rothfusz.py:82, _internal/validation.py:289)
  test("the stress category bins are the shared HEAT_INDEX_RISK_CATEGORIES, not a copy", () => {
    expect(HEAT_INDEX_ROTHFUSZ_INFO.outputs.stress_category.classifier).toBe(
      HEAT_INDEX_RISK_CATEGORIES,
    );
  });

  // deviation _shared-4 (models/heat_index_rothfusz.py:25)
  test("INFO.standards is empty", () => {
    expect(HEAT_INDEX_ROTHFUSZ_INFO.standards).toEqual([]);
  });

  // deviation heat_index_rothfusz-3
  describe("warnings rows", () => {
    const bound = HEAT_INDEX_ROTHFUSZ_INFO.inputs.tdb.applicability;

    test("a row at one step below the bound, none at it", () => {
      expect(heat_index_rothfusz({ tdb: 27, rh: 50 }).warnings).toEqual([]);
      const { warnings } = heat_index_rothfusz({ tdb: 26.9, rh: 50 });
      expect(warnings).toEqual([
        {
          kind: "range",
          key: "tdb",
          role: "input",
          value: 26.9,
          unit: "°C",
          bound: { min: 27 },
        },
      ]);
      // `toBe`: the row carries the object HEAT_INDEX_ROTHFUSZ_INFO references.
      const [row] = warnings;
      expect(row?.kind === "range" && row.bound).toBe(bound);
    });

    // The bound has no max, as upstream's (27.0, np.inf).
    test("no row however far above the bound", () => {
      expect(heat_index_rothfusz({ tdb: 1e6, rh: 50 }).warnings).toEqual([]);
    });

    // deviation heat_index_rothfusz-4
    test("the rows are the same with limit_inputs off, beside a finite hi", () => {
      const on = heat_index_rothfusz({ tdb: 26.9, rh: 50 });
      const off = heat_index_rothfusz({
        tdb: 26.9,
        rh: 50,
        limit_inputs: false,
      });
      expect(Number.isFinite(off.hi)).toBe(true);
      expect(off.warnings).toEqual(on.warnings);
    });

    // Upstream calls warnings.warn only in _valid_range, so no notice row.
    test("a null under the gate never comes without a row, and no notice", () => {
      for (const tdb of [-40, 0, 20, 26.99, 27, 30, 45, 60])
        for (const rh of [0, 50, 100]) {
          const { hi, warnings } = heat_index_rothfusz({ tdb, rh });
          expect({ tdb, rh, gated: warnings.length > 0 }).toEqual({
            tdb,
            rh,
            gated: hi === null,
          });
          expect(warnings.every((row) => row.kind === "range")).toBe(true);
        }
    });
  });

  describe("applicability gate", () => {
    test.each([
      ["tdb just below 27", 26.9, 50],
      ["tdb well below 27", 20, 50],
      ["tdb at 0", 0, 50],
    ])(
      "returns a null hi and a null stress_category under default limit_inputs when %s",
      (_, tdb, rh) => {
        const result = heat_index_rothfusz({ tdb, rh });
        expect(result.hi).toBe(null);
        expect(result.stress_category).toBe(null);
      },
    );

    test("the gate is inclusive at 27 °C", () => {
      expect(heat_index_rothfusz({ tdb: 26.99, rh: 50 }).hi).toBe(null);
      expect(heat_index_rothfusz({ tdb: 27, rh: 50 }).hi).toBe(27.4);
      expect(Number.isFinite(heat_index_rothfusz({ tdb: 35, rh: 80 }).hi)).toBe(
        true,
      );
    });
  });

  describe("stress_category", () => {
    const valid_categories = [
      "no risk",
      "caution",
      "extreme caution",
      "danger",
      "extreme danger",
    ];

    test.each([
      [27, 30],
      [35, 80],
      [50, 80],
      [27, 40],
      [30, 80],
    ])("returns a valid category for tdb=%s, rh=%s", (tdb, rh) => {
      const result = heat_index_rothfusz({ tdb, rh, limit_inputs: false });
      expect(valid_categories).toContain(result.stress_category);
    });

    // heat_index_rothfusz(30, 91) rounds onto the 41 bin edge: rounded
    // hi = 41.0, unrounded 41.0476. Classifying the rounded value would give
    // "extreme caution" (32 < 41 <= 41); the unrounded one gives "danger".
    test("stress_category is same whether round_output is true or false", () => {
      const rounded = heat_index_rothfusz({
        tdb: 30,
        rh: 91,
        limit_inputs: false,
      });
      const unrounded = heat_index_rothfusz({
        tdb: 30,
        rh: 91,
        round_output: false,
        limit_inputs: false,
      });

      expect(rounded.hi).toBe(41);
      expect(unrounded.hi).toBeGreaterThan(41);
      expect(rounded.stress_category).toBe(unrounded.stress_category);
      expect(rounded.stress_category).toBe("danger");
    });
  });

  test("is exported from the package root as from its subpath", () => {
    expect(heat_index_rothfusz_from_root).toBe(heat_index_rothfusz);
  });
});
