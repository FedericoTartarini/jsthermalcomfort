import { describe, expect, test } from "@jest/globals";
import {
  heat_index_rothfusz,
  HEAT_INDEX_ROTHFUSZ_INFO,
  HEAT_INDEX_ROTHFUSZ_LIMITS,
} from "../../src/models/heat_index_rothfusz.ts";
import type { HeatIndexRothfuszParams } from "../../src/models/heat_index_rothfusz.ts";
import { heat_index_rothfusz as heat_index_rothfusz_from_models } from "../../src/models/index.js";
import { heat_index_rothfusz as heat_index_rothfusz_from_root } from "../../src/index.js";
import { testDataUrls } from "./comftest.ts";
import { loadTestData, validateResult } from "./testUtils.ts";

let { testData, tolerances } = await loadTestData(testDataUrls.heatIndex);

// Mirrors pythermalcomfort v4.6.0 tests/test_heat_index_rothfusz.py.
describe("test_heat_index_rothfusz", () => {
  test.each(testData.data)("test_heat_index: fixture case %#", (row) => {
    const { inputs, outputs } = row;
    // As upstream, `heat_index_rothfusz(**inputs, limit_inputs=False)`, so
    // the fixture validates the regression independently of the gate.
    const result = heat_index_rothfusz({
      ...inputs,
      limit_inputs: false,
    } as unknown as HeatIndexRothfuszParams);

    validateResult(result, outputs, tolerances, inputs);
  });

  test("test_single_input_caution", () => {
    // Upstream also asserts a zero-dim ndarray; a JS scalar has no shape.
    const result = heat_index_rothfusz({ tdb: 29, rh: 50, round_output: true });
    expect(Math.abs(result.hi - 29.7)).toBeLessThanOrEqual(29.7 * 1e-3);
    expect(result.stress_category).toBe("caution");
  });

  // Upstream's `pytest.warns(UserWarning)` becomes the `tdb` row.
  test("test_below_threshold_produces_nan", () => {
    const result = heat_index_rothfusz({ tdb: 25, rh: 80 });
    expect(result.warnings.map((w) => w.key)).toEqual(["tdb"]);
    expect(result.hi).toBeNaN();
    expect(result.stress_category).toBeNaN();
  });

  // Upstream matches the UserWarning's text ('tdb', 25.0, [27.0, inf]); the
  // row carries the same key, value and bound.
  test("test_below_threshold_warns_scalar", () => {
    expect(heat_index_rothfusz({ tdb: 25, rh: 80 }).warnings).toEqual([
      {
        key: "tdb",
        role: "input",
        value: 25,
        bound: HEAT_INDEX_ROTHFUSZ_LIMITS.tdb,
      },
    ]);
  });

  // Upstream's arrays, element-wise: the UserWarning's value 20.0 at index 1
  // becomes a row on that element alone.
  test("test_below_threshold_warns_array", () => {
    const tdb = [30.0, 20.0, 28.5];
    const rh = [70.0, 90.0, 50.0];
    const results = tdb.map((t, i) =>
      heat_index_rothfusz({ tdb: t, rh: rh[i] }),
    );
    const hi = results.map((result) => result.hi);
    expect(results.map((result) => result.warnings)).toEqual([
      [],
      [
        {
          key: "tdb",
          role: "input",
          value: 20,
          bound: HEAT_INDEX_ROTHFUSZ_LIMITS.tdb,
        },
      ],
      [],
    ]);
    expect(hi[1]).toBeNaN();
    expect(Number.isFinite(hi[0]) && Number.isFinite(hi[2])).toBe(true);
  });

  // Upstream also asserts no warning was recorded: it checks only under
  // limit_inputs. That assertion does not port, because the rows here are
  // built whatever limit_inputs is, so this call has its `tdb` row.
  test("test_limit_inputs_false_no_warning", () => {
    const result = heat_index_rothfusz({
      tdb: 25,
      rh: 80,
      limit_inputs: false,
    });
    expect(result.warnings.map((w) => w.key)).toEqual(["tdb"]);
    expect(Number.isFinite(result.hi)).toBe(true);
  });

  // Upstream's vectors, element-wise; its `pytest.warns(UserWarning)` becomes
  // the row on the element below 27 °C.
  test("test_vector_input_no_rounding", () => {
    const tdb = [30.0, 20.0, 28.5];
    const rh = [70.0, 90.0, 50.0];
    const results = tdb.map((t, i) =>
      heat_index_rothfusz({ tdb: t, rh: rh[i], round_output: false }),
    );
    const hi = results.map((result) => result.hi);
    expect(results.map((result) => result.warnings.length)).toEqual([0, 1, 0]);
    // First element has multiple decimals and matches expected formula
    expect(Math.abs(hi[0] - 35.33)).toBeLessThanOrEqual(35.33 * 1e-2);
    // Second element below threshold ⇒ NaN
    expect(hi[1]).toBeNaN();
    // Third element above threshold ⇒ finite number
    expect(Number.isFinite(hi[2])).toBe(true);
    expect(results[0].stress_category).toBe("extreme caution");
  });

  // Upstream's parametrize has no ids; `id` is the one pytest generates, which
  // Jest's %s would print as 27 rather than 27.0.
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
      expect(results[3].hi).toBeNaN();
      expect(results[3].stress_category).toBeNaN();
    },
  );
});

