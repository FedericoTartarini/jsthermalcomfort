import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import {
  adaptive_ashrae,
  ankle_draft,
  clo_tout,
  cooling_effect,
  heat_index_rothfusz,
  phs,
  PHS_INFO,
  pmv_ppd_ashrae,
  pmv_ppd_iso,
  solar_gain,
  two_nodes_gagge,
  TWO_NODES_GAGGE_INFO,
  use_fans_heatwaves,
  USE_FANS_HEATWAVES_INFO,
  utci,
  vertical_tmp_grad_ppd,
} from "../src/models/index.ts";
import type { Row } from "./deviations/register.ts";
import {
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
  UpstreamCase,
} from "./parity/harness.ts";

// The parity suite compares each model with pinned pythermalcomfort on the
// seeded cases scripts/parity/generate.py commits (ADR 0020).
const root = fileURLToPath(new URL("..", import.meta.url));

const OPTIONS: CompareOptions = {
  rounded: [],
  tolerance: DEFAULT_TOLERANCE,
  warnings: true,
  exempt: { outputs: [], warnings: [] },
};

// A range warning as _valid_range words it (_internal/validation.py:51-54).
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

  test("lets the abs term cover an output near zero", () => {
    expect(
      compare_case(upstream({ t: 0 }), { t: 1e-13, warnings: [] }, OPTIONS),
    ).toEqual([]);
  });

  test("checks NaN positions both ways", () => {
    expect(
      compare_case(
        upstream({ t: { float: "nan" } }),
        { t: NaN, warnings: [] },
        OPTIONS,
      ),
    ).toEqual([]);
    expect(
      compare_case(
        upstream({ t: { float: "nan" } }),
        { t: 24, warnings: [] },
        OPTIONS,
      ),
    ).toEqual(["output t: library 24, upstream NaN"]);
    expect(
      compare_case(upstream({ t: 24 }), { t: NaN, warnings: [] }, OPTIONS),
    ).toEqual(["output t: library NaN, upstream 24"]);
  });

  test("checks a masked boolean's NaN", () => {
    expect(
      compare_case(
        upstream({ ok: { float: "nan" } }),
        { ok: NaN, warnings: [] },
        OPTIONS,
      ),
    ).toEqual([]);
    expect(
      compare_case(
        upstream({ ok: { float: "nan" } }),
        { ok: false, warnings: [] },
        OPTIONS,
      ),
    ).toEqual(["output ok: library false, upstream NaN"]);
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
      exempt: { outputs: ["t"], warnings: ["tdb"] },
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
    parity: { outputs, warnings },
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
    });
  });
});

const PINS = {
  python: "3.12.15",
  packages: { numpy: "2.5.4", pythermalcomfort: "4.7.0" },
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
      'header: pythermalcomfort missing, expected the pinned "4.7.0"',
      'header: scipy "1.18.1" is not pinned',
    ]);
  });
});

describe("read_pins", () => {
  test("reads the Python pin and the locked versions", () => {
    const pins = read_pins(root);
    expect(pins.python).toMatch(/^3\.12\.\d+$/);
    expect(pins.packages).toMatchObject({
      pythermalcomfort: "4.7.0",
      scipy: "1.18.1",
    });
  });
});

