import { describe, expect, test } from "vitest";
import { ireq, IREQ_INFO } from "../../src/models/index.ts";
import { ireq as ireq_from_root } from "../../src/index.ts";
import { ireq as implementation_ireq } from "../../src/models/ireq.ts";
import { describeModelContract } from "./modelContract.ts";
import { approx } from "./testUtils.ts";

type Inputs = Parameters<typeof ireq>[0];

const MET_116_W_M2 = 116.0 / 58.15;
const MET_175_W_M2 = 175.0 / 58.15;
const MET_400_W_M2 = 400.0 / 58.15;

// np.allclose's default tolerances.
const allclose = (actual: unknown, expected: number) =>
  approx(actual as number, expected, { rel: 1e-5, abs: 1e-8 });

// Mirrors pythermalcomfort v4.8.0 tests/test_ireq.py.
describe("test_ireq", () => {
  test("test_ireq_scalar_example", () => {
    const result = ireq({
      tdb: -15.0,
      tr: -15.0,
      vr: 2.0,
      rh: 55.0,
      met: MET_175_W_M2,
      clo: 2.8,
      p: 50.0,
      walk_sp: 1.1,
    });

    expect(result.ireq_min).toBe(1.6);
    expect(result.ireq_neutral).toBe(1.9);
    expect(result.icl_min).toBe(2.2);
    expect(result.icl_neutral).toBe(2.6);
    expect(result.dle_min).toBe("more than 8");
    expect(result.dle_neutral).toBe("more than 8");
  });

  test.each([
    [0, 0, 2, 90, 2.5, 2.6, 3.1, 2.3],
    [0, 0, 2, 145, 2.5, 1.5, 1.8, "more than 8"],
    [-10, -10, 2, 90, 2.5, 3.5, 4.4, 0.7],
    [-10, 0, 2, 145, 2.4, 1.9, 2.4, "more than 8"],
    [-20, -20, 2, 115, 4.2, 3.4, 4.2, "more than 8"],
    [-20, -20, 7, 115, 4.2, 3.5, 5.9, 1.1],
    [-30, -30, 2, 115, 4.2, 4.0, 5.0, 2.2],
    [-30, -30, 5, 175, 4.2, 2.6, 4.0, "more than 8"],
  ] as const)(
    "test_ireq_iso_11079_table_f1: tdb %s, tr %s, vr %s, met %s W/m2, clo %s",
    (
      tdb,
      tr,
      vr,
      met_w_m2,
      clo,
      expected_ireq_neutral,
      expected_icl_neutral,
      expected_dle_neutral,
    ) => {
      const walk_sp = Math.max(0.5, Math.min(0.0052 * (met_w_m2 - 58.0), 1.2));

      const result = ireq({
        tdb,
        tr,
        vr,
        rh: 85,
        met: met_w_m2 / 58.15,
        clo,
        p: 8,
        walk_sp,
        wme: 0,
      });

      expect(
        approx(result.ireq_neutral, expected_ireq_neutral, { abs: 0.11 }),
      ).toBe(true);
      expect(
        approx(result.icl_neutral, expected_icl_neutral, { abs: 0.11 }),
      ).toBe(true);

      if (expected_dle_neutral === "more than 8") {
        expect(result.dle_neutral).toBe(expected_dle_neutral);
      } else {
        expect(
          approx(result.dle_neutral as number, expected_dle_neutral, {
            abs: 0.21,
          }),
        ).toBe(true);
      }
    },
  );

  test("test_ireq_vectorized_inputs", () => {
    const result = [
      [-15.0, -15.0, 2.0, 55.0, MET_175_W_M2, 2.8, 50.0, 1.1],
      [-10.0, -10.0, 1.0, 50.0, MET_116_W_M2, 1.5, 8.0, 0.31],
    ].map(([tdb, tr, vr, rh, met, clo, p, walk_sp]) =>
      ireq({ tdb, tr, vr, rh, met, clo, p, walk_sp } as Inputs),
    );

    expect(allclose(result[0]?.ireq_min, 1.6)).toBe(true);
    expect(allclose(result[0]?.ireq_neutral, 1.9)).toBe(true);
    expect(allclose(result[0]?.icl_min, 2.2)).toBe(true);
    expect(allclose(result[0]?.icl_neutral, 2.6)).toBe(true);
    expect(result[0]?.dle_min).toBe("more than 8");
    expect(result[0]?.dle_neutral).toBe("more than 8");

    expect(allclose(result[1]?.ireq_min, 2.2)).toBe(true);
    expect(allclose(result[1]?.ireq_neutral, 2.6)).toBe(true);
    expect(allclose(result[1]?.icl_min, 2.5)).toBe(true);
    expect(allclose(result[1]?.icl_neutral, 2.9)).toBe(true);
    expect(allclose(result[1]?.dle_min, 0.8)).toBe(true);
    expect(allclose(result[1]?.dle_neutral, 0.6)).toBe(true);
  });

  test("test_ireq_limit_inputs_returns_nan_outside_iso_range", () => {
    const params = {
      tdb: -15.0,
      tr: -15.0,
      vr: 0.2,
      rh: 55.0,
      met: MET_175_W_M2,
      clo: 2.8,
      p: 50.0,
      walk_sp: 1.1,
    };

    const result_limited = ireq(params);
    expect(result_limited.ireq_min).toBe(null);
    expect(result_limited.ireq_neutral).toBe(null);
    expect(result_limited.icl_min).toBe(null);
    expect(result_limited.icl_neutral).toBe(null);
    expect(result_limited.dle_min).toBe(null);
    expect(result_limited.dle_neutral).toBe(null);

    const result_unlimited = ireq({ ...params, limit_inputs: false });
    expect(Number.isFinite(result_unlimited.ireq_min)).toBe(true);
    expect(Number.isFinite(result_unlimited.ireq_neutral)).toBe(true);
    expect(Number.isFinite(result_unlimited.icl_min)).toBe(true);
    expect(Number.isFinite(result_unlimited.icl_neutral)).toBe(true);
  });

  test("test_ireq_accepts_upper_met_boundary_with_max_walk_speed", () => {
    const result = ireq({
      tdb: -15.0,
      tr: -15.0,
      vr: 2.0,
      rh: 55.0,
      met: MET_400_W_M2,
      clo: 2.8,
      p: 50.0,
      walk_sp: 1.2,
    });

    expect(result.ireq_min).toBe(0.3);
    expect(result.ireq_neutral).toBe(0.6);
    expect(result.icl_min).toBe(0.4);
    expect(result.icl_neutral).toBe(0.8);
  });

  test("test_ireq_uses_wme_met_units_and_numeric_dle", () => {
    const result = ireq({
      tdb: -15.0,
      tr: -15.0,
      vr: 2.0,
      rh: 55.0,
      met: MET_175_W_M2,
      clo: 2.8,
      p: 50.0,
      walk_sp: 1.1,
      wme: 1.0,
    });

    expect(result.ireq_min).toBe(2.7);
    expect(result.ireq_neutral).toBe(3.2);
    expect(result.icl_min).toBe(3.8);
    expect(result.icl_neutral).toBe(4.5);
    expect(result.dle_min).toBe(1.3);
    expect(result.dle_neutral).toBe(0.8);
  });

  test("test_ireq_non_physical_outputs_masked_before_rounding", () => {
    const result = ireq({
      tdb: 10.0,
      tr: 10.0,
      vr: 0.4,
      rh: 0.0,
      met: 250.0 / 58.15,
      clo: 0.0,
      p: 1.0,
      walk_sp: 0.9984,
    });

    expect(result.ireq_min).toBe(null);
    expect(result.icl_min).toBe(null);
    expect(result.dle_min).toBe(null);
  });

  test("test_ireq_non_physical_outputs_not_masked_when_limit_inputs_false", () => {
    const params = {
      tdb: 10.0,
      tr: 10.0,
      vr: 0.4,
      rh: 0.0,
      met: 350.0 / 58.15,
      clo: 0.0,
      p: 1.0,
      walk_sp: 0.9984,
    };

    const result_limited = ireq(params);
    expect(result_limited.ireq_min).toBe(null);
    expect(result_limited.icl_min).toBe(null);

    const result_unlimited = ireq({ ...params, limit_inputs: false });
    expect(result_unlimited.ireq_min).toBeLessThan(0);
    expect(result_unlimited.icl_min).toBeLessThan(0);
  });

  test("test_ireq_invalid_physical_inputs_raise", () => {
    const params = {
      tdb: -15.0,
      tr: -15.0,
      vr: 2.0,
      rh: 55.0,
      met: MET_175_W_M2,
      clo: 2.8,
      p: 50.0,
      walk_sp: 1.1,
    };

    expect(() => ireq({ ...params, p: -10.0 })).toThrow(
      new RangeError("Air permeability (p) must be greater than 0."),
    );

    expect(() => ireq({ ...params, rh: 105.0 })).toThrow(
      new RangeError("Relative humidity (rh) must be between 0 and 100."),
    );

    expect(() => ireq({ ...params, clo: -1.0 })).toThrow(
      new RangeError("Clothing insulation (clo) must be non-negative."),
    );

    expect(() => ireq({ ...params, walk_sp: -0.1 })).toThrow(
      new RangeError("Walking speed (walk_sp) must be non-negative."),
    );
  });

  test("test_ireq_broadcasts_mixed_scalar_and_array_inputs", () => {
    const result = [-15.0, -10.0].map((tdb) =>
      ireq({
        tdb,
        tr: -15.0,
        vr: 2.0,
        rh: 55.0,
        met: MET_175_W_M2,
        clo: 2.8,
        p: 50.0,
        walk_sp: 1.1,
      }),
    );

    expect(result).toHaveLength(2);
    expect(allclose(result[0]?.ireq_min, 1.6)).toBe(true);
    expect(allclose(result[1]?.ireq_min, 1.4)).toBe(true);
    expect(allclose(result[0]?.ireq_neutral, 1.9)).toBe(true);
    expect(allclose(result[1]?.ireq_neutral, 1.7)).toBe(true);
  });

  test("test_ireq_public_api_export", () => {
    expect(ireq).toBe(implementation_ireq);
  });
});

