import { afterEach, describe, expect, jest, test } from "@jest/globals";
import { _pmv_ppd_optimized, pmv_ppd } from "../../src/models/pmv_ppd.ts";
import type { PmvPpdParams, PmvStandard } from "../../src/models/pmv_ppd.ts";
import {
  ASHRAE_55_LIMITS,
  ISO_7730_LIMITS,
  Standard,
  check_standard_compliance,
  round,
  valid_range,
} from "../../src/utilities/utilities.js";
import { testDataUrls } from "./comftest.ts";
import { loadTestData, validateResult } from "./testUtils.ts";

let returnArray = false;

// use top-level await to load test data before tests are defined.
/** Maps the legacy labels used in the shared fixture files to canonical identifiers. */
const FIXTURE_STANDARD: Record<string, PmvStandard> = {
  ISO: Standard.iso_7730_2025,
  ASHRAE: Standard.ashrae_55_2023,
};

/**
 * A fixture row's inputs as pmv_ppd params. The shared fixture files predate
 * versioned identifiers and still carry `"standard": "ISO"` / `"ASHRAE"`.
 * Those files are consumed by pythermalcomfort and an R implementation too,
 * so the label is mapped here rather than rewritten there; the rest of the
 * row is passed as it is, as upstream's `fn(**inputs)`. A row without a
 * standard keeps the default; a label with no mapping throws, so a new or
 * lowercase label cannot run under the default standard unnoticed.
 */
const fixtureParams = (inputs: Record<string, unknown>): PmvPpdParams => {
  const label = inputs.standard as string | undefined;
  if (label !== undefined && !(label in FIXTURE_STANDARD)) {
    throw new Error(`fixture standard "${label}" has no mapping`);
  }
  return {
    ...inputs,
    standard: label === undefined ? undefined : FIXTURE_STANDARD[label],
  } as PmvPpdParams;
};

let { testData, tolerances } = await loadTestData(
  testDataUrls.pmvPpd,
  returnArray,
);

describe("test_pmv_ppd_optimised", () => {
  describe("TestPmvPpdOptimized", () => {
    test("test_pmv_ppd_optimized", () => {
      expect(
        Math.abs(_pmv_ppd_optimized(25, 25, 0.3, 50, 1.5, 0.7, 0) - 0.55),
      ).toBeLessThanOrEqual(0.01);

      // Upstream's array tdb=[25, 25], element-wise.
      for (const tdb of [25, 25]) {
        expect(
          round(_pmv_ppd_optimized(tdb, 25, 0.3, 50, 1.5, 0.7, 0), 2),
        ).toBe(0.55);
      }
    });

    test("test_pmv_typical_input", () => {
      expect(
        Math.abs(_pmv_ppd_optimized(25, 23, 0.1, 50, 1.2, 0.5, 0) - -0.197),
      ).toBeLessThanOrEqual(0.01);
    });

    test("test_pmv_extreme_input", () => {
      expect(
        Math.abs(_pmv_ppd_optimized(35, 45, 2, 10, 2.5, 1.5, 1) - 1.86),
      ).toBeLessThanOrEqual(0.01);
    });

    test("test_nan_input_values", () => {
      expect(_pmv_ppd_optimized(NaN, 23, 0.1, 50, 1.2, 0.5, 0)).toBeNaN();
    });

    test("test_infinite_input_values", () => {
      expect(_pmv_ppd_optimized(Infinity, 23, 0.1, 50, 1.2, 0.5, 0)).toBeNaN();
    });
  });
});

describe("_pmv_ppd_optimized", () => {
  test("starts from the ISO 7730:2025 Annex D clothing-temperature guess", () => {
    // The solver stops at a tolerance, so its starting point shows in the
    // result: here the 2005 guess gave -0.124249 (rounded, -0.12). Expected
    // value from pythermalcomfort 4.6.0's _pmv_ppd_optimized at these inputs.
    expect(
      Math.abs(_pmv_ppd_optimized(20, 20, 0.1, 50, 1, 1.5, 0) - -0.126788),
    ).toBeLessThanOrEqual(1e-6);
  });
});

