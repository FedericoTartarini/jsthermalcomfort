import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import {
  adaptive_ashrae,
  ADAPTIVE_ASHRAE_INFO,
  adaptive_en,
  ADAPTIVE_EN_INFO,
  ankle_draft,
  ANKLE_DRAFT_INFO,
  at,
  AT_INFO,
  clo_tout,
  CLO_TOUT_INFO,
  cooling_effect,
  COOLING_EFFECT_INFO,
  discomfort_index,
  DISCOMFORT_INDEX_INFO,
  esi,
  ESI_INFO,
  heat_index_lu,
  HEAT_INDEX_LU_INFO,
  heat_index_rothfusz,
  HEAT_INDEX_ROTHFUSZ_INFO,
  heat_index_schoen,
  HEAT_INDEX_SCHOEN_INFO,
  humidex,
  HUMIDEX_INFO,
  ireq,
  IREQ_INFO,
  net,
  NET_INFO,
  pet_steady,
  PET_STEADY_INFO,
  phs,
  PHS_INFO,
  pmv_a,
  PMV_A_INFO,
  pmv_athb,
  PMV_ATHB_INFO,
  pmv_e,
  PMV_E_INFO,
  pmv_ppd_ashrae,
  PMV_PPD_ASHRAE_INFO,
  pmv_ppd_iso,
  PMV_PPD_ISO_INFO,
  ridge_regression_predict_t_re_t_sk,
  RIDGE_REGRESSION_PREDICT_T_RE_T_SK_INFO,
  set_tmp,
  SET_TMP_INFO,
  solar_gain,
  SOLAR_GAIN_INFO,
  Sports,
  sports_heat_stress_risk,
  SPORTS_HEAT_STRESS_RISK_INFO,
  thi,
  THI_INFO,
  two_nodes_gagge,
  TWO_NODES_GAGGE_INFO,
  two_nodes_gagge_ji,
  TWO_NODES_GAGGE_JI_INFO,
  two_nodes_gagge_sleep,
  TWO_NODES_GAGGE_SLEEP_INFO,
  use_fans_heatwaves,
  USE_FANS_HEATWAVES_INFO,
  utci,
  UTCI_INFO,
  vertical_tmp_grad_ppd,
  VERTICAL_TMP_GRAD_PPD_INFO,
  wbgt,
  WBGT_INFO,
  wci,
  WCI_INFO,
  wind_chill_temperature,
  WIND_CHILL_TEMPERATURE_INFO,
  work_capacity_dunne,
  WORK_CAPACITY_DUNNE_INFO,
  work_capacity_hothaps,
  WORK_CAPACITY_HOTHAPS_INFO,
  work_capacity_iso,
  WORK_CAPACITY_ISO_INFO,
  work_capacity_niosh,
  WORK_CAPACITY_NIOSH_INFO,
} from "../src/models/index.ts";
import type { Row } from "./deviations/register.ts";
import {
  case_failures,
  check_header,
  compare_case,
  decode,
  DEFAULT_TOLERANCE,
  expected_warning_keys,
  exemptions,
  library_warning_key,
  parity_failures,
  read_pins,
  upstream_warning_key,
} from "./parity/harness.ts";
import type {
  CompareOptions,
  Header,
  ParityModel,
  RaisingCase,
  UpstreamCase,
} from "./parity/harness.ts";

// The parity suite compares each model with pinned pythermalcomfort on the
// seeded cases scripts/parity/generate.py commits (ADR 0020).
const root = fileURLToPath(new URL("..", import.meta.url));

const OPTIONS: CompareOptions = {
  rounded: [],
  tolerance: DEFAULT_TOLERANCE,
  warnings: true,
  exempt: { outputs: [], warnings: [], throws: [] },
  outputs: {},
};

// A range warning as _valid_range words it (_internal/validation.py:53-56).
const TDB_WARNING =
  "'tdb' has value 50.0 outside the applicability limits [10.0, 40.0] and will be set to NaN.";

function upstream(
  outputs: UpstreamCase["outputs"],
  messages: readonly string[] = [],
): UpstreamCase {
  return {
    inputs: { tdb: 25 },
    outputs,
    warnings: messages.map((message) => ({ category: "UserWarning", message })),
  };
}

describe("decode", () => {
  test("reads a tagged non-finite float", () => {
    expect(decode({ float: "nan" })).toBeNaN();
    expect(decode({ float: "inf" })).toBe(Infinity);
    expect(decode({ float: "-inf" })).toBe(-Infinity);
  });

  test("keeps every other value", () => {
    expect(decode(24.5)).toBe(24.5);
    expect(decode(true)).toBe(true);
    expect(decode("Neutral")).toBe("Neutral");
    expect(decode(null)).toBe(null);
  });
});

