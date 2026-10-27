import { describe, expect, test } from "vitest";
import * as models from "../../src/models/index.ts";
import {
  heat_index_rothfusz,
  HEAT_INDEX_ROTHFUSZ_INFO,
} from "../../src/models/index.ts";
import { heat_index_rothfusz as heat_index_rothfusz_from_root } from "../../src/index.ts";
import { testDataUrls } from "./comftest.ts";
import { loadTestData, validateResult } from "./testUtils.ts";

type Inputs = Parameters<typeof heat_index_rothfusz>[0];

const { testData: test_data, tolerances } = await loadTestData(
  testDataUrls.heatIndex,
);

// upstream's (27.0, np.inf), which _valid_range's message prints as [27.0, inf]
const TDB_BOUND = { min: 27 };

// Mirrors pythermalcomfort v4.7.0 tests/test_heat_index_rothfusz.py. A
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
    expect(Math.abs(result.hi - 29.7)).toBeLessThanOrEqual(29.7 * 1e-3);
    expect(result.stress_category).toBe("caution");
  });

  test("test_below_threshold_produces_nan", () => {
    const result = heat_index_rothfusz({ tdb: 25, rh: 80 });
    expect(result.warnings).toEqual([expect.objectContaining({ key: "tdb" })]);
    expect(result.hi).toBeNaN();
    expect(result.stress_category).toBeNaN();
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
    const tdb = [30.0, 20.0, 28.5];
    const rh = [70.0, 90.0, 50.0];
    const results = tdb.map((t, i) =>
      heat_index_rothfusz({ tdb: t, rh: rh[i] ?? NaN }),
    );
    expect(results.map((result) => result.warnings)).toEqual([
      [],
      [expect.objectContaining({ key: "tdb", value: 20, bound: TDB_BOUND })],
      [],
    ]);
    expect(results[1]?.hi).toBeNaN();
    expect(
      Number.isFinite(results[0]?.hi) && Number.isFinite(results[2]?.hi),
    ).toBe(true);
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
    const tdb = [30.0, 20.0, 28.5];
    const rh = [70.0, 90.0, 50.0];
    const results = tdb.map((t, i) =>
      heat_index_rothfusz({ tdb: t, rh: rh[i] ?? NaN, round_output: false }),
    );
    const hi = results.map((result) => result.hi);
    expect(results.map((result) => result.warnings.length)).toEqual([0, 1, 0]);
    // First element has multiple decimals and matches expected formula
    expect(Math.abs((hi[0] ?? NaN) - 35.33)).toBeLessThanOrEqual(35.33 * 1e-2);
    // Second element below threshold ⇒ NaN
    expect(hi[1]).toBeNaN();
    // Third element above threshold ⇒ finite number
    expect(Number.isFinite(hi[2])).toBe(true);
    expect(results[0]?.stress_category).toBe("extreme caution");
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
      expect(results[3]?.hi).toBeNaN();
      expect(results[3]?.stress_category).toBeNaN();
    },
  );
});

