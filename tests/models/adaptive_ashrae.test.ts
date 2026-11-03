import { describe, expect, test } from "vitest";
import {
  adaptive_ashrae,
  ADAPTIVE_ASHRAE_INFO,
  CLO_TOUT_INFO,
} from "../../src/models/index.ts";
import { Units } from "../../src/utilities/index.ts";
import { adaptive_ashrae as adaptive_ashrae_from_root } from "../../src/index.ts";
import {
  ASHRAE_55_COMPLIANCE_STANDARDS,
  ASHRAE_55_LIMITS,
} from "../../src/_internal/ashrae55.ts";
import { test_data_urls } from "./comftest.ts";
import { describeModelContract } from "./modelContract.ts";
import { approx, loadTestData, validateResult } from "./testUtils.ts";

type Inputs = Parameters<typeof adaptive_ashrae>[0];

const { testData: reference_table, tolerances: tolerance } = await loadTestData(
  test_data_urls.adaptiveAshrae,
);

// Mirrors pythermalcomfort v4.7.0 tests/test_adaptive_ashrae.py. The
// _check_ashrae55_compliance cases of tests/test_internal.py are in
// tests/internal.test.ts, and test_t_o of tests/test_environment.py is in
// tests/environment/operative_tmp.test.ts.
describe("test_adaptive_ashrae", () => {
  test.each(reference_table.data)(
    "test_adaptive_ashrae: fixture case %#",
    (entry) => {
      const { inputs, outputs } = entry;
      // As upstream's adaptive_ashrae(tdb, tr, t_running_mean, v, units): the
      // fixture's entries hold those keys only, and one without units runs on
      // the "SI" default.
      const result = adaptive_ashrae(
        inputs as unknown as Parameters<typeof adaptive_ashrae>[0],
      );

      validateResult(result, outputs, tolerance, inputs);
    },
  );

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
    ).toThrow(RangeError);
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

    expect(result.tmp_cmf).toBe(null);

    // outside the applicability limits the acceptability flags are NaN, not 0.0 (#484)
    expect(result.acceptability_80).toBe(null);
    expect(result.acceptability_90).toBe(null);
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

    expect(approx(unrounded.tmp_cmf, 24.465, { rel: 1e-5, abs: 1e-8 })).toBe(
      true,
    );
    expect(approx(rounded.tmp_cmf, 24.5, { rel: 1e-5, abs: 1e-8 })).toBe(true);
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
    expect(
      approx(unrounded.tmp_cmf_80_low, 24.465 - 3.5, { rel: 1e-5, abs: 1e-8 }),
    ).toBe(true);
    expect(
      approx(unrounded.tmp_cmf_90_low, 24.465 - 2.5, { rel: 1e-5, abs: 1e-8 }),
    ).toBe(true);
    expect(
      approx(unrounded.tmp_cmf_80_up, 24.465 + 3.5, { rel: 1e-5, abs: 1e-8 }),
    ).toBe(true);
    expect(
      approx(unrounded.tmp_cmf_90_up, 24.465 + 2.5, { rel: 1e-5, abs: 1e-8 }),
    ).toBe(true);
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

  // Upstream's [value, np.nan], element-wise; deviation _shared-7.
  test.each(["tdb", "tr", "v"] as const)(
    "test_acceptability_nan_for_nan_input[%s]",
    (nan_input) => {
      const inputs = { tdb: 25.0, tr: 25.0, t_running_mean: 20.0, v: 0.1 };
      const result = adaptive_ashrae({ ...inputs, limit_inputs: false });
      expect(result.acceptability_80).toBe(true);
      expect(result.acceptability_90).toBe(true);
      expect(() =>
        adaptive_ashrae({ ...inputs, [nan_input]: NaN, limit_inputs: false }),
      ).toThrow(RangeError);
    },
  );
});