describe("pmv_pdd", () => {
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const modelResult = pmv_ppd(fixtureParams(inputs));

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });

  test("round_output: false returns raw unrounded finite values", () => {
    const result = pmv_ppd({
      tdb: 25,
      tr: 25,
      vr: 0.3,
      rh: 50,
      met: 1.2,
      clo: 0.5,
      round_output: false,
    });
    expect(Number.isFinite(result.pmv)).toBe(true);
    expect(Number.isFinite(result.ppd)).toBe(true);
  });

  test("round_output: true rounds pmv to 2 and ppd to 1 decimal places", () => {
    const params = { tdb: 25, tr: 25, vr: 0.3, rh: 50, met: 1.2, clo: 0.5 };
    const raw = pmv_ppd({ ...params, round_output: false });
    const rounded = pmv_ppd({ ...params, round_output: true });
    expect(rounded.pmv).toBe(parseFloat(raw.pmv.toFixed(2)));
    expect(rounded.ppd).toBe(parseFloat(raw.ppd.toFixed(1)));
  });

  test("default behaviour rounds output", () => {
    const params = { tdb: 25, tr: 25, vr: 0.3, rh: 50, met: 1.2, clo: 0.5 };
    const defaultResult = pmv_ppd(params);
    const roundedResult = pmv_ppd({ ...params, round_output: true });
    expect(defaultResult.pmv).toBe(roundedResult.pmv);
    expect(defaultResult.ppd).toBe(roundedResult.ppd);
  });

  test("a switch passed as undefined takes its default", () => {
    // A fixture row built as `{ units, limit_inputs }` carries an explicit
    // undefined for a key it lacks; that must not switch the gate off.
    const params = { tdb: 35, tr: 25, vr: 0.1, rh: 30, met: 1.2, clo: 0.5 };
    expect(pmv_ppd({ ...params, limit_inputs: undefined }).pmv).toBeNaN();
    expect(pmv_ppd({ ...params, round_output: undefined })).toEqual(
      pmv_ppd(params),
    );
  });
});

// ---------------------------------------------------------------------------
// Input validation tests
// ---------------------------------------------------------------------------
describe("pmv_ppd input validation", () => {
  const valid: PmvPpdParams = {
    tdb: 25,
    tr: 25,
    vr: 0.1,
    rh: 50,
    met: 1.2,
    clo: 0.5,
  };

  test.each(["tdb", "tr", "vr", "rh", "met", "clo", "wme"])(
    "throws TypeError if %s is not a number",
    (key) => {
      expect(() => pmv_ppd({ ...valid, [key]: "25" })).toThrow(TypeError);
    },
  );

  test("throws Error if standard is not a valid enum", () => {
    // @ts-expect-error deliberately passing an invalid standard enum to test the runtime Error
    expect(() => pmv_ppd({ ...valid, standard: "INVALID" })).toThrow(Error);
  });

  test.each([Standard.iso_7933_2004, Standard.iso_7933_2023])(
    "throws Error for %s, which PMV does not implement",
    (standard) => {
      // The type refuses these too; this pins the runtime check for JS callers,
      // which would otherwise be computed against ASHRAE 55's bounds and bins.
      // @ts-expect-error ISO 7933 is not a PmvStandard.
      expect(() => pmv_ppd({ ...valid, standard })).toThrow(Error);
    },
  );

  test("throws Error if units is not a valid enum", () => {
    expect(() =>
      // @ts-expect-error deliberately passing an invalid units enum to test the runtime Error
      pmv_ppd({ ...valid, units: "INVALID" }),
    ).toThrow(Error);
  });

  test.each([
    "limit_inputs",
    "airspeed_control",
    "round_output",
    "suppress_warnings",
  ])("throws TypeError if %s is not a boolean", (key) => {
    expect(() => pmv_ppd({ ...valid, [key]: "true" })).toThrow(TypeError);
  });
});

