import { describe, expect, test } from "@jest/globals";
import {
  _utci_optimized,
  utci,
  UTCI_LIMITS,
  UTCI_STRESS_CATEGORY_BINS,
} from "../../src/models/utci.ts";
import type { UtciParams } from "../../src/models/utci.ts";
import { classifyFromBins } from "../../src/models/classifierBins.ts";
import { utci as utci_from_models } from "../../src/models/index.js";
import { utci as utci_from_root } from "../../src/index.js";
import { p_sat } from "../../src/psychrometrics/p_sat.js";
import { round } from "../../src/utilities/utilities.js";
import { testDataUrls } from "./comftest.ts";
import { loadTestData, validateResult } from "./testUtils.ts";

let { testData, tolerances } = await loadTestData(testDataUrls.utci);

// Mirrors pythermalcomfort v4.6.0 tests/test_utci.py.
describe("test_utci", () => {
  test.each(testData.data)("test_utci: fixture case %#", (row) => {
    const { inputs, outputs } = row;
    // As upstream, `utci(**inputs)`: the fixture writes `units` in lowercase,
    // which the model accepts as upstream does, so the row is cast rather
    // than rewritten.
    const result = utci(inputs as unknown as UtciParams);

    validateResult(result, outputs, tolerances, inputs);
  });

  // Upstream's vector call, element-wise.
  test("test_utci_optimized", () => {
    expect(
      [25, 27].map((tdb) => round(_utci_optimized(tdb, 1, 1, 1.5), 2)),
    ).toEqual([24.73, 26.57]);
  });

  test("test_utci_ip_uses_si_thresholds_for_stress_category", () => {
    const result = utci({ tdb: 77, tr: 77, v: 3.28084, rh: 50, units: "IP" });

    expect(result.utci).toBe(76.3);
    expect(result.stress_category).toBe("no thermal stress");
  });

  // Upstream's vectors, element-wise.
  test("test_utci_ip_vector_stress_category", () => {
    const results = [77, 104].map((t) =>
      utci({ tdb: t, tr: t, v: 3.28084, rh: 50, units: "IP" }),
    );

    [76.3, 110.5].forEach((expected, i) =>
      expect(Math.abs(results[i].utci - expected)).toBeLessThanOrEqual(1e-6),
    );
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

  // Upstream's scalar call, then its vector call element-wise.
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

    expect(Math.abs(vector_result[0].utci - 76.3)).toBeLessThanOrEqual(1e-6);
    expect(vector_result[1].utci).toBeNaN();
    expect(vector_result[0].stress_category).toBe("no thermal stress");
    expect(vector_result[1].stress_category).toBeNaN();
  });

  test("test_utci_saturation_vapour_pressure_matches_p_sat", () => {
    const tdb = 40;
    const tr = 40;
    const v = 1;
    const rh = 80;
    const pa = (p_sat(tdb) * (rh / 100)) / 1000;
    const expected = _utci_optimized(tdb, v, tr - tdb, pa);
    const actual = utci({ tdb, tr, v, rh, round_output: false }).utci;
    expect(Math.abs(actual - expected)).toBeLessThanOrEqual(0.1);
  });
});