describe("upstream_warning_key", () => {
  test("reads _valid_range's param_name", () => {
    const message =
      "'tr - tdb' has value 50.0 outside the applicability limits [-70.0, 70.0] and will be set to NaN.";
    expect(upstream_warning_key({ category: "UserWarning", message })).toBe(
      "tr - tdb",
    );
  });

  test("reads the airspeed_control checks' v_param_name", () => {
    const message =
      "airspeed_control=False: 'vr' has value 0.3 exceeding 0.2 m/s when operative temperature is ≤ 23°C and will be set to NaN.";
    expect(upstream_warning_key({ category: "UserWarning", message })).toBe(
      "vr",
    );
  });

  test("keys any other UserWarning by its message", () => {
    const message = "Cooling effect could not be calculated. Returning 0.";
    expect(upstream_warning_key({ category: "UserWarning", message })).toBe(
      message,
    );
  });

  test("skips a warning of another category", () => {
    expect(
      upstream_warning_key({
        category: "RuntimeWarning",
        message: "invalid value encountered in sqrt",
      }),
    ).toBeUndefined();
  });

  // scipy/optimize/_minpack_py.py:181-188 (decision 281).
  test("keys scipy fsolve's RuntimeWarnings by their message", () => {
    for (const message of [
      "The number of calls to function has reached maxfev = 800.",
      "xtol=0.000000 is too small, no further improvement in the approximate\n solution is possible.",
      "The iteration is not making good progress, as measured by the \n improvement from the last five Jacobian evaluations.",
      "The iteration is not making good progress, as measured by the \n improvement from the last ten iterations.",
    ]) {
      expect(
        upstream_warning_key({ category: "RuntimeWarning", message }),
      ).toBe(message);
    }
  });
});

describe("library_warning_key", () => {
  test("keys a range row by its key and a notice by its message", () => {
    expect(library_warning_key({ kind: "range", key: "pa (kPa)" })).toBe(
      "pa (kPa)",
    );
    expect(
      library_warning_key({ kind: "notice", message: "Returning 0." }),
    ).toBe("Returning 0.");
  });
});