describe("pmv_ppd suppress_warnings", () => {
  // At 45 °C and 90 % RH the still-air SET root is not bracketed, so
  // cooling_effect falls back to 0 and says so on the console.
  const fallback = (params: Partial<PmvPpdParams> = {}) =>
    pmv_ppd({
      tdb: 45,
      tr: 45,
      vr: 0.5,
      rh: 90,
      met: 1.2,
      clo: 0.5,
      standard: Standard.ashrae_55_2023,
      limit_inputs: false,
      ...params,
    });

  const spyConsole = () =>
    (["log", "info", "warn", "error"] as const).map((method) =>
      jest.spyOn(console, method).mockImplementation(() => {}),
    );

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("a call that falls back writes nothing with the switch on", () => {
    const spies = spyConsole();
    fallback({ suppress_warnings: true });
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });

  test("a call that falls back still writes with the switch off or absent", () => {
    const [, , warn] = spyConsole();
    fallback({ suppress_warnings: false });
    fallback();
    expect(warn).toHaveBeenCalledTimes(2);
  });

  test("the switch changes nothing but the console", () => {
    spyConsole();
    expect(fallback({ suppress_warnings: true })).toEqual(fallback());
  });
});

// Issue #195. pythermalcomfort's pmv_ppd_iso applies the ISO 7730 Clause 4
// limit on partial water vapour pressure; jsthermalcomfort did not, so warm
// humid conditions returned a number where Python returned NaN.
describe("pmv_ppd ISO vapour pressure limit (#195)", () => {
  // pa = rh * 10 * exp(16.6536 - 4030.183 / (tdb + 235)). These rh values are
  // solved from that equation for pa = 2700 Pa, and land a few parts in 1e-6
  // BELOW the limit rather than exactly on it -- an rh that hits 2700.0 exactly
  // in float64 needs ~20 significant digits and depends on Math.exp being
  // bit-identical across engines, which is not guaranteed. So the pair below
  // brackets the limit tightly from both sides, and the inclusivity of the
  // comparison itself is asserted separately in the last test.
  const NEAR_LIMIT = [
    { tdb: 25, rh: 85.244688 }, // pa = 2699.999995
    { tdb: 28, rh: 71.429553 }, // pa = 2699.999996
    { tdb: 30, rh: 63.628386 }, // pa = 2699.999991
  ];

  // Enough to cross the limit but still far tighter than any realistic input:
  // dpa/drh is about 32 Pa per %rh here, so this lands ~3e-4 Pa above 2700.
  const STEP_OVER = 1e-5;

  test.each(NEAR_LIMIT)(
    "pa just below 2700 Pa is valid (tdb=$tdb, rh=$rh)",
    ({ tdb, rh }) => {
      const result = pmv_ppd({
        tdb,
        tr: tdb,
        vr: 0.1,
        rh,
        met: 1.2,
        clo: 0.5,
        limit_inputs: true,
      });
      expect(Number.isFinite(result.pmv)).toBe(true);
      expect(Number.isFinite(result.ppd)).toBe(true);
    },
  );

  test.each(NEAR_LIMIT)(
    "pa just above 2700 Pa NaNs pmv, ppd and tsv (tdb=$tdb)",
    ({ tdb, rh }) => {
      const result = pmv_ppd({
        tdb,
        tr: tdb,
        vr: 0.1,
        rh: rh + STEP_OVER,
        met: 1.2,
        clo: 0.5,
        limit_inputs: true,
      });
      expect(result.pmv).toBeNaN();
      expect(result.ppd).toBeNaN();
      expect(result.tsv).toBeNaN();
    },
  );

  test("the NaN comes from the vapour pressure bound, not the PMV output gate", () => {
    // Every input is inside its own limit here, and with limits off the PMV is
    // well inside [-2, 2]. So the NaN below can only be the pa bound.
    const params = { tdb: 30, tr: 30, vr: 0.1, rh: 90, met: 1.2, clo: 0.5 };
    const unlimited = pmv_ppd({ ...params, limit_inputs: false });
    expect(Number.isFinite(unlimited.pmv)).toBe(true);
    expect(unlimited.pmv).toBeGreaterThan(-2);
    expect(unlimited.pmv).toBeLessThan(2);

    const limited = pmv_ppd({ ...params, limit_inputs: true });
    expect(limited.pmv).toBeNaN();
  });

  test("the bound is ISO-only; ASHRAE is unaffected", () => {
    // ASHRAE 55 has no vapour pressure limit, and pythermalcomfort's
    // pmv_ppd_ashrae does not apply one either.
    const result = pmv_ppd({
      tdb: 30,
      tr: 30,
      vr: 0.1,
      rh: 90,
      met: 1.2,
      clo: 0.5,
      standard: Standard.ashrae_55_2023,
      limit_inputs: true,
    });
    expect(Number.isFinite(result.pmv)).toBe(true);
  });

  test("2700 Pa itself is inside the bound, not outside it", () => {
    // Asserts the comparison is `<=` and not `<`, without routing through
    // exp() and so without depending on floating-point reproducibility.
    // This is the half the bracketing cases above cannot prove.
    const { min, max } = ISO_7730_LIMITS.pa;
    expect(max).toBe(2700);
    expect(min).toBe(0);

    // Both ends are inclusive: the bound value passes through unchanged.
    // Asserted on the returned value rather than with `not.toContain(NaN)`,
    // which passes vacuously -- toContain uses indexOf, and NaN !== NaN.
    expect(valid_range([max], [min, max])).toEqual([max]);
    expect(valid_range([min], [min, max])).toEqual([min]);

    // A hair outside either end is replaced with NaN.
    expect(valid_range([max + 1e-9], [min, max])[0]).toBeNaN();
    expect(valid_range([min - 1e-9], [min, max])[0]).toBeNaN();
  });
});