describe("heat_index_rothfusz (JS-only)", () => {
  const hot = { tdb: 30, rh: 80 };

  describe("input validation", () => {
    const quantities = ["tdb", "rh"] as const;

    // A numeric string is not coerced, unlike in arithmetic.
    test.each(quantities)("throws TypeError if %s is not a number", (key) => {
      // Cast: deliberately passing a string to test the runtime TypeError.
      const params = {
        ...hot,
        [key]: "25",
      } as unknown as HeatIndexRothfuszParams;
      expect(() => heat_index_rothfusz(params)).toThrow(TypeError);
    });

    // A missing quantity is a TypeError, as a missing keyword argument is in
    // Python.
    test.each(quantities)("throws TypeError if %s is missing", (key) => {
      const params: Partial<HeatIndexRothfuszParams> = { ...hot };
      delete params[key];
      // @ts-expect-error deliberately omitting a quantity to test the runtime TypeError
      expect(() => heat_index_rothfusz(params)).toThrow(TypeError);
    });

    // ADR 0001: a non-finite number throws rather than propagating as NaN.
    test.each(quantities)("throws TypeError if %s is not finite", (key) => {
      for (const bad of [NaN, Infinity, -Infinity]) {
        expect(() => heat_index_rothfusz({ ...hot, [key]: bad })).toThrow(
          TypeError,
        );
      }
    });

    // tdb and rh were positional before v2 (ADR 0002). A call still written
    // that way throws rather than running on anything else.
    test("throws TypeError if called positionally", () => {
      // @ts-expect-error the model takes one params object
      expect(() => heat_index_rothfusz(30, 80)).toThrow(TypeError);
      expect(() =>
        // @ts-expect-error the model takes one params object
        heat_index_rothfusz(30, 80, { round: false, units: "IP" }),
      ).toThrow(TypeError);
      // @ts-expect-error null is not a params object
      expect(() => heat_index_rothfusz(null)).toThrow(TypeError);
      // @ts-expect-error the params object is required
      expect(() => heat_index_rothfusz()).toThrow(TypeError);
    });

    test.each(["round_output", "limit_inputs"] as const)(
      "throws TypeError if %s is not a boolean",
      (key) => {
        // Cast: deliberately passing a string to test the runtime TypeError.
        const params = {
          ...hot,
          [key]: "true",
        } as unknown as HeatIndexRothfuszParams;
        expect(() => heat_index_rothfusz(params)).toThrow(TypeError);
      },
    );

    test("a switch passed as undefined takes its default", () => {
      expect(
        heat_index_rothfusz({
          tdb: 25,
          rh: 50,
          round_output: undefined,
          limit_inputs: undefined,
        }).hi,
      ).toBeNaN();
      expect(heat_index_rothfusz({ ...hot, round_output: undefined }).hi).toBe(
        37.7,
      );
    });
  });

  describe("applicability gate", () => {
    test.each([
      ["tdb just below 27", 26.9, 50],
      ["tdb well below 27", 20, 50],
      ["tdb at 0", 0, 50],
    ])("returns NaN under default limit_inputs when %s", (_, tdb, rh) => {
      expect(heat_index_rothfusz({ tdb, rh }).hi).toBeNaN();
    });

    test.each([
      ["tdb at 27", 27, 50],
      ["tdb above 27", 35, 80],
    ])(
      "returns a finite hi under default limit_inputs when %s",
      (_, tdb, rh) => {
        expect(Number.isFinite(heat_index_rothfusz({ tdb, rh }).hi)).toBe(true);
      },
    );
  });

  describe("stress_category", () => {
    test("returns NaN stress_category when below applicability threshold", () => {
      const result = heat_index_rothfusz({
        tdb: 25,
        rh: 50,
        limit_inputs: true,
      });
      expect(result.stress_category).toBeNaN();
    });

    const validCategories = [
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
      expect(validCategories).toContain(result.stress_category);
    });

    // heat_index_rothfusz(30, 91) rounds onto the 41 bin edge: rounded
    // hi = 41.0, unrounded 41.0476. Classifying the rounded value would give
    // "extreme caution" (32 < 41 <= 41); the unrounded one gives "danger".
    test("stress_category is same whether round_output is true or false", () => {
      const rounded = heat_index_rothfusz({
        tdb: 30,
        rh: 91,
        round_output: true,
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

  describe("warnings rows", () => {
    const { tdb: bound } = HEAT_INDEX_ROTHFUSZ_LIMITS;

    test("no row at the bound, one row one step below it", () => {
      expect(heat_index_rothfusz({ tdb: 27, rh: 50 }).warnings).toEqual([]);
      const { warnings } = heat_index_rothfusz({ tdb: 26.9, rh: 50 });
      expect(warnings).toEqual([
        { key: "tdb", role: "input", value: 26.9, bound },
      ]);
      // `toBe`: the row carries the object HEAT_INDEX_ROTHFUSZ_INFO references.
      expect(warnings[0].bound).toBe(
        HEAT_INDEX_ROTHFUSZ_INFO.inputs.tdb.applicability,
      );
    });

    // The bound has no max, as upstream's (27.0, np.inf).
    test("no row however far above the bound", () => {
      expect(heat_index_rothfusz({ tdb: 1e6, rh: 50 }).warnings).toEqual([]);
    });

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

    test("a NaN under the gate never comes without a row", () => {
      for (const tdb of [-40, 0, 20, 26.99, 27, 30, 45, 60])
        for (const rh of [0, 50, 100]) {
          const { hi, warnings } = heat_index_rothfusz({ tdb, rh });
          expect({ tdb, rh, gated: warnings.length > 0 }).toEqual({
            tdb,
            rh,
            gated: Number.isNaN(hi),
          });
        }
    });
  });

  describe("exports", () => {
    test("heat_index_rothfusz is exported from models/index.js", () => {
      expect(heat_index_rothfusz_from_models).toBe(heat_index_rothfusz);
    });

    test("heat_index_rothfusz is exported from package root (src/index.js)", () => {
      expect(heat_index_rothfusz_from_root).toBe(heat_index_rothfusz);
    });
  });

  describe("applicability threshold", () => {
    test("the gate is inclusive at 27 degC and excludes just below", () => {
      expect(heat_index_rothfusz({ tdb: 26.99, rh: 50 }).hi).toBeNaN();
      expect(heat_index_rothfusz({ tdb: 27, rh: 50 }).hi).toBe(27.4);
    });

    test("the metadata references the limits object rather than copying it", () => {
      // `toBe`, not `toEqual`: a rebuilt { min: 27 } literal would satisfy
      // equality and then be free to drift from what the runtime enforces.
      expect(HEAT_INDEX_ROTHFUSZ_INFO.inputs.tdb.applicability).toBe(
        HEAT_INDEX_ROTHFUSZ_LIMITS.tdb,
      );
      expect(HEAT_INDEX_ROTHFUSZ_LIMITS.tdb).toEqual({ min: 27 });
      expect(Object.isFrozen(HEAT_INDEX_ROTHFUSZ_LIMITS)).toBe(true);
      expect(Object.isFrozen(HEAT_INDEX_ROTHFUSZ_LIMITS.tdb)).toBe(true);
    });
  });
});
