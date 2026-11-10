import { describe, expect, test } from "vitest";
import { phs, PHS_INFO, PHS_LIMITS_ISO_7933 } from "../../src/models/index.ts";
import { phs as from_root } from "../../src/index.ts";
import { Postures } from "../../src/utilities/index.ts";
import { met_to_w_m2 } from "../../src/utilities/met_to_w_m2.ts";
import { test_data_urls } from "./comftest.ts";
import { describeModelContract } from "./modelContract.ts";
import { approx, loadTestData, validateResult } from "./testUtils.ts";

type Inputs = Parameters<typeof phs>[0];

const { testData: reference_table, tolerances: tolerance } = await loadTestData(
  test_data_urls.phs,
);

const weight = 75;
const height = 1.8;
const a_dubois = 0.202 * weight ** 0.425 * height ** 0.725;

// Mirrors pythermalcomfort v4.8.0 tests/test_phs.py. A `pytest.raises(ValueError)`
// becomes a throw of the class the library maps that case to, a RangeError.
describe("test_phs", () => {
  test.each(reference_table.data)("test_phs: fixture case %#", (entry) => {
    const inputs = { ...entry.inputs, standard: "7933-2004" };
    const outputs = entry.outputs;
    const result = phs(inputs as unknown as Inputs);

    validateResult(result, outputs, tolerance, inputs);
  });

  const standard_2023: [
    string,
    Record<string, unknown>,
    Record<string, number>,
  ][] = [
    [
      "0",
      {
        tdb: 40,
        tr: 40,
        rh: 35,
        v: 0.3,
        met: 300 / met_to_w_m2 / a_dubois,
        clo: 0.5,
        posture: "standing",
        wme: 0,
        standard: "7933-2023",
        duration: 480,
        limit_inputs: false,
        acclimatized: 100,
        round_output: false,
      },
      { sweat_loss_g: 6538, t_cr: 37.6, d_lim_loss_95: 280 },
    ],
    [
      "1",
      {
        tdb: 35,
        tr: 35,
        rh: 60,
        v: 0.1,
        met: 300 / met_to_w_m2 / a_dubois,
        clo: 0.5,
        posture: "standing",
        wme: 0,
        standard: "7933-2023",
        duration: 480,
        limit_inputs: false,
        acclimatized: 0,
        round_output: false,
      },
      { sweat_loss_g: 6345, t_cr: 40.8, d_lim_loss_95: 250, d_lim_t_re: 62 },
    ],
    [
      "3",
      {
        tdb: 30,
        tr: 30,
        rh: 45,
        v: 1.0,
        met: 450 / met_to_w_m2 / a_dubois,
        clo: 0.5,
        posture: "standing",
        wme: 0,
        standard: "7933-2023",
        duration: 480,
        limit_inputs: false,
        acclimatized: 0,
        round_output: false,
      },
      { sweat_loss_g: 4593, t_cr: 38.0, d_lim_loss_95: 400 },
    ],
    [
      "4",
      {
        tdb: 35,
        tr: 74.6,
        rh: 30,
        v: 1.0,
        met: 250 / met_to_w_m2 / a_dubois,
        clo: 1,
        posture: "sitting",
        wme: 0,
        a_p: 0.2,
        f_r: 0.85,
        standard: "7933-2023",
        duration: 480,
        limit_inputs: false,
        acclimatized: 100,
        round_output: false,
      },
      { sweat_loss_g: 5813, t_cr: 37.5, d_lim_loss_95: 310 },
    ],
    // The array-input case, element by element.
    ...[0, 1].map(
      (i): [string, Record<string, unknown>, Record<string, number>] => [
        `array-input[${String(i)}]`,
        {
          tdb: [35, 35][i],
          tr: 74.6,
          rh: 30,
          v: 1.0,
          met: 250 / met_to_w_m2 / a_dubois,
          clo: 1,
          posture: ["sitting", "sitting"][i],
          wme: 0,
          a_p: 0.2,
          f_r: 0.85,
          standard: "7933-2023",
          duration: 480,
          limit_inputs: false,
          acclimatized: 100,
          round_output: false,
        },
        {
          sweat_loss_g: [5813, 5813][i] ?? NaN,
          t_cr: [37.5, 37.5][i] ?? NaN,
          d_lim_loss_95: [310, 310][i] ?? NaN,
        },
      ],
    ),
  ];

  function check_2023(
    inputs: Record<string, unknown>,
    expected: Record<string, number>,
  ) {
    const result = phs(inputs as unknown as Inputs);
    expect(
      approx(result.sweat_loss_g, expected.sweat_loss_g ?? NaN, {
        rel: 0.025,
        abs: 0,
      }),
    ).toBe(true);
    expect(approx(result.t_cr, expected.t_cr ?? NaN, { abs: 0.3 })).toBe(true);
    expect(
      approx(result.d_lim_loss_95, expected.d_lim_loss_95 ?? NaN, { abs: 10 }),
    ).toBe(true);
    if (expected.d_lim_t_re !== undefined) {
      expect(approx(result.d_lim_t_re, expected.d_lim_t_re, { abs: 10 })).toBe(
        true,
      );
    }
  }

  test.each(standard_2023)("test_2023_standard[%s]", (_, inputs, expected) => {
    check_2023(inputs, expected);
  });

  // pytest.mark.xfail(reason="Known discrepancy t_cr and d_lim_t_re", strict=True)
  test.fails("test_2023_standard[high-radiant-temp]", () => {
    check_2023(
      {
        tdb: 30,
        tr: 54.2,
        rh: 35,
        v: 0.1,
        met: 300 / met_to_w_m2 / a_dubois,
        clo: 0.8,
        posture: "standing",
        wme: 0,
        a_p: 0.3,
        f_r: 0.85,
        standard: "7933-2023",
        duration: 480,
        limit_inputs: false,
        acclimatized: 0,
        round_output: false,
      },
      { sweat_loss_g: 6419, t_cr: 38.7, d_lim_loss_95: 280, d_lim_t_re: 149 },
    );
  });

  const base = {
    tdb: 40,
    tr: 40,
    rh: 33.85,
    v: 0.3,
    met: 2.58,
    clo: 0.5,
    posture: "standing" as const,
  };

  test("test_value_acclimatized", () => {
    expect(() => phs({ ...base, acclimatized: 101 })).toThrow(RangeError);
    expect(() => phs({ ...base, acclimatized: -1 })).toThrow(RangeError);
  });

  test("test_value_weight", () => {
    expect(() => phs({ ...base, weight: 1001 })).toThrow(RangeError);
    expect(() => phs({ ...base, weight: 0 })).toThrow(RangeError);
  });

  test("test_value_drink", () => {
    expect(() => phs({ ...base, drink: 0.5 })).toThrow(RangeError);
    expect(() => phs({ ...base, drink: 2 })).toThrow(RangeError);
  });

  test.each(["7933-2004", "7933-2023"])(
    "test_applicability_limit_is_on_tr_minus_tdb_not_tr[%s]",
    (model) => {
      const result = phs({
        tdb: 40,
        tr: 10,
        rh: 50,
        v: 0.5,
        met: 2.0,
        clo: 0.5,
        posture: "standing",
        standard: model,
        round_output: false,
      } as unknown as Inputs);
      expect(result.t_cr).toBe(null);
    },
  );

  test("test_applicability_limit_metabolic_rate_is_standard_specific", () => {
    const kwargs = {
      tdb: 30,
      tr: 40,
      rh: 50,
      v: 0.5,
      met: 1.5,
      clo: 0.5,
      posture: "standing" as const,
      round_output: false,
    };
    expect(phs({ standard: "7933-2023", ...kwargs }).t_cr).not.toBe(null);
    expect(phs({ standard: "7933-2004", ...kwargs }).t_cr).toBe(null);
  });

  test("test_2023_forces_skin_temperature_to_equilibrium_on_minute_one", () => {
    const kwargs = {
      tdb: 40,
      tr: 40,
      rh: 35,
      v: 0.3,
      met: 2.58,
      clo: 0.5,
      posture: "standing" as const,
      wme: 0,
      duration: 1,
      limit_inputs: false,
      round_output: false,
      t_sk: 20.0,
    };
    const result_2023 = phs({ standard: "7933-2023", ...kwargs });
    const result_2004 = phs({ standard: "7933-2004", ...kwargs });
    expect(result_2023.t_sk).toBeGreaterThan(30);
    expect(result_2004.t_sk).toBeLessThan(result_2023.t_sk ?? NaN);
  });
});

