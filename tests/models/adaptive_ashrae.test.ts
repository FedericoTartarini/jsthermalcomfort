import { describe, expect, test } from "@jest/globals";
import {
  adaptive_ashrae,
  ADAPTIVE_ASHRAE_INFO,
} from "../../src/models/index.js";
import type { AdaptiveAshraeParams } from "../../src/models/adaptive_ashrae.ts";
import { testDataUrls } from "./comftest.ts";
import { loadTestData, validateResult } from "./testUtils.ts";

let { testData, tolerances } = await loadTestData(testDataUrls.adaptiveAshrae);

const close = (actual: number, expected: number) =>
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(1e-6);

// Mirrors pythermalcomfort v4.6.0 tests/test_adaptive_ashrae.py.
//
// The ASHRAE 55 compliance tests in tests/test_internal.py
// (TestCheckAshrae55Compliance) are mirrored with pmv_ppd_ashrae, not here:
// all four pass met and clo, and three take the airspeed_control=False path,
// while adaptive_ashrae passes the helper tdb, tr and v only, as upstream's
// does.
describe("test_adaptive_ashrae", () => {
  test.each(testData.data)("test_adaptive_ashrae: fixture case %#", (row) => {
    const { inputs, outputs } = row;
    // The row goes in unchanged, as upstream's adaptive_ashrae(**inputs); a
    // row without units runs on the "SI" default.
    const result = adaptive_ashrae(inputs as unknown as AdaptiveAshraeParams);

    validateResult(result, outputs, tolerances, inputs);
  });

  test("test_ashrae_inputs_invalid_units", () => {
    expect(() =>
      adaptive_ashrae({
        tdb: 25,
        tr: 25,
        t_running_mean: 20,
        v: 0.1,
        // @ts-expect-error units is "SI" or "IP"; the runtime check is under test
        units: "INVALID",
      }),
    ).toThrow(Error);
  });

  test("test_ashrae_inputs_invalid_tdb_type", () => {
    expect(() =>
      adaptive_ashrae({
        // @ts-expect-error tdb is a number; the runtime check is under test
        tdb: "invalid",
        tr: 25,
        t_running_mean: 20,
        v: 0.1,
      }),
    ).toThrow(TypeError);
  });

  test("test_ashrae_inputs_invalid_tr_type", () => {
    expect(() =>
      adaptive_ashrae({
        tdb: 25,
        // @ts-expect-error tr is a number; the runtime check is under test
        tr: "invalid",
        t_running_mean: 20,
        v: 0.1,
      }),
    ).toThrow(TypeError);
  });

  test("test_ashrae_inputs_invalid_t_running_mean_type", () => {
    expect(() =>
      adaptive_ashrae({
        tdb: 25,
        tr: 25,
        // @ts-expect-error t_running_mean is a number; the runtime check is under test
        t_running_mean: "invalid",
        v: 0.1,
      }),
    ).toThrow(TypeError);
  });

  test("test_ashrae_inputs_invalid_v_type", () => {
    expect(() =>
      adaptive_ashrae({
        tdb: 25,
        tr: 25,
        t_running_mean: 20,
        // @ts-expect-error v is a number; the runtime check is under test
        v: "invalid",
      }),
    ).toThrow(TypeError);
  });

  test("test_nan_values_for_invalid_inputs", () => {
    const result = adaptive_ashrae({
      tdb: 5.0,
      tr: 5.0,
      t_running_mean: 5.0,
      v: 3.0,
      limit_inputs: true,
    });

    expect(result.tmp_cmf).toBeNaN();
    expect(result.acceptability_80).toBe(false);
    expect(result.acceptability_90).toBe(false);
  });

  test("test_round_output_default_preserves_behaviour", () => {
    const default_result = adaptive_ashrae({
      tdb: 25,
      tr: 25,
      t_running_mean: 21.5,
      v: 0.1,
    });
    const explicit_result = adaptive_ashrae({
      tdb: 25,
      tr: 25,
      t_running_mean: 21.5,
      v: 0.1,
      round_output: true,
    });

    expect(default_result.tmp_cmf).toBe(explicit_result.tmp_cmf);
    expect(default_result.tmp_cmf_80_low).toBe(explicit_result.tmp_cmf_80_low);
    expect(default_result.tmp_cmf_80_up).toBe(explicit_result.tmp_cmf_80_up);
    expect(default_result.tmp_cmf_90_low).toBe(explicit_result.tmp_cmf_90_low);
    expect(default_result.tmp_cmf_90_up).toBe(explicit_result.tmp_cmf_90_up);
  });

  test("test_round_output_false_returns_unrounded", () => {
    // 0.31 * 21.5 + 17.8 = 24.465; rounded to 1 dp this is 24.5.
    const unrounded = adaptive_ashrae({
      tdb: 25,
      tr: 25,
      t_running_mean: 21.5,
      v: 0.1,
      round_output: false,
    });
    const rounded = adaptive_ashrae({
      tdb: 25,
      tr: 25,
      t_running_mean: 21.5,
      v: 0.1,
      round_output: true,
    });

    close(unrounded.tmp_cmf, 24.465);
    close(rounded.tmp_cmf, 24.5);
    expect(unrounded.tmp_cmf).not.toBe(rounded.tmp_cmf);
  });

  test("test_round_output_false_propagates_to_bounds", () => {
    const unrounded = adaptive_ashrae({
      tdb: 25,
      tr: 25,
      t_running_mean: 21.5,
      v: 0.1,
      round_output: false,
    });

    // tmp_cmf_80_low = t_cmf - 3.5; with unrounded t_cmf=24.465 this is 20.965.
    close(unrounded.tmp_cmf_80_low, 24.465 - 3.5);
    close(unrounded.tmp_cmf_90_low, 24.465 - 2.5);
    close(unrounded.tmp_cmf_80_up, 24.465 + 3.5);
    close(unrounded.tmp_cmf_90_up, 24.465 + 2.5);
  });

  test("test_round_output_invalid_type_raises", () => {
    expect(() =>
      adaptive_ashrae({
        tdb: 25,
        tr: 25,
        t_running_mean: 20,
        v: 0.1,
        // @ts-expect-error round_output is a boolean; the runtime check is under test
        round_output: "yes",
      }),
    ).toThrow(TypeError);
  });
});