describeModelContract(
  adaptive_ashrae,
  ADAPTIVE_ASHRAE_INFO,
  { tdb: 25, tr: 25, t_running_mean: 20, v: 0.1 },
  { tdb: 25, tr: 25, t_running_mean: 5, v: 0.1 },
);

// The per-model checks of the template (ADRs 0022-0024), through the public
// entry: what upstream's tests leave out, measured on pythermalcomfort 4.7.0,
// the acceptability on 4.8.0, and what only the library adds.
describe("adaptive_ashrae (JS-only)", () => {
  const neutral = { tdb: 25, tr: 25, t_running_mean: 20, v: 0.1 };
  // A call with inputs the type rejects, to test the runtime.
  const call = (inputs: unknown) => () => adaptive_ashrae(inputs as Inputs);

  describe("values", () => {
    test("warm indoor exceeds the comfort zone: not acceptable", () => {
      const result = adaptive_ashrae({ ...neutral, tdb: 32, tr: 32 });
      validateResult(result, { tmp_cmf: 24.0 }, tolerance, {});
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
      validateResult(result, { tmp_cmf: 21.5 }, tolerance, {});
      expect(result.acceptability_80).toBe(false);
      expect(result.acceptability_90).toBe(false);
    });

    // The docstring's examples (adaptive_ashrae.py:78-98).
    test("the TSDoc examples give what upstream prints", () => {
      expect(adaptive_ashrae(neutral)).toEqual({
        tmp_cmf: 24,
        tmp_cmf_80_low: 20.5,
        tmp_cmf_80_up: 27.5,
        tmp_cmf_90_low: 21.5,
        tmp_cmf_90_up: 26.5,
        acceptability_80: true,
        acceptability_90: true,
        warnings: [],
      });
      expect(
        [25, 26].map((tdb) => adaptive_ashrae({ ...neutral, tdb }).tmp_cmf),
      ).toEqual([24, 24]);
      expect(
        adaptive_ashrae({
          tdb: 77,
          tr: 77,
          t_running_mean: 68,
          v: 0.3,
          units: "IP",
        }),
      ).toEqual({
        tmp_cmf: 75.2,
        tmp_cmf_80_low: 68.9,
        tmp_cmf_80_up: 81.5,
        tmp_cmf_90_low: 70.7,
        tmp_cmf_90_up: 79.7,
        acceptability_80: true,
        acceptability_90: true,
        warnings: [],
      });
      expect(adaptive_ashrae({ ...neutral, t_running_mean: 9 })).toMatchObject({
        tmp_cmf: null,
        acceptability_90: null,
      });
    });

    test("takes units in any case, and the constant, as upstream", () => {
      const ip = { tdb: 77, tr: 77, t_running_mean: 68, v: 0.3 };
      expect(adaptive_ashrae({ ...ip, units: Units.IP }).tmp_cmf).toBe(75.2);
      expect(call({ ...ip, units: "ip" })()).toEqual(
        adaptive_ashrae({ ...ip, units: "IP" }),
      );
      expect(call({ ...neutral, units: "si" })()).toEqual(
        adaptive_ashrae(neutral),
      );
    });

    // adaptive_ashrae(tdb=25, tr=25, t_running_mean=20, v=-0.5) gives nan with
    // a 'v' warning, and 24.0 with limit_inputs=False: operative_tmp weights a
    // negative v as one below 0.2 m/s.
    test("a negative v computes as upstream does", () => {
      const negative = { ...neutral, v: -0.5 };
      expect(adaptive_ashrae(negative).tmp_cmf).toBe(null);
      const off = adaptive_ashrae({ ...negative, limit_inputs: false });
      expect(off.tmp_cmf).toBe(24.0);
      expect(off.acceptability_90).toBe(true);
    });

    // At v >= 0.6 and to >= 25, ce = 1.2 widens the 90% upper bound from
    // t_cmf + 2.5 to t_cmf + 2.5 + 1.2, which flips acceptability_90 from
    // false (v = 0.1) to true (v = 0.6) at (tdb=tr=28, t_running_mean=22).
    test("v=0.6 widens 90% acceptability at to=28; v=0.1 does not", () => {
      const at28 = { tdb: 28, tr: 28, t_running_mean: 22 };
      expect(adaptive_ashrae({ ...at28, v: 0.6 }).acceptability_90).toBe(true);
      expect(adaptive_ashrae({ ...at28, v: 0.1 }).acceptability_90).toBe(false);
    });

    test("round_output:false acceptability matches round_output:true at non-boundary input", () => {
      const at28 = { tdb: 28, tr: 28, t_running_mean: 22, v: 0.6 };
      const rounded = adaptive_ashrae(at28);
      const unrounded = adaptive_ashrae({ ...at28, round_output: false });
      expect(unrounded.acceptability_80).toBe(rounded.acceptability_80);
      expect(unrounded.acceptability_90).toBe(rounded.acceptability_90);
    });

    // With round_output on, upstream rounds t_cmf in SI before the bounds and
    // the acceptability are derived, and converts the IP outputs without
    // rounding them again (adaptive_ashrae.py:147-172).
    describe("rounding order", () => {
      // to = 27.98. Rounded: t_cmf 24.465 -> 24.5, 80_up = 28.0 >= to.
      // Unrounded: 80_up = 27.965 < to.
      test("acceptability_80 at to = 27.98, trm = 21.5, v = 0.1 follows the rounded bound", () => {
        const boundary = {
          tdb: 27.98,
          tr: 27.98,
          t_running_mean: 21.5,
          v: 0.1,
        };
        const rounded = adaptive_ashrae(boundary);
        const unrounded = adaptive_ashrae({ ...boundary, round_output: false });
        expect(approx(rounded.tmp_cmf_80_up, 28.0)).toBe(true);
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
        expect(approx(result.tmp_cmf, 76.28)).toBe(true);
        expect(approx(result.tmp_cmf_80_low, (24.6 - 3.5) * 1.8 + 32)).toBe(
          true,
        );
        expect(approx(result.tmp_cmf_90_up, (24.6 + 2.5) * 1.8 + 32)).toBe(
          true,
        );
      });
    });
  });

  describe("errors", () => {
    // deviation _shared-24 (classes_input.py:120)
    test("units other than SI or IP throws upstream's message", () => {
      const message = "Units must be either 'SI' or 'IP'";
      for (const bad of ["INVALID", "", "metric"])
        expect(call({ ...neutral, units: bad })).toThrow(
          new RangeError(message),
        );
      for (const bad of [null, 5, true, ["SI"]])
        expect(call({ ...neutral, units: bad })).toThrow(
          new TypeError(message),
        );
    });
  });

  describe("result", () => {
    // adaptive_ashrae.py:150-159
    test("the acceptability is null where tmp_cmf is null", () => {
      const result = adaptive_ashrae({ ...neutral, tdb: 45 });
      expect(result.tmp_cmf).toBe(null);
      expect(result.acceptability_80).toBe(null);
      expect(result.acceptability_90).toBe(null);
    });
  });

  // deviation adaptive_ashrae-1
  describe("ADAPTIVE_ASHRAE_INFO", () => {
    test("shares ASHRAE 55's bounds and BaseInputs' units, not copies", () => {
      const { inputs } = ADAPTIVE_ASHRAE_INFO;
      expect(inputs.tdb.applicability).toBe(ASHRAE_55_LIMITS.tdb);
      expect(inputs.tr.applicability).toBe(ASHRAE_55_LIMITS.tr);
      expect(inputs.v.applicability).toBe(ASHRAE_55_LIMITS.v);
      expect(inputs.units).toBe(CLO_TOUT_INFO.inputs.units);
    });

    // deviation _shared-4 (models/adaptive_ashrae.py:131, _internal/ashrae55.py:12)
    test("standards is the array of ASHRAE 55's check, not a copy", () => {
      expect(ADAPTIVE_ASHRAE_INFO.standards).toBe(
        ASHRAE_55_COMPLIANCE_STANDARDS,
      );
    });
  });

  // deviation adaptive_ashrae-2
  describe("warnings rows", () => {
    const { inputs } = ADAPTIVE_ASHRAE_INFO;
    const quantities = ["tdb", "tr", "t_running_mean", "v"] as const;

    test.each(
      quantities.flatMap((key) => [
        [key, inputs[key].applicability.min],
        [key, inputs[key].applicability.max],
      ]),
    )("no row on the bound: %s = %s", (key, value) => {
      const result = adaptive_ashrae({ ...neutral, [key]: value });
      expect(result.warnings).toEqual([]);
      expect(Number.isFinite(result.tmp_cmf)).toBe(true);
    });

    // One step outside each bound: one row, whose bound is the object
    // ADAPTIVE_ASHRAE_INFO references (`toBe`).
    const step = 0.01;
    test.each(
      quantities.flatMap((key) => [
        [key, inputs[key].applicability.min - step],
        [key, inputs[key].applicability.max + step],
      ]),
    )("one row one step outside: %s = %s", (key, value) => {
      const bound = inputs[key].applicability;
      const on = adaptive_ashrae({ ...neutral, [key]: value });
      expect(on.warnings).toEqual([
        {
          kind: "range",
          key,
          role: "input",
          value,
          unit: inputs[key].unit,
          bound,
        },
      ]);
      const [first] = on.warnings;
      expect(first?.kind === "range" && first.bound).toBe(bound);
      expect(on.tmp_cmf).toBe(null);
      // deviation adaptive_ashrae-3
      const off = adaptive_ashrae({
        ...neutral,
        [key]: value,
        limit_inputs: false,
      });
      expect(off.warnings).toEqual(on.warnings);
      expect(Number.isFinite(off.tmp_cmf)).toBe(true);
    });

    // Measured on 4.7.0: adaptive_ashrae(tdb=5.0, tr=5.0, t_running_mean=5.0,
    // v=3.0) warns 'tdb', 'tr', 'v' and 't_running_mean', in that order.
    test("rows come in upstream's order: tdb, tr, v, t_running_mean", () => {
      const { warnings } = adaptive_ashrae({
        tdb: 5.0,
        tr: 5.0,
        t_running_mean: 5.0,
        v: 3.0,
      });
      expect(warnings.map((row) => row.kind === "range" && row.key)).toEqual([
        "tdb",
        "tr",
        "v",
        "t_running_mean",
      ]);
    });

    // Upstream passes _check_ashrae55_compliance no airspeed_control, met or
    // clo (adaptive_ashrae.py:131-135), so the no-control rules never apply.
    test("no airspeed_control rule applies", () => {
      expect(
        adaptive_ashrae({ tdb: 20, tr: 20, t_running_mean: 20, v: 1.5 })
          .warnings,
      ).toEqual([]);
    });

    // Upstream checks the converted values (adaptive_ashrae.py:116-122,
    // :131): 106 °F is 41.1 °C.
    test("under IP the rows hold the SI values upstream compares", () => {
      const { warnings } = adaptive_ashrae({
        tdb: 106,
        tr: 77,
        t_running_mean: 68,
        v: 0.3,
        units: "IP",
      });
      expect(warnings).toEqual([
        expect.objectContaining({
          key: "tdb",
          value: ((106 - 32) * 5) / 9,
          unit: "°C",
        }),
      ]);
    });

    // Upstream calls warnings.warn only through _valid_range here, so no
    // notice row.
    test("a null under the gate never comes without a row, and no notice", () => {
      for (const t of [5, 10, 25, 40, 45])
        for (const speed of [-0.5, 0, 1, 2, 2.5])
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
              gated: tmp_cmf === null,
            });
            expect(warnings.every((row) => row.kind === "range")).toBe(true);
          }
    });
  });

  test("is exported from the package root as from its subpath", () => {
    expect(adaptive_ashrae_from_root).toBe(adaptive_ashrae);
  });
});