const posture_base = {
  tdb: 40,
  tr: 40,
  rh: 33.85,
  v: 0.3,
  met: 2.5,
  clo: 0.5,
};
const posture_message =
  "posture must be one of ['sitting', 'standing', 'crouching']";
const phs_posture_message =
  "Posture has to be either 'standing', 'sitting', or 'crouching'.";

// Mirrors the posture cases of pythermalcomfort v4.8.0 tests/test_choice_field.py
// through the model, whose inputs class receives posture (models/phs.py:218).
describe("test_choice_field", () => {
  const allowed = ["sitting", "standing", "crouching"];
  const run = (posture: unknown) =>
    phs({ ...posture_base, posture } as unknown as Inputs);

  // BaseInputs skips None, and phs's own check then raises.
  test("test_choice_fields_metadata_and_none[posture]", () => {
    expect(PHS_INFO.inputs.posture.allowed).toEqual(allowed);
    expect(() => run(null)).toThrow(new RangeError(phs_posture_message));
  });

  // Postures.crouching is the string "crouching" (deviation _shared-29).
  test.each([
    ["scalar", allowed[0], 316],
    ["enum", Postures.crouching, 317],
  ])(
    "test_choice_fields_preserve_valid_values[posture-%s]",
    (_, value, expected) => {
      expect(run(value).d_lim_loss_50).toBe(expected);
    },
  );

  // Kept as given, so phs's own check, which compares the case given, raises (deviation phs-13).
  test("test_choice_fields_preserve_valid_values[posture-uppercase]", () => {
    expect(() => run("SITTING")).toThrow(new RangeError(phs_posture_message));
  });

  // Deviation phs-12.
  test.each([["list"], ["array"]])(
    "test_choice_fields_preserve_valid_values[posture-%s]",
    () => {
      expect(() => run(allowed)).toThrow(new TypeError(posture_message));
    },
  );

  test.todo(
    "test_choice_fields_preserve_valid_values[posture-series]: a pandas Series has no JavaScript counterpart",
  );

  test.each([
    ["scalar", "invalid", RangeError],
    ["list", [allowed[0], "invalid"], TypeError],
    ["array", [allowed[0], "invalid"], TypeError],
  ])(
    "test_choice_fields_reject_invalid_values[posture-%s]",
    (_, value, error) => {
      expect(() => run(value)).toThrow(new error(posture_message));
    },
  );
});