describe("compare_case", () => {
  test("passes equal values", () => {
    const expected = upstream({ t: 24.1, ok: true, label: "Neutral" });
    const actual = { t: 24.1, ok: true, label: "Neutral", warnings: [] };
    expect(compare_case(expected, actual, OPTIONS)).toEqual([]);
  });

  test("compares a rounded output exactly", () => {
    const options = { ...OPTIONS, rounded: ["t"] };
    expect(
      compare_case(
        upstream({ t: 24.1 }),
        // The double after 24.1, one ulp away.
        { t: 24.100000000000005, warnings: [] },
        options,
      ),
    ).toEqual(["output t: library 24.100000000000005, upstream 24.1"]);
  });

  test("compares an unrounded output within the tolerance", () => {
    const expected = upstream({ t: 24.1 });
    expect(
      compare_case(expected, { t: 24.1 + 1e-14, warnings: [] }, OPTIONS),
    ).toEqual([]);
    expect(
      compare_case(expected, { t: 24.1 + 1e-9, warnings: [] }, OPTIONS),
    ).toEqual([
      "output t: library 24.100000001, upstream 24.1, beyond rel 1e-12 + abs 1e-12",
    ]);
  });

  // A time series output (decision 269).
  test("compares a series element by element, reporting its first difference", () => {
    const expected = upstream({ t: [24.1, { float: "nan" }, 24.3] });
    const options: CompareOptions = {
      ...OPTIONS,
      outputs: {
        t: { kind: "numeric", nullable: true, series: true, unit: "°C" },
      },
    };
    expect(
      compare_case(expected, { t: [24.1, null, 24.3], warnings: [] }, options),
    ).toEqual([]);
    expect(
      compare_case(expected, { t: [24.1, 24.2, 24.4], warnings: [] }, options),
    ).toEqual(["output t[1]: library 24.2, upstream NaN as null"]);
    expect(
      compare_case(expected, { t: [24.1, null], warnings: [] }, options),
    ).toEqual(["output t: library length 2, upstream length 3"]);
    expect(compare_case(expected, { t: 24.1, warnings: [] }, options)).toEqual([
      "output t: library 24.1, upstream length 3",
    ]);
  });

  test("lets the abs term cover an output near zero", () => {
    expect(
      compare_case(upstream({ t: 0 }), { t: 1e-13, warnings: [] }, OPTIONS),
    ).toEqual([]);
  });

  // Upstream's NaN is the library's null, in an output declared nullable
  // (decisions 310, 327).
  test("checks NaN positions both ways", () => {
    const options: CompareOptions = {
      ...OPTIONS,
      outputs: { t: { kind: "numeric", nullable: true, unit: "°C" } },
    };
    expect(
      compare_case(
        upstream({ t: { float: "nan" } }),
        { t: null, warnings: [] },
        options,
      ),
    ).toEqual([]);
    expect(
      compare_case(
        upstream({ t: { float: "nan" } }),
        { t: 24, warnings: [] },
        options,
      ),
    ).toEqual(["output t: library 24, upstream NaN as null"]);
    expect(
      compare_case(upstream({ t: 24 }), { t: NaN, warnings: [] }, OPTIONS),
    ).toEqual(["output t: library NaN, upstream 24"]);
  });

  test("never takes a boolean for NaN", () => {
    expect(
      compare_case(upstream({ ok: false }), { ok: NaN, warnings: [] }, OPTIONS),
    ).toEqual(["output ok: library NaN, upstream false"]);
    expect(
      compare_case(
        upstream({ ok: { float: "nan" } }),
        { ok: false, warnings: [] },
        {
          ...OPTIONS,
          outputs: { ok: { kind: "numeric", nullable: true, unit: null } },
        },
      ),
    ).toEqual(["output ok: library false, upstream NaN as null"]);
  });

  test("compares booleans and strings exactly", () => {
    expect(
      compare_case(
        upstream({ ok: true, label: "Neutral" }),
        { ok: false, label: "Cool", warnings: [] },
        OPTIONS,
      ),
    ).toEqual([
      "output ok: library false, upstream true",
      'output label: library "Cool", upstream "Neutral"',
    ]);
  });

  test("never passes a number for a boolean", () => {
    expect(
      compare_case(upstream({ ok: true }), { ok: 1, warnings: [] }, OPTIONS),
    ).toEqual(["output ok: library 1, upstream true"]);
  });

  test("names an upstream output the library lacks, and ignores added ones", () => {
    expect(
      compare_case(
        upstream({ t: 24 }),
        { category: "x", warnings: [] },
        OPTIONS,
      ),
    ).toEqual(["output t: missing from the library's result"]);
  });

  test("compares warning keys as a multiset", () => {
    const tr =
      "'tr' has value 50.0 outside the applicability limits [10.0, 40.0] and will be set to NaN.";
    const rows = [
      { kind: "range", key: "tr" },
      { kind: "range", key: "tdb" },
    ];
    expect(
      compare_case(
        upstream({}, [TDB_WARNING, tr]),
        { warnings: rows },
        OPTIONS,
      ),
    ).toEqual([]);
    expect(
      compare_case(
        upstream({}, [TDB_WARNING, TDB_WARNING]),
        { warnings: rows },
        OPTIONS,
      ),
    ).toEqual(['warnings: library ["tdb","tr"], upstream ["tdb","tdb"]']);
  });

  // The library's range rows come whatever limit_inputs is (ADR 0024).
  test("compares a gate-off case with the gate's range warnings", () => {
    const off: UpstreamCase = {
      ...upstream({}, []),
      gated_warnings: [{ category: "UserWarning", message: TDB_WARNING }],
    };
    expect(
      compare_case(off, { warnings: [{ kind: "range", key: "tdb" }] }, OPTIONS),
    ).toEqual([]);
    expect(compare_case(off, { warnings: [] }, OPTIONS)).toEqual([
      'warnings: library [], upstream ["tdb"]',
    ]);
  });

  test("takes a gate-off case's other warnings from the case itself", () => {
    const notice = "Cooling effect could not be calculated. Returning 0.";
    const off: UpstreamCase = {
      ...upstream({}, [notice]),
      gated_warnings: [
        { category: "UserWarning", message: TDB_WARNING },
        { category: "UserWarning", message: notice },
        { category: "UserWarning", message: notice },
      ],
    };
    expect(expected_warning_keys(off)).toEqual(["tdb", notice]);
    expect(expected_warning_keys(upstream({}, [TDB_WARNING, notice]))).toEqual([
      "tdb",
      notice,
    ]);
  });

  test("leaves out the warnings of numpy's otypes run", () => {
    const slow =
      "The iteration is not making good progress, as measured by the \n improvement from the last ten iterations.";
    const expected: UpstreamCase = {
      ...upstream({}, []),
      warnings: [
        { category: "RuntimeWarning", message: slow },
        { category: "RuntimeWarning", message: slow },
      ],
      otypes_warnings: 1,
    };
    expect(expected_warning_keys(expected)).toEqual([slow]);
  });

  test("ignores warnings of other categories", () => {
    const expected: UpstreamCase = {
      inputs: {},
      outputs: {},
      warnings: [{ category: "RuntimeWarning", message: "overflow" }],
    };
    expect(compare_case(expected, { warnings: [] }, OPTIONS)).toEqual([]);
  });

  test("skips warnings when the model does not compare them", () => {
    expect(
      compare_case(
        upstream({}, [TDB_WARNING]),
        { warnings: [] },
        { ...OPTIONS, warnings: false },
      ),
    ).toEqual([]);
  });

  test("exempts registered outputs and warning keys", () => {
    const options = {
      ...OPTIONS,
      exempt: { outputs: ["t"], warnings: ["tdb"], throws: [] },
    };
    expect(
      compare_case(
        upstream({ t: 24 }, [TDB_WARNING]),
        {
          t: 30,
          warnings: [
            { kind: "notice", message: "x" },
            { kind: "range", key: "tdb" },
          ],
        },
        options,
      ),
    ).toEqual(['warnings: library ["x"], upstream []']);
  });
});