// Every model the parity data cover, called through its subpath index.
const MODELS: readonly ParityModel[] = [
  {
    name: "adaptive_ashrae",
    run: (inputs) =>
      adaptive_ashrae(
        inputs as unknown as Parameters<typeof adaptive_ashrae>[0],
      ),
    // Upstream rounds t_cmf in SI before deriving the bounds
    // (adaptive_ashrae.py:147-148), and converts it afterwards under IP.
    rounded: ({ units, round_output }) =>
      round_output === true && String(units).toUpperCase() === "SI"
        ? ["tmp_cmf"]
        : [],
    warnings: true,
  },
  {
    name: "ankle_draft",
    run: (inputs) =>
      ankle_draft(inputs as unknown as Parameters<typeof ankle_draft>[0]),
    // Upstream always rounds ppd_ad with np.around (models/ankle_draft.py:130-135).
    rounded: () => ["ppd_ad"],
    // acceptability, a boolean where upstream's is 1.0 or 0.0, and the cooling
    // effect's notice, which upstream emits twice, are exempt by the register
    // (deviation ankle_draft-5, deviation ankle_draft-6).
    warnings: true,
  },
  {
    name: "clo_tout",
    run: (inputs) =>
      clo_tout(inputs as unknown as Parameters<typeof clo_tout>[0]),
    // Upstream rounds clo_tout with np.around (models/clo_tout.py:79).
    rounded: () => ["clo_tout"],
    warnings: true,
  },
  {
    name: "cooling_effect",
    run: (inputs) =>
      cooling_effect(inputs as unknown as Parameters<typeof cooling_effect>[0]),
    // Upstream always rounds ce with np.around (models/cooling_effect.py:157).
    rounded: () => ["ce"],
    warnings: true,
  },
  {
    name: "heat_index_rothfusz",
    run: (inputs) =>
      heat_index_rothfusz(
        inputs as unknown as Parameters<typeof heat_index_rothfusz>[0],
      ),
    // Upstream rounds hi with np.around (heat_index_rothfusz.py:87).
    rounded: ({ round_output }) => (round_output === true ? ["hi"] : []),
    warnings: true,
  },
  {
    name: "phs",
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
    name: "pmv_ppd_ashrae",
    // Upstream's `model` is the library's `standard` (ADR 0019, whitelist item 3).
    run: ({ model, ...inputs }) =>
      pmv_ppd_ashrae({ ...inputs, standard: model } as unknown as Parameters<
        typeof pmv_ppd_ashrae
      >[0]),
    // Upstream rounds pmv and ppd with np.round (models/pmv_ppd_ashrae.py:223-225).
    rounded: ({ round_output }) =>
      round_output === true ? ["pmv", "ppd"] : [],
    // The cooling effect's notice, which upstream emits twice, is exempt by
    // the register (deviation pmv_ppd_ashrae-4).
    warnings: true,
  },
  {
    name: "pmv_ppd_iso",
    // Upstream's `model` is the library's `standard` (ADR 0019, whitelist item 3).
    run: ({ model, ...inputs }) =>
      pmv_ppd_iso({ ...inputs, standard: model } as unknown as Parameters<
        typeof pmv_ppd_iso
      >[0]),
    // Upstream rounds pmv and ppd with np.round (models/pmv_ppd_iso.py:205-207).
    rounded: ({ round_output }) =>
      round_output === true ? ["pmv", "ppd"] : [],
    warnings: true,
  },
  {
    name: "solar_gain",
    run: (inputs) =>
      solar_gain(inputs as unknown as Parameters<typeof solar_gain>[0]),
    // Upstream rounds erf and delta_mrt with np.round (models/solar_gain.py:252-254).
    rounded: ({ round_output }) =>
      round_output === true ? ["erf", "delta_mrt"] : [],
    // ASHRAE 55 Table C-2's rows, which upstream does not check, are exempt
    // by the register (deviation solar_gain-3, deviation solar_gain-4).
    warnings: true,
  },
  {
    name: "two_nodes_gagge",
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
    name: "use_fans_heatwaves",
    run: (inputs) =>
      use_fans_heatwaves(
        inputs as unknown as Parameters<typeof use_fans_heatwaves>[0],
      ),
    // Upstream rounds every output with np.around (models/use_fans_heatwaves.py:197-198).
    rounded: ({ round_output }) =>
      round_output === true ? Object.keys(USE_FANS_HEATWAVES_INFO.outputs) : [],
    // The four heat_strain flags, booleans where upstream's are 1.0 or 0.0, are
    // exempt by the register (deviation use_fans_heatwaves-5).
    warnings: true,
  },
  {
    name: "utci",
    run: (inputs) => utci(inputs as unknown as Parameters<typeof utci>[0]),
    // Upstream rounds utci with np.round (models/utci.py:173-175).
    rounded: ({ round_output }) => (round_output === true ? ["utci"] : []),
    warnings: true,
  },
  {
    name: "vertical_tmp_grad_ppd",
    run: (inputs) =>
      vertical_tmp_grad_ppd(
        inputs as unknown as Parameters<typeof vertical_tmp_grad_ppd>[0],
      ),
    // Upstream rounds ppd_vg with np.round (models/vertical_tmp_grad_ppd.py:130-131).
    rounded: ({ round_output }) => (round_output === true ? ["ppd_vg"] : []),
    // acceptability, a boolean where upstream's is 1.0 or 0.0, and the cooling
    // effect's notice, which upstream emits twice, are exempt by the register
    // (deviation vertical_tmp_grad_ppd-5, deviation vertical_tmp_grad_ppd-6).
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
