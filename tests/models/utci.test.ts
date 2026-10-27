import { describe, expect, test } from "vitest";
import * as models from "../../src/models/index.ts";
import {
  classifyFromBins,
  CLO_TOUT_INFO,
  utci,
  UTCI_INFO,
} from "../../src/models/index.ts";
import { _utci_optimized } from "../../src/models/utci.ts";
import { Units } from "../../src/utilities/index.ts";
import { utci as utci_from_root } from "../../src/index.ts";
import { p_sat } from "../../src/psychrometrics/index.ts";
import { round } from "../../src/_internal/round.ts";
import { testDataUrls } from "./comftest.ts";
import { loadTestData, validateResult } from "./testUtils.ts";

type Inputs = Parameters<typeof utci>[0];

const { testData: reference_table, tolerances: tolerance } = await loadTestData(
  testDataUrls.utci,
);

// Mirrors pythermalcomfort v4.7.0 tests/test_utci.py. A UserWarning becomes a
// range row, and a `match=` on its text becomes an assertion on the row's key.
// Upstream's arrays are called element-wise.
describe("test_utci", () => {
  test.each(reference_table.data)("test_utci: fixture case %#", (entry) => {
    const { inputs, outputs } = entry;
    // As upstream, `utci(**inputs)`: the fixture writes `units` in lowercase,
    // which the model accepts as upstream does.
    const result = utci(inputs as unknown as Inputs);

    validateResult(result, outputs, tolerance, inputs);
  });

  // The kernel through its own file (S2), as upstream imports it.
  test("test_utci_optimized", () => {
    expect(
      [25, 27].map((tdb) => round(_utci_optimized(tdb, 1, 1, 1.5), 2)),
    ).toEqual([24.73, 26.57]);
  });

  // Upstream's two stacked parametrize marks; `id` is the one pytest
  // generates.
  test.each([
    { id: "SI-40-80", tdb: 40, rh: 80, units: "SI" },
    { id: "SI-50-100", tdb: 50, rh: 100, units: "SI" },
    { id: "IP-40-80", tdb: 40, rh: 80, units: "IP" },
    { id: "IP-50-100", tdb: 50, rh: 100, units: "IP" },
  ] as const)(
    "test_utci_rejects_excess_vapour_pressure[$id]",
    ({ tdb, rh, units }) => {
      const temperature = units === "SI" ? tdb : tdb * 1.8 + 32;
      const wind = units === "SI" ? 1 : 3.281;
      const result = utci({
        tdb: temperature,
        tr: temperature,
        v: wind,
        rh,
        units,
      });
      expect(result.warnings).toContainEqual(
        expect.objectContaining({ key: "pa (kPa)" }),
      );
      expect(result.utci).toBeNaN();
      expect(result.stress_category).toBeNaN();
    },
  );

  test.each([-1, 101])(
    "test_utci_rejects_relative_humidity_outside_physical_range[%s]",
    (rh) => {
      const result = utci({ tdb: 25, tr: 25, v: 1, rh });
      expect(result.warnings).toContainEqual(
        expect.objectContaining({ key: "rh" }),
      );
      expect(result.utci).toBeNaN();
      expect(result.stress_category).toBeNaN();
    },
  );

  test.each([0, 100])(
    "test_utci_accepts_relative_humidity_endpoints[%s]",
    (rh) => {
      const limited = utci({ tdb: 25, tr: 25, v: 1, rh, round_output: false });
      const unlimited = utci({
        tdb: 25,
        tr: 25,
        v: 1,
        rh,
        limit_inputs: false,
        round_output: false,
      });
      expect(Number.isFinite(limited.utci)).toBe(true);
      expect(limited.utci).toBe(unlimited.utci);
      expect(limited.stress_category).toBe(unlimited.stress_category);
    },
  );

  // Upstream's `pytest.warns(UserWarning, match="pa")` becomes the row on the
  // element above the limit.
  test("test_utci_vapour_pressure_limit_is_inclusive", () => {
    // Hardy's equation at 40 C: this RH gives exactly 5.0 kPa in float64.
    const rh_at_limit = 67.70206528209202;
    const rh = [rh_at_limit - 1e-10, rh_at_limit, rh_at_limit + 1e-10];
    const limited = rh.map((value) =>
      utci({ tdb: 40, tr: 40, v: 1, rh: value, round_output: false }),
    );
    const unlimited = rh.map((value) =>
      utci({
        tdb: 40,
        tr: 40,
        v: 1,
        rh: value,
        limit_inputs: false,
        round_output: false,
      }),
    );
    expect(limited.map((result) => result.warnings)).toEqual([
      [],
      [],
      [expect.objectContaining({ key: "pa (kPa)" })],
    ]);
    expect(limited.map((result) => Number.isNaN(result.utci))).toEqual([
      false,
      false,
      true,
    ]);
    expect(limited.slice(0, 2).map((result) => result.utci)).toEqual(
      unlimited.slice(0, 2).map((result) => result.utci),
    );
    expect(limited.slice(0, 2).map((result) => result.stress_category)).toEqual(
      unlimited.slice(0, 2).map((result) => result.stress_category),
    );
    expect(limited[2]?.stress_category).toBeNaN();
  });

  // Upstream broadcasts a 2×1 temperature over three rh values; element-wise
  // here, and its `pytest.warns(UserWarning)` becomes the rows on the invalid
  // elements.
  test.each(["SI", "IP"] as const)(
    "test_utci_humidity_guard_broadcasts_without_masking_valid_neighbors[%s]",
    (units) => {
      let temperature = [25.0, 50.0];
      if (units === "IP") {
        temperature = temperature.map((t) => t * 1.8 + 32);
      }
      const wind = units === "SI" ? 1 : 3.281;
      const grid = (limit_inputs: boolean) =>
        temperature.map((t) =>
          [0, 50, 101].map((rh) =>
            utci({ tdb: t, tr: t, v: wind, rh, units, limit_inputs }),
          ),
        );
      const limited = grid(true);
      const unlimited = grid(false);
      const invalid = [
        [false, false, true],
        [false, true, true],
      ];
      expect(
        limited.map((row) => row.map((result) => Number.isNaN(result.utci))),
      ).toEqual(invalid);
      expect(
        limited.map((row) => row.map((result) => result.warnings.length > 0)),
      ).toEqual(invalid);
      limited.forEach((row, i) => {
        row.forEach((result, j) => {
          if (invalid[i]?.[j] === true) {
            expect(result.stress_category).toBeNaN();
          } else {
            expect(result.utci).toBe(unlimited[i]?.[j]?.utci);
            expect(result.stress_category).toBe(
              unlimited[i]?.[j]?.stress_category,
            );
          }
        });
      });
    },
  );

  test("test_utci_explicit_extrapolation_preserves_original_polynomial", () => {
    const result = utci({
      tdb: 50,
      tr: 50,
      v: 1,
      rh: 100,
      limit_inputs: false,
      round_output: false,
    });
    // pytest.approx's default relative tolerance, 1e-6.
    expect(Math.abs(result.utci - -326.0792322091629)).toBeLessThanOrEqual(
      326.0792322091629 * 1e-6,
    );
    expect(result.stress_category).toBe("extreme cold stress");
  });

  // Upstream's rh = [50, np.nan], element-wise: a NaN rh throws here, where
  // upstream propagates it (deviation _shared-7), and its valid neighbour
  // keeps its value.
  test("test_utci_nan_humidity_propagates_without_masking_valid_neighbors", () => {
    const result = utci({ tdb: 25, tr: 25, v: 1, rh: 50 });
    expect(result.utci).toBe(24.6);
    expect(result.stress_category).toBe("no thermal stress");
    expect(() => utci({ tdb: 25, tr: 25, v: 1, rh: NaN })).toThrow();
  });

  test("test_utci_ip_uses_si_thresholds_for_stress_category", () => {
    const result = utci({ tdb: 77, tr: 77, v: 3.28084, rh: 50, units: "IP" });

    expect(result.utci).toBe(76.3);
    expect(result.stress_category).toBe("no thermal stress");
  });

  test("test_utci_ip_vector_stress_category", () => {
    const results = [77, 104].map((t) =>
      utci({ tdb: t, tr: t, v: 3.28084, rh: 50, units: "IP" }),
    );

    // np.testing.assert_allclose's default rtol, 1e-7.
    [76.3, 110.5].forEach((expected, i) => {
      expect(
        Math.abs((results[i]?.utci ?? NaN) - expected),
      ).toBeLessThanOrEqual(expected * 1e-7);
    });
    expect(results.map((result) => result.stress_category)).toEqual([
      "no thermal stress",
      "very strong heat stress",
    ]);
  });

  test("test_utci_stress_category_uses_rounded_si_value_by_default", () => {
    const rounded = utci({ tdb: 26.27, tr: 26.27, v: 1, rh: 50 });
    const unrounded = utci({
      tdb: 26.27,
      tr: 26.27,
      v: 1,
      rh: 50,
      round_output: false,
    });

    expect(rounded.utci).toBe(26.0);
    expect(rounded.stress_category).toBe("no thermal stress");
    expect(unrounded.utci).toBeGreaterThan(26.0);
    expect(unrounded.stress_category).toBe("moderate heat stress");
  });

  test("test_utci_ip_stress_category_uses_unrounded_si_value_when_not_rounding", () => {
    const result = utci({
      tdb: 79.286,
      tr: 79.286,
      v: 3.28084,
      rh: 50,
      units: "IP",
      round_output: false,
    });

    expect(result.utci).toBeGreaterThan(78.8);
    expect(result.stress_category).toBe("moderate heat stress");
  });

  test("test_utci_ip_out_of_range_stress_category_is_nan", () => {
    const result = utci({
      tdb: 1000,
      tr: 1000,
      v: 3.28084,
      rh: 50,
      units: "IP",
    });

    expect(result.utci).toBeNaN();
    expect(result.stress_category).toBeNaN();

    const vector_result = [77, 1000].map((t) =>
      utci({ tdb: t, tr: t, v: 3.28084, rh: 50, units: "IP" }),
    );

    expect(
      Math.abs((vector_result[0]?.utci ?? NaN) - 76.3),
    ).toBeLessThanOrEqual(76.3 * 1e-7);
    expect(vector_result[1]?.utci).toBeNaN();
    expect(vector_result[0]?.stress_category).toBe("no thermal stress");
    expect(vector_result[1]?.stress_category).toBeNaN();
  });

  test("test_utci_saturation_vapour_pressure_matches_p_sat", () => {
    const tdb = 40;
    const tr = 40;
    const v = 1;
    const rh = 80;
    const pa = (p_sat(tdb) * (rh / 100)) / 1000;
    const expected = _utci_optimized(tdb, v, tr - tdb, pa);
    // This pressure-formula regression intentionally evaluates beyond 5 kPa.
    const actual = utci({
      tdb,
      tr,
      v,
      rh,
      limit_inputs: false,
      round_output: false,
    }).utci;
    expect(Math.abs(actual - expected)).toBeLessThanOrEqual(0.1);
  });
});