const valid = {
  tdb: -15.0,
  tr: -15.0,
  vr: 2.0,
  rh: 55.0,
  met: MET_175_W_M2,
  clo: 2.8,
  p: 50.0,
  walk_sp: 1.1,
};

describeModelContract(ireq, IREQ_INFO, valid, { ...valid, vr: 0.2 });

const call = (inputs: unknown) => ireq(inputs as Inputs);

const outputs = (result: ReturnType<typeof ireq>) => [
  result.ireq_min,
  result.ireq_neutral,
  result.icl_min,
  result.icl_neutral,
  result.dle_min,
  result.dle_neutral,
];

const non_physical = {
  tdb: 10.0,
  tr: 10.0,
  vr: 0.4,
  rh: 0.0,
  met: 350.0 / 58.15,
  clo: 0.0,
  p: 1.0,
  walk_sp: 0.9984,
};

// What upstream's tests leave out, measured on pythermalcomfort 4.7.0 in the
// parity image.
describe("ireq (JS-only)", () => {
  // The unrounded values agree to 3.8e-10 relative (register ireq's Notes).
  test.each([
    [
      valid,
      [
        1.5610762634243995,
        1.8579521026613632,
        2.206155021403332,
        2.64144148591956,
        "more than 8",
        "more than 8",
      ],
      [1.6, 1.9, 2.2, 2.6, "more than 8", "more than 8"],
    ],
    [
      { ...valid, wme: 1.0 },
      [
        2.678866706805238, 3.150070656982723, 3.8440180359484346,
        4.533718625562801, 1.3104317050248946, 0.7879432752018372,
      ],
      [2.7, 3.2, 3.8, 4.5, 1.3, 0.8],
    ],
    [
      { ...valid, met: 0.9, limit_inputs: false },
      [
        6.556171777853863, 6.943667177360992, 9.511633039604911,
        10.077393130812231, 0.42244224422442245, 0.38829302685896855,
      ],
      [6.6, 6.9, 9.5, 10.1, 0.4, 0.4],
    ],
    [
      { ...non_physical, limit_inputs: false },
      [
        -0.1881265454419726,
        0.059363933471064854,
        -0.296523599322182,
        -0.019976880213545555,
        "more than 8",
        "more than 8",
      ],
      [-0.2, 0.1, -0.3, -0.0, "more than 8", "more than 8"],
    ],
  ] as const)("%o gives %o, rounded %o", (inputs, expected, rounded) => {
    const unrounded = outputs(ireq({ ...inputs, round_output: false }));
    expected.forEach((want, i) => {
      const value = unrounded[i];
      if (typeof want === "string") expect(value).toBe(want);
      else
        expect(approx(value as number, want, { rel: 1e-9, abs: 0 })).toBe(true);
    });
    expect(outputs(ireq(inputs))).toEqual(rounded);
  });

  // models/ireq.py:413-425, deviation ireq-2, deviation ireq-3.
  test.each([
    [
      { vr: 0.2 },
      {
        key: "vr",
        role: "input",
        value: 0.2,
        unit: "m/s",
        bound: { min: 0.4, max: 18.0 },
      },
    ],
    [
      { met: 0.9 },
      {
        key: "met",
        role: "derived",
        value: 52.335,
        unit: "W/m²",
        bound: { min: 58.0, max: 400.0 },
      },
    ],
    [
      { tdb: 12.0 },
      {
        key: "tdb",
        role: "input",
        value: 12.0,
        unit: "°C",
        bound: { max: 10.0 },
      },
    ],
    [
      { walk_sp: 0.5 },
      {
        key: "walk_sp",
        role: "input",
        value: 0.5,
        unit: "m/s",
        bound: { min: 0.6083999999999999, max: 1.2 },
      },
    ],
  ] as const)(
    "%o gives the row %o and masks every output with the gate on",
    (change, row) => {
      for (const limit_inputs of [true, false]) {
        const result = ireq({ ...valid, ...change, limit_inputs });
        expect(result.warnings).toEqual([{ kind: "range", ...row }]);
        expect(
          outputs(result)
            .slice(0, 4)
            .every((value) => value === null),
        ).toBe(limit_inputs);
        expect(
          [result.dle_min, result.dle_neutral].every((value) => value === null),
        ).toBe(limit_inputs);
      }
    },
  );

  // models/ireq.py:417-424.
  test("gives the input rows in upstream's order", () => {
    const result = ireq({
      ...valid,
      tdb: 12.0,
      vr: 0.2,
      walk_sp: 0.5,
      met: 0.9,
    });
    expect(
      result.warnings.map((row) => row.kind === "range" && row.key),
    ).toEqual(["met", "tdb", "vr"]);
  });

  // models/ireq.py:172, :415, deviation ireq-2, deviation ireq-3.
  test("gives the walk_sp row, then an output row for each negative ireq or icl, whatever limit_inputs is", () => {
    for (const limit_inputs of [true, false]) {
      const rows = ireq({ ...non_physical, limit_inputs }).warnings;
      expect(
        rows.map(
          (row) => row.kind === "range" && [row.key, row.role, row.unit],
        ),
      ).toEqual([
        ["walk_sp", "input", "m/s"],
        ["ireq_min", "output", "clo"],
        ["icl_min", "output", "clo"],
        ["icl_neutral", "output", "clo"],
      ]);
      for (const row of rows.slice(1)) {
        expect(row).toEqual(expect.objectContaining({ bound: { min: 0 } }));
      }
    }
  });

  // models/ireq.py:172: NaN < 0 is false, so a NaN ireq masks nothing.
  test("keeps dle where ireq and icl are null, as upstream's mask does", () => {
    const result = ireq({ ...valid, tr: 1e300 });
    expect(
      outputs(result)
        .slice(0, 4)
        .every((value) => value === null),
    ).toBe(true);
    expect(result.dle_min).toBe(0.0);
    expect(result.dle_neutral).toBe(0.0);
    expect(result.warnings).toEqual([]);
  });

  // models/ireq.py:172-186: each criterion is masked on its own.
  test("masks the minimal criterion, whose icl is negative, and keeps the neutral dle", () => {
    const result = ireq({ ...valid, tr: -1e300 });
    expect(
      outputs(result)
        .slice(0, 4)
        .every((value) => value === null),
    ).toBe(true);
    expect(result.dle_min).toBe(null);
    expect(result.dle_neutral).toBe(4.7);
    expect(
      result.warnings.map((row) => row.kind === "range" && row.key),
    ).toEqual(["icl_min"]);
    const unmasked = ireq({ ...valid, tr: -1e300, limit_inputs: false });
    expect(Object.is(unmasked.ireq_min, -0)).toBe(true);
    expect(unmasked.icl_min).toBe(-0.1);
    expect(unmasked.dle_min).toBe("more than 8");
  });

  // classes_input.py:1361-1374, deviation ireq-4.
  test.each([
    [{ met: 0.0, p: -1.0 }, "Metabolic rate (met) must be greater than 0."],
    [{ wme: -1.0, rh: 105.0 }, "External work (wme) must be non-negative."],
    [
      { vr: -1.0, walk_sp: -1.0 },
      "Relative air speed (vr) must be non-negative.",
    ],
    [
      { rh: -1.0, clo: -1.0 },
      "Relative humidity (rh) must be between 0 and 100.",
    ],
  ])("%o throws IREQInputs' first message, %s", (change, message) => {
    expect(() => call({ ...valid, ...change })).toThrow(
      new RangeError(message),
    );
  });

  // Deviation ireq-6.
  test.each([true, false])(
    "throws numba's division error at tdb -235 with limit_inputs %s",
    (limit_inputs) => {
      expect(() => ireq({ ...valid, tdb: -235.0, limit_inputs })).toThrow(
        new RangeError("division by zero"),
      );
    },
  );

  test("is exported from the package root as from its subpath", () => {
    expect(ireq_from_root).toBe(ireq);
  });
});
