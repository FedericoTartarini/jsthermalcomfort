import { describe, expect, test } from "vitest";
import { utci } from "../../src/models/index.ts";
import { _utci_optimized } from "../../src/models/utci.ts";
import {
  UTCI_INFO,
  UTCI_LIMITS,
  UTCI_STRESS_CATEGORY_BINS,
} from "../../src/models/utci.ts";
import type { UtciParams } from "../../src/models/utci.ts";
import { classifyFromBins } from "../../src/_internal/classifierBins.ts";
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

describe("utci (JS-only)", () => {
  const mild = { tdb: 25, tr: 25, v: 1, rh: 50 };

  // Upstream #372: with log1p in place of log the value was 61.3. Its pa,
  // 5.9 kPa, is above the 5 kPa limit, so the gate is off.
  test("40 °C at 80 % RH gives upstream's 60.6", () => {
    expect(
      utci({ tdb: 40, tr: 40, v: 1, rh: 80, limit_inputs: false }),
    ).toMatchObject({ utci: 60.6, stress_category: "extreme heat stress" });
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
        // @ts-expect-error the Params type lacks ADR 0019's `?: T | undefined`; the runtime default is under test
        utci({
          ...mild,
          units: undefined,
          limit_inputs: undefined,
          round_output: undefined,
        }).utci,
      ).toBe(24.6);
      expect(
        // @ts-expect-error the Params type lacks ADR 0019's `?: T | undefined`; the runtime default is under test
        utci({ tdb: 51, tr: 22, v: 16, rh: 50, limit_inputs: undefined }).utci,
      ).toBeNaN();
    });
  });

  // Each bound is inclusive at both ends, and a value just outside it is NaN
  // only while limit_inputs is on. Expected values from pythermalcomfort
  // v4.7.0, at 30 % RH, which keeps pa under 5 kPa at 50 °C.
  describe("applicability gate", () => {
    const { tdb, v, tr_minus_tdb } = UTCI_LIMITS;

    test.each([
      [
        "tdb and v at their maxima",
        { tdb: tdb.max, tr: tdb.max, v: 0.5 },
        52.8,
      ],
      [
        "tdb and v at their extremes, tr - tdb at its minimum",
        { tdb: tdb.min, tr: tdb.min + tr_minus_tdb.min, v: v.max },
        -102.2,
      ],
      [
        "tr - tdb at its maximum",
        { tdb: 20, tr: 20 + tr_minus_tdb.max, v: 1 },
        38.2,
      ],
      [
        "tr - tdb at its minimum",
        { tdb: 20, tr: 20 + tr_minus_tdb.min, v: 1 },
        8.9,
      ],
    ])("returns a finite utci on the bound: %s", (_, inputs, expected) => {
      expect(utci({ ...inputs, rh: 30 }).utci).toBe(expected);
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
      const params = { ...inputs, rh: 30 };
      expect(utci(params).utci).toBeNaN();
      // With limit_inputs off the same values compute, so the NaN above came
      // from the bound and not from the arithmetic.
      expect(
        Number.isFinite(utci({ ...params, limit_inputs: false }).utci),
      ).toBe(true);
    });
  });

  describe("warnings rows", () => {
    const { tdb, v, tr_minus_tdb } = UTCI_LIMITS;

    test.each([
      ["tdb at its maximum", { tdb: tdb.max, tr: tdb.max, v: 1 }],
      ["tdb at its minimum", { tdb: tdb.min, tr: tdb.min, v: 1 }],
      ["v at its minimum", { tdb: 20, tr: 20, v: v.min }],
      ["v at its maximum", { tdb: 20, tr: 20, v: v.max }],
      ["tr - tdb at its maximum", { tdb: 20, tr: 20 + tr_minus_tdb.max, v: 1 }],
      ["tr - tdb at its minimum", { tdb: 20, tr: 20 + tr_minus_tdb.min, v: 1 }],
    ])("no row on the bound: %s", (_, inputs) => {
      expect(utci({ ...inputs, rh: 30 }).warnings).toEqual([]);
    });

    // One step outside each bound: one row, whose bound is the object
    // UTCI_INFO references (`toBe`), and whose tr_minus_tdb value is tr - tdb.
    const step = 0.01;
    test.each([
      {
        name: "tdb above its maximum",
        inputs: { tdb: tdb.max + step, tr: tdb.max, v: 1 },
        key: "tdb",
        role: "input",
        value: tdb.max + step,
        bound: UTCI_INFO.inputs.tdb!.applicability,
      },
      {
        name: "tdb below its minimum",
        inputs: { tdb: tdb.min - step, tr: tdb.min, v: 1 },
        key: "tdb",
        role: "input",
        value: tdb.min - step,
        bound: UTCI_INFO.inputs.tdb!.applicability,
      },
      {
        name: "v below its minimum",
        inputs: { tdb: 20, tr: 20, v: v.min - step },
        key: "v",
        role: "input",
        value: v.min - step,
        bound: UTCI_INFO.inputs.v!.applicability,
      },
      {
        name: "v above its maximum",
        inputs: { tdb: 20, tr: 20, v: v.max + step },
        key: "v",
        role: "input",
        value: v.max + step,
        bound: UTCI_INFO.inputs.v!.applicability,
      },
      {
        name: "tr - tdb above its maximum",
        inputs: { tdb: 20, tr: 20 + tr_minus_tdb.max + step, v: 1 },
        key: "tr_minus_tdb",
        role: "derived",
        value: 20 + tr_minus_tdb.max + step - 20,
        bound: UTCI_INFO.derived!.tr_minus_tdb!.applicability,
      },
      {
        name: "tr - tdb below its minimum",
        inputs: { tdb: 20, tr: 20 + tr_minus_tdb.min - step, v: 1 },
        key: "tr_minus_tdb",
        role: "derived",
        value: 20 + tr_minus_tdb.min - step - 20,
        bound: UTCI_INFO.derived!.tr_minus_tdb!.applicability,
      },
    ])(
      "one row one step outside: $name",
      ({ inputs, key, role, value, bound }) => {
        const on = utci({ ...inputs, rh: 30 });
        expect(on.warnings).toEqual([{ key, role, value, bound }]);
        expect(on.warnings[0]!.bound).toBe(bound);
        expect(on.utci).toBeNaN();
        // The same rows with the gate off, beside a finite utci.
        const off = utci({ ...inputs, rh: 30, limit_inputs: false });
        expect(off.warnings).toEqual(on.warnings);
        expect(Number.isFinite(off.utci)).toBe(true);
      },
    );

    test("rows come in upstream's order: tdb, tr - tdb, v, pa, rh", () => {
      const { warnings } = utci({ tdb: 60, tr: 140, v: 20, rh: 101 });
      expect(warnings.map((w) => w.key)).toEqual([
        "tdb",
        "tr_minus_tdb",
        "v",
        "pa (kPa)",
        "rh",
      ]);
    });

    // Row values are SI, as ApplicabilityWarning says: 68 °F is 20 °C and
    // 212 °F is 100 °C, so tr - tdb is 80 K, not 144 °F.
    test("under IP the row values are SI", () => {
      const { warnings } = utci({
        tdb: 68,
        tr: 212,
        v: 3.28084,
        rh: 50,
        units: "IP",
      });
      expect(warnings.map((w) => w.key)).toEqual(["tr_minus_tdb"]);
      expect(warnings[0]!.value).toBeCloseTo(80, 6);
    });

    test("a NaN under the gate never comes without a row", () => {
      for (const t of [-60, -50, 0, 30, 50, 55])
        for (const dt of [-40, -30, 0, 70, 80])
          for (const speed of [0.2, 0.5, 5, 17, 20]) {
            const { utci: value, warnings } = utci({
              tdb: t,
              tr: t + dt,
              v: speed,
              rh: 50,
            });
            expect({ t, dt, speed, gated: warnings.length > 0 }).toEqual({
              t,
              dt,
              speed,
              gated: Number.isNaN(value),
            });
          }
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
    test("utci is exported from package root (src/index.ts)", () => {
      expect(utci_from_root).toBe(utci);
    });
  });
});