const RAISING: RaisingCase = {
  inputs: { rh: 101 },
  raises: {
    type: "ValueError",
    message: "Relative humidity must be between 0 and 100 %",
  },
};

function throws(message: string): () => never {
  return () => {
    throw new RangeError(message);
  };
}

describe("case_failures", () => {
  test("passes a case upstream raises for where the library throws", () => {
    expect(case_failures(RAISING, throws("other words"), OPTIONS)).toEqual([]);
  });

  test("fails a case upstream raises for where the library returns", () => {
    expect(case_failures(RAISING, () => ({ thi: 30 }), OPTIONS)).toEqual([
      "library returned, upstream raised ValueError: Relative humidity must be between 0 and 100 %",
    ]);
  });

  test("fails a case upstream returns for where the library throws", () => {
    expect(
      case_failures(upstream({ t: 24 }), throws("division by zero"), OPTIONS),
    ).toEqual([
      "library threw RangeError: division by zero, upstream returned",
    ]);
  });

  test("exempts a throw a register row names, by its message", () => {
    const options = {
      ...OPTIONS,
      exempt: { ...OPTIONS.exempt, throws: ["division by zero"] },
    };
    expect(
      case_failures(upstream({ t: 24 }), throws("division by zero"), options),
    ).toEqual([]);
  });
});

function row(file: string, outputs: string[], warnings: string[]): Row {
  return {
    file,
    line: 7,
    id: "x-1",
    part: "output",
    upstream_site: "none",
    ts_file: "src/x.ts",
    ts_symbol: "x",
    reason: "why",
    class_adr: "none",
    status: "approved",
    doubtful: false,
    date: "2026-10-26",
    parity: { outputs, warnings, throws: [] },
  };
}

describe("exemptions", () => {
  test("takes the model's register and the shared one, nothing else", () => {
    const rows = [
      row("docs/deviations/utci.md", ["utci"], []),
      row("docs/deviations/_shared.md", [], ["tdb"]),
      row("docs/deviations/phs.md", ["t_re"], ["p_a"]),
      row("docs/deviations/utci.md", [], ["tr - tdb"]),
    ];
    expect(exemptions(rows, "utci")).toEqual({
      outputs: ["utci"],
      warnings: ["tdb", "tr - tdb"],
      throws: [],
    });
  });
});

const PINS = {
  python: "3.12.15",
  packages: { numpy: "2.5.4", pythermalcomfort: "4.8.0" },
};

function header(overrides: Partial<Header> = {}): Header {
  return {
    machine: "x86_64",
    python: "3.12.15",
    packages: PINS.packages,
    environment: {
      NUMBA_CPU_NAME: "generic",
      NPY_DISABLE_CPU_FEATURES: "X86_V3",
    },
    numpy_runtime: {},
    seed: 1,
    ...overrides,
  };
}

describe("check_header", () => {
  test("passes data generated on the pinned platform", () => {
    expect(check_header(header(), PINS)).toEqual([]);
  });

  test("fails data generated on another machine or versions", () => {
    expect(
      check_header(
        header({
          machine: "arm64",
          python: "3.13.1",
          packages: { numpy: "2.4.0", scipy: "1.18.1" },
        }),
        PINS,
      ),
    ).toEqual([
      'header: machine "arm64", expected "x86_64"',
      'header: python "3.13.1", expected the pinned "3.12.15"',
      'header: numpy "2.4.0", expected the pinned "2.5.4"',
      'header: pythermalcomfort missing, expected the pinned "4.8.0"',
      'header: scipy "1.18.1" is not pinned',
    ]);
  });
});