// The per-model checks of the template (ADRs 0022-0024), through the public
// entry: what upstream's tests leave out, and what only the library adds.
describe("heat_index_rothfusz (JS-only)", () => {
  const hot = { tdb: 30, rh: 80 };
  // A call with inputs the type rejects, to test the runtime.
  const call = (inputs: unknown) => () => heat_index_rothfusz(inputs as Inputs);

  describe("errors", () => {
    // The library's messages, where upstream's name Python's types or its
    // call binding (deviation _shared-10).
    test.each(["round_output", "limit_inputs"])(
      "%s that is not a boolean throws TypeError",
      (key) => {
        for (const bad of ["true", 1, null])
          expect(call({ ...hot, [key]: bad })).toThrow(
            new TypeError(`${key} must be a boolean.`),
          );
      },
    );

    test("a missing quantity throws TypeError, naming the first", () => {
      expect(call({ tdb: 30 })).toThrow(new TypeError("rh is required."));
      expect(call({ tdb: undefined, rh: undefined })).toThrow(
        new TypeError("tdb is required."),
      );
    });

    test("an unknown key throws TypeError, naming the first", () => {
      for (const key of ["foo", "round", "units"])
        expect(call({ ...hot, [key]: 1 })).toThrow(
          new TypeError(`${key} is not an input of heat_index_rothfusz().`),
        );
      expect(call({ ...hot, foo: 1, bar: 2 })).toThrow(
        new TypeError("foo is not an input of heat_index_rothfusz()."),
      );
    });

    // tdb and rh were positional before v2 (ADR 0002).
    test("anything but an inputs object throws TypeError", () => {
      for (const bad of [30, null, undefined, [30, 80], "tdb"])
        expect(call(bad)).toThrow(
          new TypeError("heat_index_rothfusz() takes one inputs object."),
        );
    });

    // Upstream reads a boolean as a number and broadcasts an array
    // (deviation _shared-5, deviation _shared-6), and its message for another
    // type names Python's types (deviation _shared-10).
    test.each(["tdb", "rh"])(
      "%s that is not a number throws TypeError",
      (key) => {
        for (const bad of ["25", {}, () => 25, 25n, true, false, null, [30]])
          expect(call({ ...hot, [key]: bad })).toThrow(
            new TypeError(`${key} must be a finite number.`),
          );
      },
    );

    // Upstream computes on with NaN and ±Infinity (deviation _shared-7).
    test.each(["tdb", "rh"])(
      "%s that is not finite throws RangeError",
      (key) => {
        for (const bad of [NaN, Infinity, -Infinity])
          expect(call({ ...hot, [key]: bad })).toThrow(
            new RangeError(`${key} must be a finite number.`),
          );
      },
    );

    // Upstream checks limit_inputs, round_output and then the quantities; the
    // library checks in the definition's order (deviation _shared-9).
    test("checks run in the definition's order", () => {
      const bad = { tdb: "x", rh: NaN, round_output: "x", limit_inputs: "x" };
      expect(call(bad)).toThrow(new TypeError("tdb must be a finite number."));
      expect(call({ ...bad, tdb: 30 })).toThrow(
        new RangeError("rh must be a finite number."),
      );
      expect(call({ ...bad, tdb: 30, rh: 50 })).toThrow(
        new TypeError("round_output must be a boolean."),
      );
      expect(call({ rh: "x" })).toThrow(new TypeError("tdb is required."));
      expect(call({ tdb: "x" })).toThrow(
        new TypeError("tdb must be a finite number."),
      );
      // An unknown key fails first, as an unexpected keyword does in Python.
      expect(call({ foo: 1 })).toThrow(
        new TypeError("foo is not an input of heat_index_rothfusz()."),
      );
    });

    test("undefined takes the default, as an omitted keyword does", () => {
      const omitted = heat_index_rothfusz({ tdb: 25, rh: 50 });
      expect(
        heat_index_rothfusz({
          tdb: 25,
          rh: 50,
          round_output: undefined,
          limit_inputs: undefined,
        }),
      ).toEqual(omitted);
      expect(heat_index_rothfusz({ ...hot, round_output: undefined }).hi).toBe(
        37.7,
      );
    });
  });

  describe("result", () => {
    // As upstream's frozen dataclass (classes_return.py:297).
    test("is frozen, its warnings and rows included", () => {
      const result = heat_index_rothfusz({ tdb: 25, rh: 80 });
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.warnings)).toBe(true);
      expect(result.warnings.every((row) => Object.isFrozen(row))).toBe(true);
      expect(() => {
        (result as { hi: number }).hi = 1;
      }).toThrow(TypeError);
    });

    test("has upstream's fields, then warnings", () => {
      expect(Object.keys(heat_index_rothfusz(hot))).toEqual([
        "hi",
        "stress_category",
        "warnings",
      ]);
    });
  });

  // deviation heat_index_rothfusz-2
  describe("HEAT_INDEX_ROTHFUSZ_INFO", () => {
    test("names the model, with no description", () => {
      expect(HEAT_INDEX_ROTHFUSZ_INFO.name).toBe("heat_index_rothfusz");
      expect(HEAT_INDEX_ROTHFUSZ_INFO.label).toBe("Heat Index (Rothfusz)");
      expect(HEAT_INDEX_ROTHFUSZ_INFO.standards).toEqual([]);
      expect(HEAT_INDEX_ROTHFUSZ_INFO).not.toHaveProperty("description");
    });

    // INFO.inputs is the input definition: every keyword argument, in
    // upstream's order, switches included.
    test("lists every keyword argument, with upstream's bound and defaults", () => {
      expect(HEAT_INDEX_ROTHFUSZ_INFO.inputs).toEqual({
        tdb: { kind: "numeric", unit: "°C", applicability: { min: 27 } },
        rh: { kind: "numeric", unit: "%" },
        round_output: { kind: "bool", default: true },
        limit_inputs: { kind: "bool", default: true },
      });
      expect(Object.keys(HEAT_INDEX_ROTHFUSZ_INFO.inputs)).toEqual([
        "tdb",
        "rh",
        "round_output",
        "limit_inputs",
      ]);
    });

    // {27.0: "no risk", **HEAT_INDEX_STRESS_CATEGORIES}
    // (heat_index_rothfusz.py:83, _internal/validation.py:172), and
    // _mapping's right=True.
    test("the stress category bins are upstream's mapping, right-inclusive", () => {
      expect(HEAT_INDEX_ROTHFUSZ_INFO.outputs).toEqual({
        hi: { unit: "°C" },
        stress_category: {
          unit: null,
          classifier: {
            edges: [27, 32, 41, 54, 1000],
            labels: [
              "no risk",
              "caution",
              "extreme caution",
              "danger",
              "extreme danger",
            ],
            right: true,
          },
        },
      });
    });

    test("the bins are reached through INFO only", () => {
      expect(models).not.toHaveProperty("HEAT_INDEX_STRESS_CATEGORY_BINS");
      expect(models).not.toHaveProperty("HEAT_INDEX_STRESS_CATEGORIES");
    });

    test("is frozen deeply", () => {
      const { inputs, outputs } = HEAT_INDEX_ROTHFUSZ_INFO;
      expect(Object.isFrozen(HEAT_INDEX_ROTHFUSZ_INFO)).toBe(true);
      expect(Object.isFrozen(inputs)).toBe(true);
      expect(Object.isFrozen(inputs.tdb)).toBe(true);
      expect(Object.isFrozen(inputs.tdb.applicability)).toBe(true);
      expect(Object.isFrozen(inputs.limit_inputs)).toBe(true);
      expect(Object.isFrozen(outputs.stress_category.classifier.edges)).toBe(
        true,
      );
    });
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
    test("a NaN under the gate never comes without a row, and no notice", () => {
      for (const tdb of [-40, 0, 20, 26.99, 27, 30, 45, 60])
        for (const rh of [0, 50, 100]) {
          const { hi, warnings } = heat_index_rothfusz({ tdb, rh });
          expect({ tdb, rh, gated: warnings.length > 0 }).toEqual({
            tdb,
            rh,
            gated: Number.isNaN(hi),
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
    ])("returns NaN under default limit_inputs when %s", (_, tdb, rh) => {
      const result = heat_index_rothfusz({ tdb, rh });
      expect(result.hi).toBeNaN();
      expect(result.stress_category).toBeNaN();
    });

    test("the gate is inclusive at 27 °C", () => {
      expect(heat_index_rothfusz({ tdb: 26.99, rh: 50 }).hi).toBeNaN();
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