describe("pmv_ppd applicability warnings (#199)", () => {
  // The kernel's Antoine relation, restated so the test pins the value the
  // row reports rather than re-deriving it through the code under test.
  const kernelPa = (tdb: number, rh: number) =>
    rh * 10 * Math.exp(16.6536 - 4030.183 / (tdb + 235));

  test("empty at the ISO default inputs", () => {
    expect(
      pmv_ppd({ tdb: 25, tr: 25, vr: 0.1, rh: 50, met: 1.2, clo: 0.5 })
        .warnings,
    ).toEqual([]);
  });

  test("an input outside its bound gives an input row carrying the ISO bound itself", () => {
    // rh 30 keeps pa inside its bound at 35 °C, so tdb is the only row.
    const { warnings } = pmv_ppd({
      tdb: 35,
      tr: 25,
      vr: 0.1,
      rh: 30,
      met: 1.2,
      clo: 0.5,
    });
    expect(warnings).toEqual([
      { key: "tdb", role: "input", value: 35, bound: ISO_7730_LIMITS.tdb },
    ]);
    // The same frozen object the metadata references, not a copy.
    expect(warnings[0].bound).toBe(ISO_7730_LIMITS.tdb);
  });

  test("a humid call gives a derived pa row with the kernel's value", () => {
    // met 1.0 keeps the PMV under 2, so pa is the only row.
    const { warnings } = pmv_ppd({
      tdb: 30,
      tr: 30,
      vr: 0.1,
      rh: 95,
      met: 1.0,
      clo: 0.5,
    });
    expect(warnings).toEqual([
      {
        key: "pa",
        role: "derived",
        value: kernelPa(30, 95),
        bound: ISO_7730_LIMITS.pa,
      },
    ]);
    expect(warnings[0].bound).toBe(ISO_7730_LIMITS.pa);
  });

  test("a PMV beyond ±2 gives an output row with the unrounded pmv", () => {
    const params = { tdb: 30, tr: 30, vr: 0.1, rh: 50, met: 3, clo: 1.5 };
    const raw = pmv_ppd({
      ...params,
      limit_inputs: false,
      round_output: false,
    });
    expect(raw.pmv).toBeGreaterThan(2);

    const { warnings } = pmv_ppd(params);
    expect(warnings).toEqual([
      {
        key: "pmv",
        role: "output",
        value: raw.pmv,
        bound: ISO_7730_LIMITS.pmv,
      },
    ]);
    expect(warnings[0].bound).toBe(ISO_7730_LIMITS.pmv);
  });

  test("the rows are the same with limit_inputs on and off", () => {
    const params = {
      tdb: 35,
      tr: 45,
      vr: 1.5,
      rh: 95,
      met: 0.5,
      clo: 2.5,
      wme: 0,
      standard: Standard.iso_7730_2025,
    };
    const on = pmv_ppd({ ...params, limit_inputs: true });
    const off = pmv_ppd({ ...params, limit_inputs: false });
    expect(on.pmv).toBeNaN();
    expect(Number.isFinite(off.pmv)).toBe(true);
    expect(off.warnings).toEqual(on.warnings);
    expect(on.warnings.map((w) => w.key)).toEqual([
      "tdb",
      "tr",
      "vr",
      "met",
      "clo",
      "pa",
      "pmv",
    ]);
    expect(on.warnings.map((w) => w.role)).toEqual([
      "input",
      "input",
      "input",
      "input",
      "input",
      "derived",
      "output",
    ]);
  });

  test("ASHRAE gives input rows against the ASHRAE 55 bounds, never pa or pmv", () => {
    const { warnings } = pmv_ppd({
      tdb: 45,
      tr: 30,
      vr: 0.1,
      rh: 95,
      met: 3,
      clo: 1.6,
      standard: Standard.ashrae_55_2023,
      limit_inputs: false,
    });
    expect(warnings).toEqual([
      { key: "tdb", role: "input", value: 45, bound: ASHRAE_55_LIMITS.tdb },
      { key: "clo", role: "input", value: 1.6, bound: ASHRAE_55_LIMITS.clo },
    ]);
  });

  describe("ASHRAE airspeed limits without airspeed control", () => {
    // clo < 0.7 and met < 1.3, the only case these limits apply to.
    const ashrae = (
      tdb: number,
      vr: number,
      params: Partial<PmvPpdParams> = {},
    ) =>
      pmv_ppd({
        tdb,
        tr: tdb,
        vr,
        rh: 50,
        met: 1.0,
        clo: 0.5,
        standard: Standard.ashrae_55_2023,
        airspeed_control: false,
        ...params,
      });

    test("to <= 23 °C: vr above 0.2 m/s gives a vr row against 0.2", () => {
      const result = ashrae(20, 0.3);
      expect(result.pmv).toBeNaN();
      expect(result.warnings).toEqual([
        { key: "vr", role: "input", value: 0.3, bound: { max: 0.2 } },
      ]);
    });

    test("23 < to < 25.5 °C: vr above the operative-temperature limit gives a row against it", () => {
      // v_limit = 50.49 - 4.4047 to + 0.096425 to², about 0.318 m/s at 24 °C.
      const to = 24;
      const v_limit = 50.49 - 4.4047 * to + 0.096425 * to * to;
      const result = ashrae(24, 0.5);
      expect(result.pmv).toBeNaN();
      expect(result.warnings).toEqual([
        { key: "vr", role: "input", value: 0.5, bound: { max: v_limit } },
      ]);
    });

    test("vr above 0.8 m/s gives a row against 0.8", () => {
      const result = ashrae(26, 1.0);
      expect(result.pmv).toBeNaN();
      expect(result.warnings).toEqual([
        { key: "vr", role: "input", value: 1.0, bound: { max: 0.8 } },
      ]);
    });

    test("vr outside both its range and the no-control limit gives both rows", () => {
      expect(ashrae(26, 2.5).warnings).toEqual([
        { key: "vr", role: "input", value: 2.5, bound: ASHRAE_55_LIMITS.vr },
        { key: "vr", role: "input", value: 2.5, bound: { max: 0.8 } },
      ]);
    });

    // Upstream's _check_ashrae55_compliance checks the airspeed rules before
    // met and clo, so their rows come first.
    test("the airspeed rows come before the met and clo rows, as upstream's", () => {
      expect(ashrae(20, 0.3, { met: 0.9 }).warnings).toEqual([
        { key: "vr", role: "input", value: 0.3, bound: { max: 0.2 } },
        { key: "met", role: "input", value: 0.9, bound: ASHRAE_55_LIMITS.met },
      ]);
    });

    test("the same call with airspeed control gives no row", () => {
      expect(ashrae(20, 0.3, { airspeed_control: true }).warnings).toEqual([]);
    });

    test("the rows are the same with limit_inputs off", () => {
      const off = ashrae(20, 0.3, { limit_inputs: false });
      expect(Number.isFinite(off.pmv)).toBe(true);
      expect(off.warnings).toEqual(ashrae(20, 0.3).warnings);
    });

    test.each([
      { tdb: 20, vr: 0.3 },
      { tdb: 24, vr: 0.5 },
      { tdb: 26, vr: 1.0 },
    ])("the row's bound is frozen (tdb=$tdb, vr=$vr)", ({ tdb, vr }) => {
      expect(Object.isFrozen(ashrae(tdb, vr).warnings[0].bound)).toBe(true);
    });
  });

  test.each(testData.data)(
    "a NaN that limit_inputs caused comes with a row (fixture #%#)",
    (testCase) => {
      const run = (limit_inputs: boolean) =>
        pmv_ppd({ ...fixtureParams(testCase.inputs), limit_inputs });
      const limited = run(true);
      const caused_by_limits =
        Number.isNaN(limited.pmv) && Number.isFinite(run(false).pmv);
      expect(limited.warnings.length > 0).toBe(caused_by_limits);
    },
  );

  test("the input rows break exactly when check_standard_compliance warns", () => {
    // check_standard_compliance keeps its own copy of these bounds and of the
    // ASHRAE airspeed rules (its strings are left as they were), so this pins
    // the two copies together across both standards and every branch.
    for (const standard of [Standard.iso_7730_2025, Standard.ashrae_55_2023])
      for (const airspeed_control of [true, false])
        for (const tdb of [5, 10, 20, 24, 30, 35, 40, 45])
          for (const vr of [0, 0.1, 0.25, 0.5, 0.9, 1.5, 2, 2.5])
            for (const met of [0.7, 0.8, 1, 1.2, 4, 4.5])
              for (const clo of [0, 0.5, 1, 1.5, 2, 2.5]) {
                const rows = pmv_ppd({
                  tdb,
                  tr: tdb,
                  vr,
                  rh: 50,
                  met,
                  clo,
                  standard,
                  airspeed_control,
                }).warnings.filter((w) => w.role === "input");
                const strings = check_standard_compliance(standard, {
                  tdb,
                  tr: tdb,
                  v: vr,
                  met,
                  clo,
                  airspeed_control,
                });
                expect({ tdb, vr, met, clo, broke: rows.length > 0 }).toEqual({
                  tdb,
                  vr,
                  met,
                  clo,
                  broke: strings.length > 0,
                });
              }
  });

  test("ASHRAE_55_LIMITS holds the numbers _ashrae_compliance enforces", () => {
    expect(ASHRAE_55_LIMITS).toEqual({
      tdb: { min: 10, max: 40 },
      tr: { min: 10, max: 40 },
      vr: { min: 0, max: 2 },
      met: { min: 1, max: 4 },
      clo: { min: 0, max: 1.5 },
    });
  });
});