const valid = {
  tdb: 40,
  tr: 40,
  rh: 33.85,
  v: 0.3,
  met: 2.5,
  clo: 0.5,
  posture: "standing",
};

describeModelContract(phs, PHS_INFO, valid, { ...valid, tdb: 10 });

const call = (inputs: unknown) => phs(inputs as Parameters<typeof phs>[0]);
const model_message =
  "is not supported. Supported models are: 7933-2004 and 7933-2023.";

// What upstream's tests leave out, measured on pythermalcomfort 4.7.0 in the
// parity image.
describe("phs (JS-only)", () => {
  // models/phs.py:25, :202-207.
  test("standards are ISO 7933's two editions, the default first", () => {
    expect(PHS_INFO.standards).toEqual(["7933-2023", "7933-2004"]);
    expect(PHS_INFO.inputs.standard.allowed).toBe(PHS_INFO.standards);
  });

  // Deviation phs-10, deviation phs-9.
  test("a standard other than the two editions throws upstream's message", () => {
    expect(() => call({ ...valid, standard: "random" })).toThrow(
      new RangeError(`Model 'random' ${model_message}`),
    );
    for (const [standard, text] of [
      [5, "5"],
      [null, "null"],
      [["7933-2023"], "7933-2023"],
    ])
      expect(() => call({ ...valid, standard })).toThrow(
        new TypeError(`Model '${String(text)}' ${model_message}`),
      );
  });

  // Deviation phs-11.
  test("a posture that is not a string throws choice_field's message, a TypeError", () => {
    for (const posture of [5, true, {}])
      expect(() => call({ ...valid, posture })).toThrow(
        new TypeError(posture_message),
      );
  });

  // Deviation phs-14.
  test.each([
    [{ sweat_rate_watt: -1 }, "sweat_rate_watt must be >= 0"],
    [{ evap_load_wm2_min: -1 }, "evap_load_wm2_min must be >= 0"],
    [{ t_sk_t_cr_wg: 1.1 }, "t_sk_t_cr_wg must be within [0, 1]"],
    [{ t_sk_t_cr_wg: -0.1 }, "t_sk_t_cr_wg must be within [0, 1]"],
    [{ acclimatized: 50 }, "Acclimatized should be 0 or 100"],
    [{ drink: 0.5 }, "Drink should be 0 or 1"],
    [
      { weight: 0 },
      "The weight of the person should be in kg and it cannot exceed 1000",
    ],
    [
      { weight: 1001 },
      "The weight of the person should be in kg and it cannot exceed 1000",
    ],
  ])("%o throws upstream's message, a RangeError", (changed, message) => {
    expect(() => call({ ...valid, ...changed })).toThrow(
      new RangeError(message),
    );
  });

  // models/phs.py:300: int() truncates, so 100.7 and -0.5 pass the check.
  test("acclimatized is truncated before its check", () => {
    expect(call({ ...valid, acclimatized: 100.7 })).toEqual(call(valid));
    expect(call({ ...valid, acclimatized: -0.5 })).toEqual(
      call({ ...valid, acclimatized: 0 }),
    );
  });

  // Deviation phs-1 (decision 221).
  test.each([
    ["7933-2023", { t_cr: 37 }, 36.838196488160804],
    ["7933-2004", { t_cr: 37 }, 37.01191622717939],
    ["7933-2023", { a_p: 0.5 }, 36.79684583305136],
    ["7933-2004", { a_p: 0.5 }, 36.81841049350263],
  ])(
    "%s takes its own f_r, t_re and t_cr_eq where they are left out (%o)",
    (standard, changed, t_re) => {
      const result = call({
        ...valid,
        ...changed,
        standard,
        duration: 1,
        round_output: false,
      });
      expect(approx(result.t_re, t_re)).toBe(true);
    },
  );

  // Deviation phs-4.
  test("null for t_re or t_cr_eq throws TypeError", () => {
    for (const key of ["t_re", "t_cr_eq"])
      expect(() => call({ ...valid, [key]: null })).toThrow(
        new TypeError(`${key} must be a finite number.`),
      );
  });

  // Deviation phs-2, deviation phs-3.
  test.each([true, false])(
    "each bound broken gives a row, the edition's for p_a and met, with limit_inputs %s",
    (limit_inputs) => {
      const out = { tdb: 10, tr: 80, v: 4, rh: 0, met: 10, clo: 2 };
      const row = (key: string, value: number, bound: object): unknown =>
        expect.objectContaining({ key, value, bound });
      const result = call({ ...valid, ...out, limit_inputs });
      expect(result.warnings).toEqual([
        row("tdb", 10, PHS_INFO.inputs.tdb.applicability),
        row("tr - tdb", 70, PHS_INFO.derived["tr - tdb"].applicability),
        row("v", 4, PHS_INFO.inputs.v.applicability),
        row("p_a", 0, PHS_LIMITS_ISO_7933["7933-2023"].p_a),
        row("met", 581.5, PHS_LIMITS_ISO_7933["7933-2023"].met),
        row("clo", 2, PHS_INFO.inputs.clo.applicability),
      ]);
      expect(result.t_re === null).toBe(limit_inputs);
      const result_2004 = call({
        ...valid,
        ...out,
        standard: "7933-2004",
        limit_inputs,
      });
      expect(result_2004.warnings).toEqual([
        row("tdb", 10, PHS_INFO.inputs.tdb.applicability),
        row("tr - tdb", 70, PHS_INFO.derived["tr - tdb"].applicability),
        row("v", 4, PHS_INFO.inputs.v.applicability),
        row("met", 581.5, PHS_LIMITS_ISO_7933["7933-2004"].met),
        row("clo", 2, PHS_INFO.inputs.clo.applicability),
      ]);
    },
  );

  // Deviation phs-5, deviation phs-6.
  test("a zero divisor throws RangeError where upstream returns uninitialised memory", () => {
    for (const changed of [
      { i_mst: 0 },
      { height: 0 },
      { clo: 0, limit_inputs: false },
    ])
      expect(() => call({ ...valid, ...changed })).toThrow(
        new RangeError("division by zero"),
      );
    const masked = call({ ...valid, clo: 0 });
    expect(masked.t_re).toBe(null);
    expect(masked.warnings).toEqual([
      expect.objectContaining({ key: "clo", value: 0 }),
    ]);
  });

  // Deviation phs-7, deviation phs-8.
  test("a loop that has not converged after 1000 iterations throws", () => {
    for (const changed of [{ weight: 1e-300 }, { height: -1 }])
      expect(() => call({ ...valid, ...changed })).toThrow(
        new Error("Max iterations exceeded"),
      );
  });

  // models/phs.py:692: numba's range truncates a duration that is not whole.
  test("a duration that is not whole runs its whole minutes", () => {
    const run = (duration: number) =>
      call({ ...valid, duration, limit_inputs: false, round_output: false });
    expect(run(1.5).t_re).toBe(run(1).t_re);
    expect(run(1.5).d_lim_t_re).toBe(1.5);
    expect(run(2.5).t_re).toBe(run(2).t_re);
  });

  test("is exported from the package root as from its subpath", () => {
    expect(from_root).toBe(phs);
  });
});