describe("utci (JS-only)", () => {
  const mild = { tdb: 25, tr: 25, v: 1, rh: 50 };

  // Upstream #372: with log1p in place of log the value was 61.3.
  test("40 °C at 80 % RH gives upstream's 60.6", () => {
    expect(utci({ tdb: 40, tr: 40, v: 1, rh: 80 })).toEqual({
      utci: 60.6,
      stress_category: "extreme heat stress",
    });
  });

  // Issue #147: the NaN propagates instead of a misleading label.
  test("out-of-range inputs yield utci=NaN and stress_category=NaN", () => {
    const result = utci({ tdb: 51, tr: 22, v: 16, rh: 50 });
    expect(result.utci).toBeNaN();
    expect(result.stress_category).toBeNaN();
  });

  describe("input validation", () => {
    const quantities = ["tdb", "tr", "v", "rh"] as const;

    // A numeric string is not coerced, unlike in arithmetic.
    test.each(quantities)("throws TypeError if %s is not a number", (key) => {
      // Cast: deliberately passing a string to test the runtime TypeError.
      const params = { ...mild, [key]: "25" } as unknown as UtciParams;
      expect(() => utci(params)).toThrow(TypeError);
    });

    // A missing quantity is a TypeError, as a missing keyword argument is in
    // Python.
    test.each(quantities)("throws TypeError if %s is missing", (key) => {
      const params: Partial<UtciParams> = { ...mild };
      delete params[key];
      // @ts-expect-error deliberately omitting a quantity to test the runtime TypeError
      expect(() => utci(params)).toThrow(TypeError);
    });

    // ADR 0001: a non-finite number throws rather than propagating as NaN.
    test.each(quantities)("throws TypeError if %s is not finite", (key) => {
      for (const bad of [NaN, Infinity, -Infinity]) {
        expect(() => utci({ ...mild, [key]: bad })).toThrow(TypeError);
      }
    });

    // Every argument was positional before v2 (ADR 0002). A call still
    // written that way throws rather than running on anything else.
    test("throws TypeError if called positionally", () => {
      // @ts-expect-error the model takes one params object
      expect(() => utci(25, 25, 1.0, 50)).toThrow(TypeError);
      // @ts-expect-error the model takes one params object
      expect(() => utci(25, 25, 1.0, 50, "SI", true)).toThrow(TypeError);
      // @ts-expect-error null is not a params object
      expect(() => utci(null)).toThrow(TypeError);
      // @ts-expect-error the params object is required
      expect(() => utci()).toThrow(TypeError);
    });

    test("throws Error if units is not a valid enum", () => {
      // Cast: deliberately passing an unknown system to test the runtime Error.
      const params = { ...mild, units: "INVALID" } as unknown as UtciParams;
      expect(() => utci(params)).toThrow(Error);
    });

    // Only the switches upstream's UTCIInputs validates; round_output is not
    // among them.
    test("throws TypeError if limit_inputs is not a boolean", () => {
      // Cast: deliberately passing a string to test the runtime TypeError.
      const params = { ...mild, limit_inputs: "true" } as unknown as UtciParams;
      expect(() => utci(params)).toThrow(TypeError);
    });

    test("a switch passed as undefined takes its default", () => {
      expect(
        utci({
          ...mild,
          units: undefined,
          limit_inputs: undefined,
          round_output: undefined,
        }).utci,
      ).toBe(24.6);
      expect(
        utci({ tdb: 51, tr: 22, v: 16, rh: 50, limit_inputs: undefined }).utci,
      ).toBeNaN();
    });
  });

  // Each bound is inclusive at both ends, and a value just outside it is NaN
  // only while limit_inputs is on. Expected values from pythermalcomfort
  // v4.6.0.
  describe("applicability gate", () => {
    const { tdb, v, tr_minus_tdb } = UTCI_LIMITS;

    test.each([
      [
        "tdb and v at their maxima",
        { tdb: tdb.max, tr: tdb.max, v: 0.5 },
        67.7,
      ],
      [
        "tdb and v at their extremes, tr - tdb at its minimum",
        { tdb: tdb.min, tr: tdb.min + tr_minus_tdb.min, v: v.max },
        -101.8,
      ],
      [
        "tr - tdb at its maximum",
        { tdb: 20, tr: 20 + tr_minus_tdb.max, v: 1 },
        38.5,
      ],
      [
        "tr - tdb at its minimum",
        { tdb: 20, tr: 20 + tr_minus_tdb.min, v: 1 },
        9.6,
      ],
    ])("returns a finite utci on the bound: %s", (_, inputs, expected) => {
      expect(utci({ ...inputs, rh: 50 }).utci).toBe(expected);
    });

    test.each([
      ["tdb above its maximum", { tdb: tdb.max + 0.01, tr: 50, v: 1 }],
      ["tdb below its minimum", { tdb: tdb.min - 0.01, tr: -50, v: 1 }],
      ["v below its minimum", { tdb: 20, tr: 20, v: v.min - 0.01 }],
      ["v above its maximum", { tdb: 20, tr: 20, v: v.max + 0.01 }],
      [
        "tr - tdb above its maximum",
        { tdb: 20, tr: 20 + tr_minus_tdb.max + 0.01, v: 1 },
      ],
      [
        "tr - tdb below its minimum",
        { tdb: 20, tr: 20 + tr_minus_tdb.min - 0.01, v: 1 },
      ],
    ])("returns NaN outside the bound: %s", (_, inputs) => {
      const params = { ...inputs, rh: 50 };
      expect(utci(params).utci).toBeNaN();
      // With limit_inputs off the same values compute, so the NaN above came
      // from the bound and not from the arithmetic.
      expect(
        Number.isFinite(utci({ ...params, limit_inputs: false }).utci),
      ).toBe(true);
    });
  });

  describe("stress-category bins (Issue #147)", () => {
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
    ])("UTCI %p should map to %p", (utciValue, expectedCategory) => {
      expect(classifyFromBins(utciValue, UTCI_STRESS_CATEGORY_BINS)).toBe(
        expectedCategory,
      );
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
    ])("UTCI %p should map to %p", (utciValue, expectedCategory) => {
      expect(classifyFromBins(utciValue, UTCI_STRESS_CATEGORY_BINS)).toBe(
        expectedCategory,
      );
    });

    // Upstream's last edge is 1000, so np.digitize leaves anything above it,
    // and NaN, unlabelled.
    test.each([[NaN], [Infinity], [1000.1]])(
      "UTCI %p should map to NaN",
      (utciValue) => {
        expect(
          classifyFromBins(utciValue, UTCI_STRESS_CATEGORY_BINS),
        ).toBeNaN();
      },
    );

    // np.digitize puts -inf in the first bin; the removed `mapping` returned
    // NaN here.
    test("UTCI -Infinity maps to the first category, as np.digitize does", () => {
      expect(classifyFromBins(-Infinity, UTCI_STRESS_CATEGORY_BINS)).toBe(
        "extreme cold stress",
      );
    });
  });

  describe("exports", () => {
    test("utci is exported from models/index.js", () => {
      expect(utci_from_models).toBe(utci);
    });

    test("utci is exported from package root (src/index.js)", () => {
      expect(utci_from_root).toBe(utci);
    });
  });
});