describe("read_pins", () => {
  test("reads the Python pin and the locked versions", () => {
    const pins = read_pins(root);
    expect(pins.python).toMatch(/^3\.12\.\d+$/);
    expect(pins.packages).toMatchObject({
      pythermalcomfort: "4.8.0",
      scipy: "1.18.1",
    });
  });
});

// Every model the parity data cover, called through its subpath index.
const MODELS: readonly ParityModel[] = [
  {
    name: "adaptive_ashrae",
    info: ADAPTIVE_ASHRAE_INFO,
    run: (inputs) =>
      adaptive_ashrae(
        inputs as unknown as Parameters<typeof adaptive_ashrae>[0],
      ),
    // Upstream rounds the five temperatures with np.around after converting
    // them under IP (models/adaptive_ashrae.py:177-183).
    rounded: ({ round_output }) =>
      round_output === true
        ? Object.entries(ADAPTIVE_ASHRAE_INFO.outputs)
            .filter(([, { kind }]) => kind === "numeric")
            .map(([name]) => name)
        : [],
    warnings: true,
  },
  {
    name: "adaptive_en",
    info: ADAPTIVE_EN_INFO,
    run: (inputs) =>
      adaptive_en(inputs as unknown as Parameters<typeof adaptive_en>[0]),
    // Upstream rounds t_cmf and the bounds with np.around after converting
    // them under IP (models/adaptive_en.py:143-165).
    rounded: ({ round_output }) =>
      round_output === true
        ? Object.entries(ADAPTIVE_EN_INFO.outputs)
            .filter(([, { kind }]) => kind === "numeric")
            .map(([name]) => name)
        : [],
    warnings: true,
  },
  {
    name: "ankle_draft",
    info: ANKLE_DRAFT_INFO,
    run: (inputs) =>
      ankle_draft(inputs as unknown as Parameters<typeof ankle_draft>[0]),
    // Upstream always rounds ppd_ad with np.around (models/ankle_draft.py:131-136).
    rounded: () => ["ppd_ad"],
    // The cooling effect's notice, which upstream emits twice, is exempt by the
    // register (deviation ankle_draft-5).
    warnings: true,
  },
  {
    name: "at",
    info: AT_INFO,
    run: (inputs) => at(inputs as unknown as Parameters<typeof at>[0]),
    // Upstream rounds at with np.around (models/at.py:77-78).
    rounded: ({ round_output }) => (round_output === true ? ["at"] : []),
    warnings: true,
  },
  {
    name: "clo_tout",
    info: CLO_TOUT_INFO,
    run: (inputs) =>
      clo_tout(inputs as unknown as Parameters<typeof clo_tout>[0]),
    // Upstream rounds clo_tout with np.around (models/clo_tout.py:80).
    rounded: () => ["clo_tout"],
    warnings: true,
  },
  {
    name: "cooling_effect",
    info: COOLING_EFFECT_INFO,
    run: (inputs) =>
      cooling_effect(inputs as unknown as Parameters<typeof cooling_effect>[0]),
    // Upstream always rounds ce with np.around (models/cooling_effect.py:157).
    rounded: () => ["ce"],
    warnings: true,
  },
  {
    name: "discomfort_index",
    info: DISCOMFORT_INDEX_INFO,
    run: (inputs) =>
      discomfort_index(
        inputs as unknown as Parameters<typeof discomfort_index>[0],
      ),
    // Upstream always rounds di with np.around (models/discomfort_index.py:83).
    rounded: () => ["di"],
    warnings: true,
  },
  {
    name: "esi",
    info: ESI_INFO,
    run: (inputs) => esi(inputs as unknown as Parameters<typeof esi>[0]),
    // Upstream rounds esi with np.round (models/esi.py:65-66).
    rounded: ({ round_output }) => (round_output === true ? ["esi"] : []),
    warnings: true,
  },
  {
    name: "heat_index_lu",
    info: HEAT_INDEX_LU_INFO,
    run: (inputs) =>
      heat_index_lu(inputs as unknown as Parameters<typeof heat_index_lu>[0]),
    // Upstream rounds hi with np.around (models/heat_index_lu.py:60-61).
    rounded: ({ round_output }) => (round_output === true ? ["hi"] : []),
    warnings: true,
  },
  {
    name: "heat_index_rothfusz",
    info: HEAT_INDEX_ROTHFUSZ_INFO,
    run: (inputs) =>
      heat_index_rothfusz(
        inputs as unknown as Parameters<typeof heat_index_rothfusz>[0],
      ),
    // Upstream rounds hi with np.around (heat_index_rothfusz.py:85).
    rounded: ({ round_output }) => (round_output === true ? ["hi"] : []),
    warnings: true,
  },
  {
    name: "heat_index_schoen",
    info: HEAT_INDEX_SCHOEN_INFO,
    run: (inputs) =>
      heat_index_schoen(
        inputs as unknown as Parameters<typeof heat_index_schoen>[0],
      ),
    // Upstream rounds hi with np.around (models/heat_index_schoen.py:72-73).
    rounded: ({ round_output }) => (round_output === true ? ["hi"] : []),
    warnings: true,
  },
  {
    name: "humidex",
    info: HUMIDEX_INFO,
    run: (inputs) =>
      humidex(inputs as unknown as Parameters<typeof humidex>[0]),
    // Upstream rounds humidex with np.around (models/humidex.py:88-89).
    rounded: ({ round_output }) => (round_output === true ? ["humidex"] : []),
    warnings: true,
  },
  {
    name: "ireq",
    info: IREQ_INFO,
    run: (inputs) => ireq(inputs as unknown as Parameters<typeof ireq>[0]),
    // Upstream rounds ireq and icl with np.round, and dle with np.round in
    // _format_dle (models/ireq.py:174-178, :435-436).
    rounded: ({ round_output }) =>
      round_output === true
        ? [
            "ireq_min",
            "ireq_neutral",
            "icl_min",
            "icl_neutral",
            "dle_min",
            "dle_neutral",
          ]
        : [],
    // Upstream warns for none of its checks, so the rows are exempt by the
    // register (deviation ireq-2).
    warnings: true,
  },
  {
    name: "net",
    info: NET_INFO,
    run: (inputs) => net(inputs as unknown as Parameters<typeof net>[0]),
    // Upstream rounds net with np.around (models/net.py:77-78).
    rounded: ({ round_output }) => (round_output === true ? ["net"] : []),
    warnings: true,
  },
  {
    name: "pet_steady",
    info: PET_STEADY_INFO,
    run: (inputs) =>
      pet_steady(inputs as unknown as Parameters<typeof pet_steady>[0]),
    // Upstream rounds pet with round() on an np.float64, numpy's rounding
    // (models/pet_steady.py:475).
    rounded: () => ["pet"],
    warnings: true,
  },
  {
    name: "phs",
    info: PHS_INFO,
    // Upstream's `model` is the library's `standard` (ADR 0019, whitelist item 3).
    run: ({ model, ...inputs }) =>
      phs({ ...inputs, standard: model } as unknown as Parameters<
        typeof phs
      >[0]),
    // Upstream rounds every output with np.around (models/phs.py:448-453).
    rounded: ({ round_output }) =>
      round_output === true ? Object.keys(PHS_INFO.outputs) : [],
    // V8's Math.exp differs from glibc's exp by an ulp on some arguments, and
    // the kernel's convergence tests carry it to 3.3e-9 relative over 480
    // minutes (the register's Notes).
    tolerance: { rel: 1e-8, abs: 1e-12 },
    warnings: true,
  },
  {
    name: "pmv_a",
    info: PMV_A_INFO,
    run: (inputs) => pmv_a(inputs as unknown as Parameters<typeof pmv_a>[0]),
    // Upstream rounds a_pmv with np.around (models/pmv_a.py:132).
    rounded: () => ["a_pmv"],
    warnings: true,
  },
  {
    name: "pmv_athb",
    info: PMV_ATHB_INFO,
    run: (inputs) =>
      pmv_athb(inputs as unknown as Parameters<typeof pmv_athb>[0]),
    // Upstream rounds athb_pmv with np.around (models/pmv_athb.py:115-124).
    rounded: () => ["athb_pmv"],
    warnings: true,
  },
  {
    name: "pmv_e",
    info: PMV_E_INFO,
    run: (inputs) => pmv_e(inputs as unknown as Parameters<typeof pmv_e>[0]),
    // Upstream rounds e_pmv with np.around (models/pmv_e.py:147).
    rounded: () => ["e_pmv"],
    warnings: true,
  },
  {
    name: "pmv_ppd_ashrae",
    info: PMV_PPD_ASHRAE_INFO,
    // Upstream's `model` is the library's `standard` (ADR 0019, whitelist item 3).
    run: ({ model, ...inputs }) =>
      pmv_ppd_ashrae({ ...inputs, standard: model } as unknown as Parameters<
        typeof pmv_ppd_ashrae
      >[0]),
    // Upstream rounds pmv and ppd with np.round (models/pmv_ppd_ashrae.py:239-241).
    rounded: ({ round_output }) =>
      round_output === true ? ["pmv", "ppd"] : [],
    // The cooling effect's notice, which upstream emits twice, is exempt by
    // the register (deviation pmv_ppd_ashrae-4).
    warnings: true,
  },
  {
    name: "pmv_ppd_iso",
    info: PMV_PPD_ISO_INFO,
    // Upstream's `model` is the library's `standard` (ADR 0019, whitelist item 3).
    run: ({ model, ...inputs }) =>
      pmv_ppd_iso({ ...inputs, standard: model } as unknown as Parameters<
        typeof pmv_ppd_iso
      >[0]),
    // Upstream rounds pmv and ppd with np.round (models/pmv_ppd_iso.py:219-221).
    rounded: ({ round_output }) =>
      round_output === true ? ["pmv", "ppd"] : [],
    warnings: true,
  },
  {
    name: "ridge_regression_predict_t_re_t_sk",
    info: RIDGE_REGRESSION_PREDICT_T_RE_T_SK_INFO,
    run: (inputs) =>
      ridge_regression_predict_t_re_t_sk(
        inputs as unknown as Parameters<
          typeof ridge_regression_predict_t_re_t_sk
        >[0],
      ),
    // Upstream rounds both series with np.round
    // (models/ridge_regression_predict_t_re_t_sk.py:455-457).
    rounded: ({ round_output }) =>
      round_output === true ? ["t_re", "t_sk"] : [],
    warnings: true,
  },
  {
    name: "set_tmp",
    info: SET_TMP_INFO,
    run: (inputs) =>
      set_tmp(inputs as unknown as Parameters<typeof set_tmp>[0]),
    // Upstream rounds set with np.around (models/set_tmp.py:153-154).
    rounded: ({ round_output }) => (round_output === true ? ["set"] : []),
    warnings: true,
  },
  {
    name: "solar_gain",
    info: SOLAR_GAIN_INFO,
    run: (inputs) =>
      solar_gain(inputs as unknown as Parameters<typeof solar_gain>[0]),
    // Upstream rounds erf and delta_mrt with np.round (models/solar_gain.py:255-257).
    rounded: ({ round_output }) =>
      round_output === true ? ["erf", "delta_mrt"] : [],
    // ASHRAE 55 Table C-2's rows, which upstream does not check, are exempt
    // by the register (deviation solar_gain-3, deviation solar_gain-4).
    warnings: true,
  },
  {
    name: "sports_heat_stress_risk",
    info: SPORTS_HEAT_STRESS_RISK_INFO,
    // The generator names sport by its attribute in Sports (_sports_by_name).
    run: (inputs) =>
      sports_heat_stress_risk({
        ...(inputs as unknown as Parameters<typeof sports_heat_stress_risk>[0]),
        sport: Sports[inputs.sport as keyof typeof Sports],
      }),
    // Upstream floors the risk level to one decimal and rounds the thresholds
    // with Python's round (models/sports_heat_stress_risk.py:425-437).
    rounded: () => [
      "risk_level_interpolated",
      "t_medium",
      "t_high",
      "t_extreme",
    ],
    warnings: true,
  },
  {
    name: "thi",
    info: THI_INFO,
    run: (inputs) => thi(inputs as unknown as Parameters<typeof thi>[0]),
    // Upstream rounds thi with np.round (models/thi.py:46-47).
    rounded: ({ round_output }) => (round_output === true ? ["thi"] : []),
    warnings: true,
  },
  {
    name: "two_nodes_gagge",
    info: TWO_NODES_GAGGE_INFO,
    run: (inputs) =>
      two_nodes_gagge(
        inputs as unknown as Parameters<typeof two_nodes_gagge>[0],
      ),
    // Upstream rounds every output with np.around (models/two_nodes_gagge.py:205-207),
    // but not the SET that calculate_ce returns (:146).
    rounded: ({ round_output, calculate_ce }) =>
      round_output === true && calculate_ce !== true
        ? Object.keys(TWO_NODES_GAGGE_INFO.outputs)
        : [],
    warnings: true,
  },
  {
    name: "two_nodes_gagge_ji",
    info: TWO_NODES_GAGGE_JI_INFO,
    run: (inputs) =>
      two_nodes_gagge_ji(
        inputs as unknown as Parameters<typeof two_nodes_gagge_ji>[0],
      ),
    // Upstream rounds neither series (models/two_nodes_gagge_ji.py:215).
    rounded: () => [],
    warnings: true,
  },
  {
    name: "two_nodes_gagge_sleep",
    info: TWO_NODES_GAGGE_SLEEP_INFO,
    run: (inputs) =>
      two_nodes_gagge_sleep(
        inputs as unknown as Parameters<typeof two_nodes_gagge_sleep>[0],
      ),
    // Upstream rounds no output (models/two_nodes_gagge_sleep.py:165-170).
    rounded: () => [],
    warnings: true,
  },
  {
    name: "use_fans_heatwaves",
    info: USE_FANS_HEATWAVES_INFO,
    run: (inputs) =>
      use_fans_heatwaves(
        inputs as unknown as Parameters<typeof use_fans_heatwaves>[0],
      ),
    // Upstream rounds every output with np.around (models/use_fans_heatwaves.py:197-198).
    rounded: ({ round_output }) =>
      round_output === true ? Object.keys(USE_FANS_HEATWAVES_INFO.outputs) : [],
    warnings: true,
  },
  {
    name: "utci",
    info: UTCI_INFO,
    run: (inputs) => utci(inputs as unknown as Parameters<typeof utci>[0]),
    // Upstream rounds utci with np.round (models/utci.py:177-179).
    rounded: ({ round_output }) => (round_output === true ? ["utci"] : []),
    warnings: true,
  },
  {
    name: "vertical_tmp_grad_ppd",
    info: VERTICAL_TMP_GRAD_PPD_INFO,
    run: (inputs) =>
      vertical_tmp_grad_ppd(
        inputs as unknown as Parameters<typeof vertical_tmp_grad_ppd>[0],
      ),
    // Upstream rounds ppd_vg with np.round (models/vertical_tmp_grad_ppd.py:131-132).
    rounded: ({ round_output }) => (round_output === true ? ["ppd_vg"] : []),
    // The cooling effect's notice, which upstream emits twice, is exempt by the
    // register (deviation vertical_tmp_grad_ppd-5).
    warnings: true,
  },
  {
    name: "wbgt",
    info: WBGT_INFO,
    run: (inputs) => wbgt(inputs as unknown as Parameters<typeof wbgt>[0]),
    // Upstream rounds wbgt with np.round (models/wbgt.py:90-91).
    rounded: ({ round_output }) => (round_output === true ? ["wbgt"] : []),
    warnings: true,
  },
  {
    name: "wci",
    info: WCI_INFO,
    run: (inputs) => wci(inputs as unknown as Parameters<typeof wci>[0]),
    // Upstream rounds wci with np.around (models/wci.py:73-74).
    rounded: ({ round_output }) => (round_output === true ? ["wci"] : []),
    warnings: true,
  },
  {
    name: "wind_chill_temperature",
    info: WIND_CHILL_TEMPERATURE_INFO,
    run: (inputs) =>
      wind_chill_temperature(
        inputs as unknown as Parameters<typeof wind_chill_temperature>[0],
      ),
    // Upstream rounds wct with np.around (models/wind_chill_temperature.py:61-62).
    rounded: ({ round_output }) => (round_output === true ? ["wct"] : []),
    warnings: true,
  },
  {
    name: "work_capacity_dunne",
    info: WORK_CAPACITY_DUNNE_INFO,
    run: (inputs) =>
      work_capacity_dunne(
        inputs as unknown as Parameters<typeof work_capacity_dunne>[0],
      ),
    // Upstream rounds nothing (models/work_capacity_dunne.py:58-68).
    rounded: () => [],
    warnings: true,
  },
  {
    name: "work_capacity_hothaps",
    info: WORK_CAPACITY_HOTHAPS_INFO,
    run: (inputs) =>
      work_capacity_hothaps(
        inputs as unknown as Parameters<typeof work_capacity_hothaps>[0],
      ),
    // Upstream rounds nothing (models/work_capacity_hothaps.py:76-85).
    rounded: () => [],
    warnings: true,
  },
  {
    name: "work_capacity_iso",
    info: WORK_CAPACITY_ISO_INFO,
    run: (inputs) =>
      work_capacity_iso(
        inputs as unknown as Parameters<typeof work_capacity_iso>[0],
      ),
    // Upstream rounds nothing (models/work_capacity_iso.py:48-58).
    rounded: () => [],
    warnings: true,
  },
  {
    name: "work_capacity_niosh",
    info: WORK_CAPACITY_NIOSH_INFO,
    run: (inputs) =>
      work_capacity_niosh(
        inputs as unknown as Parameters<typeof work_capacity_niosh>[0],
      ),
    // Upstream rounds nothing (models/work_capacity_niosh.py:48-58).
    rounded: () => [],
    warnings: true,
  },
];

describe("parity with pythermalcomfort", () => {
  test.each(MODELS)("$name", (model) => {
    const failures = parity_failures(root, model);
    expect({ count: failures.length, first: failures.slice(0, 20) }).toEqual({
      count: 0,
      first: [],
    });
  });
});