// The per-model checks of the template (ADRs 0022-0024), through the public
// entry: what upstream's tests leave out, measured on pythermalcomfort 4.7.0,
// and what only the library adds.
describe("utci (JS-only)", () => {
  const mild = { tdb: 25, tr: 25, v: 1, rh: 50 };
  // A call with inputs the type rejects, to test the runtime.
  const call = (inputs: unknown) => () => utci(inputs as Inputs);

  describe("values", () => {
    // Upstream #372: with log1p in place of log the value was 61.3. Its pa,
    // 5.9 kPa, is above the 5 kPa limit, so the gate is off.
    test("40 °C at 80 % RH gives upstream's 60.6", () => {
      expect(
        utci({ tdb: 40, tr: 40, v: 1, rh: 80, limit_inputs: false }),
      ).toMatchObject({ utci: 60.6, stress_category: "extreme heat stress" });
    });

    test("takes units in any case, and the constant, as upstream", () => {
      const ip = { tdb: 77, tr: 77, v: 3.28084, rh: 50 };
      expect(utci({ ...ip, units: Units.IP }).utci).toBe(76.3);
      expect(call({ ...ip, units: "ip" })()).toEqual(
        utci({ ...ip, units: "IP" }),
      );
      expect(call({ ...mild, units: "si" })()).toEqual(utci(mild));
    });
  });

  describe("errors", () => {
    // The library's messages, where upstream's name Python's types or its
    // call binding (deviation _shared-10); upstream does not check
    // round_output (deviation _shared-8).
    test.each(["limit_inputs", "round_output"])(
      "%s that is not a boolean throws TypeError",
      (key) => {
        for (const bad of ["true", 1, null])
          expect(call({ ...mild, [key]: bad })).toThrow(
            new TypeError(`${key} must be a boolean.`),
          );
      },
    );

    test("a missing quantity throws TypeError, naming the first", () => {
      expect(call({ tdb: 25, tr: 25, v: 1 })).toThrow(
        new TypeError("rh is required."),
      );
      expect(call({ rh: 50 })).toThrow(new TypeError("tdb is required."));
      expect(call({ ...mild, tr: undefined })).toThrow(
        new TypeError("tr is required."),
      );
    });

    test("an unknown key throws TypeError, naming the first", () => {
      for (const key of ["foo", "return_stress_category", "pa"])
        expect(call({ ...mild, [key]: 1 })).toThrow(
          new TypeError(`${key} is not an input of utci().`),
        );
      expect(call({ ...mild, foo: 1, bar: 2 })).toThrow(
        new TypeError("foo is not an input of utci()."),
      );
    });

    // Every argument was positional before v2 (ADR 0002).
    test("anything but an inputs object throws TypeError", () => {
      for (const bad of [25, null, undefined, [25, 25, 1, 50], "tdb"])
        expect(call(bad)).toThrow(
          new TypeError("utci() takes one inputs object."),
        );
    });

    // Upstream reads a boolean as a number and broadcasts an array
    // (deviation _shared-5, deviation _shared-6), and its message for another
    // type names Python's types (deviation _shared-10).
    test.each(["tdb", "tr", "v", "rh"])(
      "%s that is not a number throws TypeError",
      (key) => {
        for (const bad of ["25", {}, () => 25, 25n, true, false, null, [25]])
          expect(call({ ...mild, [key]: bad })).toThrow(
            new TypeError(`${key} must be a finite number.`),
          );
      },
    );

    // Upstream computes on with NaN and ±Infinity (deviation _shared-7).
    test.each(["tdb", "tr", "v", "rh"])(
      "%s that is not finite throws RangeError",
      (key) => {
        for (const bad of [NaN, Infinity, -Infinity])
          expect(call({ ...mild, [key]: bad })).toThrow(
            new RangeError(`${key} must be a finite number.`),
          );
      },
    );

    // BaseInputs' message (classes_input.py:120), for a string outside the
    // set and, as upstream compares str(units), any other value (deviation
    // _shared-24).
    test("units other than SI or IP throws upstream's message", () => {
      const message = "Units must be either 'SI' or 'IP'";
      for (const bad of ["XX", "", "metric"])
        expect(call({ ...mild, units: bad })).toThrow(new RangeError(message));
      for (const bad of [null, 5, true, ["SI"]])
        expect(call({ ...mild, units: bad })).toThrow(new TypeError(message));
    });

    // Upstream checks units, then limit_inputs, then the quantities; the
    // library checks in the definition's order (deviation _shared-9).
    test("checks run in the definition's order", () => {
      const bad = {
        tdb: "x",
        tr: NaN,
        v: "x",
        rh: "x",
        units: "XX",
        limit_inputs: "x",
        round_output: "x",
      };
      expect(call(bad)).toThrow(new TypeError("tdb must be a finite number."));
      expect(call({ ...bad, tdb: 25 })).toThrow(
        new RangeError("tr must be a finite number."),
      );
      expect(call({ ...bad, ...mild })).toThrow(/^Units must be/);
      expect(call({ ...bad, ...mild, units: "SI" })).toThrow(
        new TypeError("limit_inputs must be a boolean."),
      );
      expect(
        call({ ...bad, ...mild, units: "SI", limit_inputs: true }),
      ).toThrow(new TypeError("round_output must be a boolean."));
      // An unknown key fails first, as an unexpected keyword does in Python.
      expect(call({ foo: 1 })).toThrow(
        new TypeError("foo is not an input of utci()."),
      );
    });

    test("undefined takes the default, as an omitted keyword does", () => {
      expect(
        utci({
          ...mild,
          units: undefined,
          limit_inputs: undefined,
          round_output: undefined,
        }),
      ).toEqual(utci(mild));
      expect(utci({ ...mild, round_output: undefined }).utci).toBe(24.6);
      expect(
        utci({ tdb: 51, tr: 22, v: 16, rh: 50, limit_inputs: undefined }).utci,
      ).toBeNaN();
    });
  });

  describe("result", () => {
    // As upstream's frozen dataclass (classes_return.py:690).
    test("is frozen, its warnings and rows included", () => {
      const result = utci({ tdb: 51, tr: 22, v: 16, rh: 50 });
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.warnings)).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.every((row) => Object.isFrozen(row))).toBe(true);
      expect(() => {
        (result as { utci: number }).utci = 1;
      }).toThrow(TypeError);
    });

    test("has upstream's fields, then warnings", () => {
      expect(Object.keys(utci(mild))).toEqual([
        "utci",
        "stress_category",
        "warnings",
      ]);
    });
  });

  // deviation utci-1
  describe("UTCI_INFO", () => {
    test("names the model, with no description or standards", () => {
      expect(UTCI_INFO.name).toBe("utci");
      expect(UTCI_INFO.label).toBe("UTCI");
      expect(UTCI_INFO).not.toHaveProperty("standards");
      expect(UTCI_INFO).not.toHaveProperty("description");
    });

    // Upstream's limits (models/utci.py:137-141); tr has none of its own.
    test("lists every keyword argument, with upstream's bounds and defaults", () => {
      expect(UTCI_INFO.inputs).toEqual({
        tdb: {
          kind: "numeric",
          unit: "°C",
          applicability: { min: -50, max: 50 },
        },
        tr: { kind: "numeric", unit: "°C" },
        v: {
          kind: "numeric",
          unit: "m/s",
          applicability: { min: 0.5, max: 17 },
        },
        rh: {
          kind: "numeric",
          unit: "%",
          applicability: { min: 0, max: 100 },
        },
        units: {
          kind: "choice",
          allowed: ["SI", "IP"],
          default: "SI",
          message: "Units must be either 'SI' or 'IP'",
        },
        limit_inputs: { kind: "bool", default: true },
        round_output: { kind: "bool", default: true },
      });
      expect(Object.keys(UTCI_INFO.inputs)).toEqual([
        "tdb",
        "tr",
        "v",
        "rh",
        "units",
        "limit_inputs",
        "round_output",
      ]);
    });

    // BaseInputs' units field, written once (classes_input.py:95, :114-121).
    test("units is the entry clo_tout's INFO holds", () => {
      expect(UTCI_INFO.inputs.units).toBe(CLO_TOUT_INFO.inputs.units);
    });

    // The checks on quantities computed from the inputs, keyed by upstream's
    // param_name (models/utci.py:138, :140).
    test("derived holds tr - tdb and pa (kPa), in upstream's units", () => {
      expect(UTCI_INFO.derived).toEqual({
        "tr - tdb": { unit: "°C", applicability: { min: -30, max: 70 } },
        "pa (kPa)": { unit: "kPa", applicability: { min: 0, max: 5 } },
      });
    });

    // Upstream's stress_categories (models/utci.py:160-171), and _mapping's
    // right=True.
    test("the stress category bins are upstream's mapping, right-inclusive", () => {
      expect(UTCI_INFO.outputs).toEqual({
        utci: { unit: "°C" },
        stress_category: {
          unit: null,
          classifier: {
            edges: [-40, -27, -13, 0, 9, 26, 32, 38, 46, 1000],
            labels: [
              "extreme cold stress",
              "very strong cold stress",
              "strong cold stress",
              "moderate cold stress",
              "slight cold stress",
              "no thermal stress",
              "moderate heat stress",
              "strong heat stress",
              "very strong heat stress",
              "extreme heat stress",
            ],
            right: true,
          },
        },
      });
    });

    test("the bins and limits are reached through INFO only", () => {
      expect(models).not.toHaveProperty("UTCI_STRESS_CATEGORY_BINS");
      expect(models).not.toHaveProperty("UTCI_LIMITS");
    });

    test("is frozen deeply", () => {
      const { inputs, outputs, derived } = UTCI_INFO;
      expect(Object.isFrozen(UTCI_INFO)).toBe(true);
      expect(Object.isFrozen(inputs.tdb.applicability)).toBe(true);
      expect(Object.isFrozen(inputs.units.allowed)).toBe(true);
      expect(Object.isFrozen(derived["pa (kPa)"].applicability)).toBe(true);
      expect(Object.isFrozen(outputs.stress_category.classifier.edges)).toBe(
        true,
      );
      expect(Object.isFrozen(outputs.stress_category.classifier.labels)).toBe(
        true,
      );
    });
  });

  // deviation utci-2
  describe("warnings rows", () => {
    const { inputs, derived } = UTCI_INFO;

    // At 30 % RH pa stays under 5 kPa at 50 °C.
    test.each([
      ["tdb at its maximum", { tdb: 50, tr: 50, v: 1, rh: 30 }],
      ["tdb at its minimum", { tdb: -50, tr: -50, v: 1, rh: 30 }],
      ["v at its minimum", { tdb: 20, tr: 20, v: 0.5, rh: 30 }],
      ["v at its maximum", { tdb: 20, tr: 20, v: 17, rh: 30 }],
      ["tr - tdb at its maximum", { tdb: 20, tr: 90, v: 1, rh: 30 }],
      ["tr - tdb at its minimum", { tdb: 20, tr: -10, v: 1, rh: 30 }],
      ["rh at its minimum", { tdb: 20, tr: 20, v: 1, rh: 0 }],
      ["rh at its maximum", { tdb: 20, tr: 20, v: 1, rh: 100 }],
    ])("no row on the bound: %s", (_, call_inputs) => {
      const result = utci(call_inputs);
      expect(result.warnings).toEqual([]);
      expect(Number.isFinite(result.utci)).toBe(true);
    });

    // One step outside each bound: one row, whose bound is the object
    // UTCI_INFO references (`toBe`).
    test.each([
      {
        name: "tdb above its maximum",
        call_inputs: { tdb: 50.01, tr: 50, v: 1, rh: 30 },
        row: { key: "tdb", role: "input", value: 50.01, unit: "°C" },
        bound: inputs.tdb.applicability,
      },
      {
        name: "tdb below its minimum",
        call_inputs: { tdb: -50.01, tr: -50, v: 1, rh: 30 },
        row: { key: "tdb", role: "input", value: -50.01, unit: "°C" },
        bound: inputs.tdb.applicability,
      },
      {
        name: "tr - tdb above its maximum",
        call_inputs: { tdb: 20, tr: 90.5, v: 1, rh: 30 },
        row: { key: "tr - tdb", role: "derived", value: 70.5, unit: "°C" },
        bound: derived["tr - tdb"].applicability,
      },
      {
        name: "tr - tdb below its minimum",
        call_inputs: { tdb: 20, tr: -10.5, v: 1, rh: 30 },
        row: { key: "tr - tdb", role: "derived", value: -30.5, unit: "°C" },
        bound: derived["tr - tdb"].applicability,
      },
      {
        name: "v below its minimum",
        call_inputs: { tdb: 20, tr: 20, v: 0.49, rh: 30 },
        row: { key: "v", role: "input", value: 0.49, unit: "m/s" },
        bound: inputs.v.applicability,
      },
      {
        name: "v above its maximum",
        call_inputs: { tdb: 20, tr: 20, v: 17.01, rh: 30 },
        row: { key: "v", role: "input", value: 17.01, unit: "m/s" },
        bound: inputs.v.applicability,
      },
      {
        name: "pa above its maximum",
        call_inputs: { tdb: 40, tr: 40, v: 1, rh: 70 },
        row: {
          key: "pa (kPa)",
          role: "derived",
          value: 5.169709351430658,
          unit: "kPa",
        },
        bound: derived["pa (kPa)"].applicability,
      },
      {
        name: "rh above its maximum",
        call_inputs: { tdb: 20, tr: 20, v: 1, rh: 100.1 },
        row: { key: "rh", role: "input", value: 100.1, unit: "%" },
        bound: inputs.rh.applicability,
      },
    ])("one row one step outside: $name", ({ call_inputs, row, bound }) => {
      const on = utci(call_inputs);
      expect(on.warnings).toEqual([{ kind: "range", ...row, bound }]);
      const [first] = on.warnings;
      expect(first?.kind === "range" && first.bound).toBe(bound);
      expect(on.utci).toBeNaN();
      expect(on.stress_category).toBeNaN();
      // deviation utci-3
      const off = utci({ ...call_inputs, limit_inputs: false });
      expect(off.warnings).toEqual(on.warnings);
      expect(Number.isFinite(off.utci)).toBe(true);
    });

    // Measured on 4.7.0: utci(tdb=20, tr=20, v=1, rh=-0.1) warns
    // 'pa (kPa)' at -0.0023392623958624946, then 'rh'.
    test("rh below its minimum makes pa negative too: two rows", () => {
      const { warnings } = utci({ tdb: 20, tr: 20, v: 1, rh: -0.1 });
      expect(warnings).toEqual([
        expect.objectContaining({
          key: "pa (kPa)",
          value: -0.0023392623958624946,
        }),
        {
          kind: "range",
          key: "rh",
          role: "input",
          value: -0.1,
          unit: "%",
          bound: UTCI_INFO.inputs.rh.applicability,
        },
      ]);
    });

    // Measured on 4.7.0: utci(tdb=60, tr=140, v=20, rh=101) warns 'tdb',
    // 'tr - tdb', 'v', 'pa (kPa)' and 'rh', in that order.
    test("rows come in upstream's order: tdb, tr - tdb, v, pa (kPa), rh", () => {
      const { warnings } = utci({ tdb: 60, tr: 140, v: 20, rh: 101 });
      expect(warnings.map((row) => row.kind === "range" && row.key)).toEqual([
        "tdb",
        "tr - tdb",
        "v",
        "pa (kPa)",
        "rh",
      ]);
    });

    // Upstream checks the converted values (models/utci.py:110, :138): 68 °F
    // is 20 °C and 212 °F is 100 °C, so tr - tdb is 80 °C, not 144 °F.
    test("under IP the rows hold the SI values upstream compares", () => {
      const { warnings } = utci({
        tdb: 68,
        tr: 212,
        v: 3.28084,
        rh: 50,
        units: "IP",
      });
      expect(warnings).toEqual([
        expect.objectContaining({
          key: "tr - tdb",
          value: 80,
          unit: "°C",
        }),
      ]);
    });

    // Upstream calls warnings.warn only in _valid_range
    // (_internal/validation.py:55), so no notice row.
    test("a NaN under the gate never comes without a row, and no notice", () => {
      for (const t of [-60, -50, 0, 30, 50, 55])
        for (const dt of [-40, -30, 0, 70, 80])
          for (const speed of [0.2, 0.5, 5, 17, 20])
            for (const rh of [-1, 0, 50, 100, 101]) {
              const { utci: value, warnings } = utci({
                tdb: t,
                tr: t + dt,
                v: speed,
                rh,
              });
              expect({ t, dt, speed, rh, gated: warnings.length > 0 }).toEqual({
                t,
                dt,
                speed,
                rh,
                gated: Number.isNaN(value),
              });
              expect(warnings.every((row) => row.kind === "range")).toBe(true);
            }
    });
  });

  describe("stress-category bins (Issue #147)", () => {
    const bins = UTCI_INFO.outputs.stress_category.classifier;

    // Boundary values belong to the lower category (right-inclusive convention).
    test.each([
      // exact boundaries
      [-40, "extreme cold stress"],
      [-27, "very strong cold stress"],
      [-13, "strong cold stress"],
      [0, "moderate cold stress"],
      [9, "slight cold stress"],
      [26, "no thermal stress"],
      [32, "moderate heat stress"],
      [38, "strong heat stress"],
      [46, "very strong heat stress"],
      // bug-exposing inputs from the issue and real user reports
      [15.2, "no thermal stress"],
      [28.9, "moderate heat stress"],
      [50, "extreme heat stress"],
      // midpoint and out-of-range inputs
      [-50, "extreme cold stress"],
      [-100, "extreme cold stress"],
      [-33.5, "very strong cold stress"],
      [-20, "strong cold stress"],
      [-6.5, "moderate cold stress"],
      [4.5, "slight cold stress"],
      [17.5, "no thermal stress"],
      [29, "moderate heat stress"],
      [35, "strong heat stress"],
      [42, "very strong heat stress"],
      [47, "extreme heat stress"],
      [100, "extreme heat stress"],
      [0.001, "slight cold stress"],
    ])("UTCI %p should map to %p", (utci_value, expected_category) => {
      expect(classifyFromBins(utci_value, bins)).toBe(expected_category);
    });

    // just above each finite boundary bumps to the next category
    test.each([
      [-39.999, "very strong cold stress"],
      [-26.999, "strong cold stress"],
      [-12.999, "moderate cold stress"],
      [0.0001, "slight cold stress"],
      [9.0001, "no thermal stress"],
      [26.0001, "moderate heat stress"],
      [32.0001, "strong heat stress"],
      [38.0001, "very strong heat stress"],
      [46.0001, "extreme heat stress"],
    ])("UTCI %p should map to %p", (utci_value, expected_category) => {
      expect(classifyFromBins(utci_value, bins)).toBe(expected_category);
    });

    // Upstream's last edge is 1000, so np.digitize leaves anything above it,
    // and NaN, unlabelled.
    test.each([[NaN], [Infinity], [1000.1]])(
      "UTCI %p should map to NaN",
      (utci_value) => {
        expect(classifyFromBins(utci_value, bins)).toBeNaN();
      },
    );

    // np.digitize puts -inf in the first bin; the removed `mapping` returned
    // NaN here.
    test("UTCI -Infinity maps to the first category, as np.digitize does", () => {
      expect(classifyFromBins(-Infinity, bins)).toBe("extreme cold stress");
    });
  });

  test("is exported from the package root as from its subpath", () => {
    expect(utci_from_root).toBe(utci);
  });
});