// The mirror of test_t_o (pythermalcomfort v4.6.0 tests/test_environment.py)
// is in tests/psychrometrics/t_o.test.js, next to the other t_o tests.

describe("adaptive_ashrae (JS-only)", () => {
  const neutral = { tdb: 25, tr: 25, t_running_mean: 20, v: 0.1 };

  test("neutral comfort, t_running_mean within range: comfort predicted", () => {
    const result = adaptive_ashrae(neutral);
    validateResult(result, { tmp_cmf: 24.0 }, tolerances, {});
    expect(result.acceptability_80).toBe(true);
    expect(result.acceptability_90).toBe(true);
  });

  test("warm indoor exceeds the comfort zone: not acceptable", () => {
    const result = adaptive_ashrae({ ...neutral, tdb: 32, tr: 32 });
    validateResult(result, { tmp_cmf: 24.0 }, tolerances, {});
    expect(result.acceptability_80).toBe(false);
    expect(result.acceptability_90).toBe(false);
  });

  test("cool indoor below the comfort zone: not acceptable", () => {
    const result = adaptive_ashrae({
      ...neutral,
      tdb: 15,
      tr: 15,
      t_running_mean: 12,
    });
    validateResult(result, { tmp_cmf: 21.5 }, tolerances, {});
    expect(result.acceptability_80).toBe(false);
    expect(result.acceptability_90).toBe(false);
  });

  test("out-of-range t_running_mean: tmp_cmf is NaN", () => {
    const result = adaptive_ashrae({
      ...neutral,
      t_running_mean: 5,
      units: "SI",
      limit_inputs: true,
    });
    expect(result.tmp_cmf).toBeNaN();
    expect(result.acceptability_80).toBe(false);
    expect(result.acceptability_90).toBe(false);
  });

  describe("warnings rows", () => {
    const { inputs } = ADAPTIVE_ASHRAE_INFO;
    const bound = (key: keyof typeof inputs) => inputs[key].applicability!;

    test.each([
      ["tdb", bound("tdb").min!],
      ["tdb", bound("tdb").max!],
      ["tr", bound("tr").min!],
      ["tr", bound("tr").max!],
      ["v", bound("v").min!],
      ["v", bound("v").max!],
      ["t_running_mean", bound("t_running_mean").min!],
      ["t_running_mean", bound("t_running_mean").max!],
    ])("no row on the bound: %s = %s", (key, value) => {
      expect(adaptive_ashrae({ ...neutral, [key]: value }).warnings).toEqual(
        [],
      );
    });

    // One step outside each bound: one row, whose bound is the object
    // ADAPTIVE_ASHRAE_INFO references (`toBe`). v one step below 0 is not
    // here: the operative temperature throws on a negative v first.
    const step = 0.01;
    test.each<[string, number]>([
      ["tdb", bound("tdb").min! - step],
      ["tdb", bound("tdb").max! + step],
      ["tr", bound("tr").min! - step],
      ["tr", bound("tr").max! + step],
      ["v", bound("v").max! + step],
      ["t_running_mean", bound("t_running_mean").min! - step],
      ["t_running_mean", bound("t_running_mean").max! + step],
    ])("one row one step outside: %s = %s", (key, value) => {
      const on = adaptive_ashrae({ ...neutral, [key]: value });
      expect(on.warnings).toEqual([
        { key, role: "input", value, bound: bound(key) },
      ]);
      expect(on.warnings[0].bound).toBe(bound(key));
      expect(on.tmp_cmf).toBeNaN();
      // The same rows with the gate off, beside a finite tmp_cmf.
      const off = adaptive_ashrae({
        ...neutral,
        [key]: value,
        limit_inputs: false,
      });
      expect(off.warnings).toEqual(on.warnings);
      expect(Number.isFinite(off.tmp_cmf)).toBe(true);
    });

    test("rows come in upstream's order: tdb, tr, v, t_running_mean", () => {
      const { warnings } = adaptive_ashrae({
        tdb: 45,
        tr: 45,
        v: 3,
        t_running_mean: 40,
      });
      expect(warnings.map((w) => w.key)).toEqual([
        "tdb",
        "tr",
        "v",
        "t_running_mean",
      ]);
    });

    // Upstream passes no airspeed_control, met or clo, so a v that would
    // break the no-control airspeed limits gives no row.
    test("no airspeed_control rule applies", () => {
      expect(
        adaptive_ashrae({ tdb: 20, tr: 20, t_running_mean: 20, v: 1.5 })
          .warnings,
      ).toEqual([]);
    });

    // Row values are SI, as ApplicabilityWarning says: 106 °F is 41.1 °C.
    test("under IP the row values are SI", () => {
      const { warnings } = adaptive_ashrae({
        tdb: 106,
        tr: 77,
        t_running_mean: 68,
        v: 0.3,
        units: "IP",
      });
      expect(warnings.map((w) => w.key)).toEqual(["tdb"]);
      expect(warnings[0].value).toBeCloseTo(((106 - 32) * 5) / 9, 6);
    });

    test("a NaN under the gate never comes without a row", () => {
      for (const t of [5, 10, 25, 40, 45])
        for (const speed of [0, 1, 2, 2.5])
          for (const t_running_mean of [5, 10, 20, 33.5, 40]) {
            const { tmp_cmf, warnings } = adaptive_ashrae({
              tdb: t,
              tr: t,
              v: speed,
              t_running_mean,
            });
            expect({
              t,
              speed,
              t_running_mean,
              gated: warnings.length > 0,
            }).toEqual({
              t,
              speed,
              t_running_mean,
              gated: Number.isNaN(tmp_cmf),
            });
          }
    });
  });

  // t_cmf = 0.31 * 22 + 17.8 = 24.62, rounded 24.6.
  test("round_output:false returns the unrounded comfort temperature and bounds", () => {
    const rounded = adaptive_ashrae({ ...neutral, t_running_mean: 22 });
    const unrounded = adaptive_ashrae({
      ...neutral,
      t_running_mean: 22,
      round_output: false,
    });
    expect(rounded.tmp_cmf).toBe(24.6);
    expect(Math.abs(unrounded.tmp_cmf - 24.62)).toBeLessThan(1e-10);
    // tmp_cmf_80_low = t_cmf - 3.5: 21.12 unrounded, 21.1 from the rounded t_cmf.
    expect(Math.abs(rounded.tmp_cmf_80_low - 21.1)).toBeLessThan(1e-10);
    expect(Math.abs(unrounded.tmp_cmf_80_low - 21.12)).toBeLessThan(1e-10);
  });

  test("omitting round_output keeps the default true", () => {
    expect(adaptive_ashrae({ ...neutral, t_running_mean: 22 }).tmp_cmf).toBe(
      24.6,
    );
  });

  // Locks the cooling-effect gate inside adaptive_ashrae. At v >= 0.6 and
  // to >= 25, ce = 1.2 widens the 90% upper bound from t_cmf + 2.5 to
  // t_cmf + 2.5 + 1.2, which flips acceptability_90 from false (v = 0.1) to
  // true (v = 0.6) at (tdb=tr=28, t_running_mean=22).
  test("v=0.6 widens 90% acceptability at to=28; v=0.1 does not", () => {
    const at28 = { tdb: 28, tr: 28, t_running_mean: 22 };
    const wide = adaptive_ashrae({ ...at28, v: 0.6 });
    const narrow = adaptive_ashrae({ ...at28, v: 0.1 });
    expect(wide.acceptability_90).toBe(true);
    expect(narrow.acceptability_90).toBe(false);
  });

  test("round_output:false acceptability matches round_output:true at non-boundary input", () => {
    const at28 = { tdb: 28, tr: 28, t_running_mean: 22, v: 0.6 };
    const rounded = adaptive_ashrae(at28);
    const unrounded = adaptive_ashrae({ ...at28, round_output: false });
    expect(unrounded.acceptability_80).toBe(rounded.acceptability_80);
    expect(unrounded.acceptability_90).toBe(rounded.acceptability_90);
  });

  // Rounding order, as upstream (adaptive_ashrae.py:147-172): with
  // round_output on, t_cmf is rounded in SI before the bounds and the
  // acceptability are derived, and IP outputs are the converted values, not
  // rounded again. Issue #179 had chosen the opposite (acceptability from the
  // unrounded bounds, IP outputs rounded after conversion); its tests were
  // removed because ADR 0001 lets a deviation add to upstream, never change a
  // value it returns.
  describe("rounding order", () => {
    // to = 27.98. Rounded: t_cmf 24.465 -> 24.5, 80_up = 28.0 >= to.
    // Unrounded: 80_up = 27.965 < to.
    test("acceptability_80 at to = 27.98, trm = 21.5, v = 0.1 follows the rounded bound", () => {
      const boundary = { tdb: 27.98, tr: 27.98, t_running_mean: 21.5, v: 0.1 };
      const rounded = adaptive_ashrae(boundary);
      const unrounded = adaptive_ashrae({ ...boundary, round_output: false });
      close(rounded.tmp_cmf_80_up, 28.0);
      expect(rounded.acceptability_80).toBe(true);
      expect(unrounded.acceptability_80).toBe(false);
    });

    // trm 71.6 °F = 22 °C: t_cmf 24.62 -> 24.6 °C -> 76.28 °F, not 76.3.
    test("IP outputs are the rounded SI values converted, not rounded again", () => {
      const result = adaptive_ashrae({
        tdb: 77,
        tr: 77,
        t_running_mean: 71.6,
        v: 0.3,
        units: "IP",
      });
      close(result.tmp_cmf, 76.28);
      close(result.tmp_cmf_80_low, (24.6 - 3.5) * 1.8 + 32);
      close(result.tmp_cmf_90_up, (24.6 + 2.5) * 1.8 + 32);
    });
  });

  describe("input validation", () => {
    const quantities = ["tdb", "tr", "t_running_mean", "v"] as const;

    // A numeric string is not coerced, unlike in arithmetic.
    test.each(quantities)("throws TypeError if %s is not a number", (key) => {
      // Cast: deliberately passing a string to test the runtime TypeError.
      const params = {
        ...neutral,
        [key]: String(neutral[key]),
      } as unknown as AdaptiveAshraeParams;
      expect(() => adaptive_ashrae(params)).toThrow(TypeError);
    });

    // A missing quantity is a TypeError, as a missing keyword argument is in
    // Python.
    test.each(quantities)("throws TypeError if %s is missing", (key) => {
      const params: Partial<AdaptiveAshraeParams> = { ...neutral };
      delete params[key];
      // @ts-expect-error deliberately omitting a quantity to test the runtime TypeError
      expect(() => adaptive_ashrae(params)).toThrow(TypeError);
    });

    // ADR 0001: a non-finite number throws rather than propagating as NaN.
    test.each(quantities)("throws TypeError if %s is not finite", (key) => {
      for (const bad of [NaN, Infinity, -Infinity]) {
        expect(() => adaptive_ashrae({ ...neutral, [key]: bad })).toThrow(
          TypeError,
        );
      }
    });

    // Every argument was positional before v2 (ADR 0002). A call still
    // written that way throws rather than running on anything else.
    test("throws TypeError if called positionally", () => {
      // @ts-expect-error the model takes one params object
      expect(() => adaptive_ashrae(25, 25, 20, 0.1)).toThrow(TypeError);
      expect(() =>
        // @ts-expect-error the model takes one params object
        adaptive_ashrae(77, 77, 68, 0.3, "IP", false, false),
      ).toThrow(TypeError);
      // @ts-expect-error null is not a params object
      expect(() => adaptive_ashrae(null)).toThrow(TypeError);
      // @ts-expect-error the params object is required
      expect(() => adaptive_ashrae()).toThrow(TypeError);
    });

    test("throws TypeError if round_output is not a boolean", () => {
      expect(() =>
        adaptive_ashrae({
          ...neutral,
          // @ts-expect-error round_output is a boolean; the runtime check is under test
          round_output: "true",
        }),
      ).toThrow(TypeError);
    });

    test("a switch passed as undefined takes its default", () => {
      expect(
        adaptive_ashrae({
          ...neutral,
          t_running_mean: 5,
          units: undefined,
          limit_inputs: undefined,
          round_output: undefined,
        }).tmp_cmf,
      ).toBeNaN();
      expect(
        adaptive_ashrae({
          ...neutral,
          t_running_mean: 22,
          round_output: undefined,
        }).tmp_cmf,
      ).toBe(24.6);
    });
  });
});
