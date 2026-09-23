import { afterEach, describe, expect, jest, test } from "@jest/globals";
import { pmv_ppd } from "../../src/models/pmv_ppd.ts";
import type { Pmv_ppdKwargs } from "../../src/models/pmv_ppd.ts";
import {
  ASHRAE_55_LIMITS,
  ISO_7730_LIMITS,
  Standard,
  check_standard_compliance,
  valid_range,
} from "../../src/utilities/utilities.js";
import { testDataUrls } from "./comftest.ts";
import { loadTestData, validateResult } from "./testUtils.ts";

let returnArray = false;

// use top-level await to load test data before tests are defined.
/** Maps the legacy labels used in the shared fixture files to canonical identifiers. */
const FIXTURE_STANDARD = {
  ISO: Standard.iso_7730_2025,
  ASHRAE: Standard.ashrae_55_2023,
};

let { testData, tolerances } = await loadTestData(
  testDataUrls.pmvPpd,
  returnArray,
);

describe("pmv_pdd", () => {
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const {
      tdb,
      tr,
      vr,
      rh,
      met,
      clo,
      wme,
      standard,
      units,
      limit_inputs,
      airspeed_control,
    } = inputs as {
      tdb: number;
      tr: number;
      vr: number;
      rh: number;
      met: number;
      clo: number;
      wme: number;
      standard: string;
      units?: "SI" | "IP";
      limit_inputs?: boolean;
      airspeed_control?: boolean;
    };

    const kwargs = {
      units,
      limit_inputs,
      airspeed_control,
    };

    // The shared fixture files predate versioned identifiers and still carry
    // `"standard": "ISO"` / `"ASHRAE"`. Those files are consumed by
    // pythermalcomfort and an R implementation too, so the label is mapped
    // here rather than rewritten there.
    const modelResult = pmv_ppd(
      tdb,
      tr,
      vr,
      rh,
      met,
      clo,
      wme,
      ((FIXTURE_STANDARD as Record<string, string>)[standard] ??
        standard) as Parameters<typeof pmv_ppd>[7],
      kwargs,
    );

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });

  test("round_output: false returns raw unrounded finite values", () => {
    const result = pmv_ppd(
      25,
      25,
      0.3,
      50,
      1.2,
      0.5,
      0,
      Standard.iso_7730_2025,
      {
        round_output: false,
      },
    );
    expect(Number.isFinite(result.pmv)).toBe(true);
    expect(Number.isFinite(result.ppd)).toBe(true);
  });

  test("round_output: true rounds pmv to 2 and ppd to 1 decimal places", () => {
    const raw = pmv_ppd(25, 25, 0.3, 50, 1.2, 0.5, 0, Standard.iso_7730_2025, {
      round_output: false,
    });
    const rounded = pmv_ppd(
      25,
      25,
      0.3,
      50,
      1.2,
      0.5,
      0,
      Standard.iso_7730_2025,
      {
        round_output: true,
      },
    );
    expect(rounded.pmv).toBe(parseFloat(raw.pmv.toFixed(2)));
    expect(rounded.ppd).toBe(parseFloat(raw.ppd.toFixed(1)));
  });

  test("default behaviour rounds output", () => {
    const defaultResult = pmv_ppd(25, 25, 0.3, 50, 1.2, 0.5);
    const roundedResult = pmv_ppd(
      25,
      25,
      0.3,
      50,
      1.2,
      0.5,
      0,
      Standard.iso_7730_2025,
      {
        round_output: true,
      },
    );
    expect(defaultResult.pmv).toBe(roundedResult.pmv);
    expect(defaultResult.ppd).toBe(roundedResult.ppd);
  });
});

// ---------------------------------------------------------------------------
// Input validation tests
// ---------------------------------------------------------------------------
describe("pmv_ppd input validation", () => {
  test.each([
    ["tdb", "25", 25, 0.1, 50, 1.2, 0.5],
    ["tr", 25, "25", 0.1, 50, 1.2, 0.5],
    ["vr", 25, 25, "0.1", 50, 1.2, 0.5],
    ["rh", 25, 25, 0.1, "50", 1.2, 0.5],
    ["met", 25, 25, 0.1, 50, "1.2", 0.5],
    ["clo", 25, 25, 0.1, 50, 1.2, "0.5"],
  ])("throws TypeError if %s is not a number", (_, ...args) => {
    // @ts-expect-error deliberately passing non-number args to test the runtime TypeError
    expect(() => pmv_ppd(...args)).toThrow(TypeError);
  });

  test("throws TypeError if wme is not a number", () => {
    // @ts-expect-error deliberately passing a non-number wme to test the runtime TypeError
    expect(() => pmv_ppd(25, 25, 0.1, 50, 1.2, 0.5, "0")).toThrow(TypeError);
  });

  test("throws Error if standard is not a valid enum", () => {
    // @ts-expect-error deliberately passing an invalid standard enum to test the runtime Error
    expect(() => pmv_ppd(25, 25, 0.1, 50, 1.2, 0.5, 0, "INVALID")).toThrow(
      Error,
    );
  });

  test.each([Standard.iso_7933_2004, Standard.iso_7933_2023])(
    "throws Error for %s, which PMV does not implement",
    (standard) => {
      // The type refuses these too; this pins the runtime check for JS callers,
      // which would otherwise be computed against ASHRAE 55's bounds and bins.
      // @ts-expect-error ISO 7933 is not a PmvStandard.
      expect(() => pmv_ppd(25, 25, 0.1, 50, 1.2, 0.5, 0, standard)).toThrow(
        Error,
      );
    },
  );

  test("throws Error if units is not a valid enum", () => {
    expect(() =>
      pmv_ppd(25, 25, 0.1, 50, 1.2, 0.5, 0, Standard.iso_7730_2025, {
        // @ts-expect-error deliberately passing an invalid units enum to test the runtime Error
        units: "INVALID",
      }),
    ).toThrow(Error);
  });

  test("throws TypeError if limit_inputs is not a boolean", () => {
    expect(() =>
      pmv_ppd(25, 25, 0.1, 50, 1.2, 0.5, 0, Standard.iso_7730_2025, {
        // @ts-expect-error deliberately passing a non-boolean limit_inputs to test the runtime TypeError
        limit_inputs: "true",
      }),
    ).toThrow(TypeError);
  });

  test("throws TypeError if airspeed_control is not a boolean", () => {
    expect(() =>
      pmv_ppd(25, 25, 0.1, 50, 1.2, 0.5, 0, Standard.iso_7730_2025, {
        // @ts-expect-error deliberately passing a non-boolean airspeed_control to test the runtime TypeError
        airspeed_control: "true",
      }),
    ).toThrow(TypeError);
  });

  test("throws TypeError if round_output is not a boolean", () => {
    expect(() =>
      pmv_ppd(25, 25, 0.1, 50, 1.2, 0.5, 0, Standard.iso_7730_2025, {
        // @ts-expect-error deliberately passing a non-boolean round_output to test the runtime TypeError
        round_output: "true",
      }),
    ).toThrow(TypeError);
  });

  test("throws TypeError if suppress_warnings is not a boolean", () => {
    expect(() =>
      pmv_ppd(25, 25, 0.1, 50, 1.2, 0.5, 0, Standard.iso_7730_2025, {
        // @ts-expect-error deliberately passing a non-boolean suppress_warnings to test the runtime TypeError
        suppress_warnings: "true",
      }),
    ).toThrow(TypeError);
  });
});

describe("pmv_ppd suppress_warnings", () => {
  // At 45 °C and 90 % RH the still-air SET root is not bracketed, so
  // cooling_effect falls back to 0 and says so on the console.
  const fallback = (kwargs: Pmv_ppdKwargs = {}) =>
    pmv_ppd(45, 45, 0.5, 90, 1.2, 0.5, 0, Standard.ashrae_55_2023, {
      limit_inputs: false,
      ...kwargs,
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
      const result = pmv_ppd(
        tdb,
        tdb,
        0.1,
        rh,
        1.2,
        0.5,
        0,
        Standard.iso_7730_2025,
        {
          limit_inputs: true,
        },
      );
      expect(Number.isFinite(result.pmv)).toBe(true);
      expect(Number.isFinite(result.ppd)).toBe(true);
    },
  );

  test.each(NEAR_LIMIT)(
    "pa just above 2700 Pa NaNs pmv, ppd and tsv (tdb=$tdb)",
    ({ tdb, rh }) => {
      const result = pmv_ppd(
        tdb,
        tdb,
        0.1,
        rh + STEP_OVER,
        1.2,
        0.5,
        0,
        Standard.iso_7730_2025,
        { limit_inputs: true },
      );
      expect(result.pmv).toBeNaN();
      expect(result.ppd).toBeNaN();
      expect(result.tsv).toBeNaN();
    },
  );

  test("the NaN comes from the vapour pressure bound, not the PMV output gate", () => {
    // Every input is inside its own limit here, and with limits off the PMV is
    // well inside [-2, 2]. So the NaN below can only be the pa bound.
    const unlimited = pmv_ppd(
      30,
      30,
      0.1,
      90,
      1.2,
      0.5,
      0,
      Standard.iso_7730_2025,
      {
        limit_inputs: false,
      },
    );
    expect(Number.isFinite(unlimited.pmv)).toBe(true);
    expect(unlimited.pmv).toBeGreaterThan(-2);
    expect(unlimited.pmv).toBeLessThan(2);

    const limited = pmv_ppd(
      30,
      30,
      0.1,
      90,
      1.2,
      0.5,
      0,
      Standard.iso_7730_2025,
      {
        limit_inputs: true,
      },
    );
    expect(limited.pmv).toBeNaN();
  });

  test("the bound is ISO-only; ASHRAE is unaffected", () => {
    // ASHRAE 55 has no vapour pressure limit, and pythermalcomfort's
    // pmv_ppd_ashrae does not apply one either.
    const result = pmv_ppd(
      30,
      30,
      0.1,
      90,
      1.2,
      0.5,
      0,
      Standard.ashrae_55_2023,
      {
        limit_inputs: true,
      },
    );
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
    expect(pmv_ppd(25, 25, 0.1, 50, 1.2, 0.5).warnings).toEqual([]);
  });

  test("an input outside its bound gives an input row carrying the ISO bound itself", () => {
    // rh 30 keeps pa inside its bound at 35 °C, so tdb is the only row.
    const { warnings } = pmv_ppd(35, 25, 0.1, 30, 1.2, 0.5);
    expect(warnings).toEqual([
      { key: "tdb", role: "input", value: 35, bound: ISO_7730_LIMITS.tdb },
    ]);
    // The same frozen object the metadata references, not a copy.
    expect(warnings[0].bound).toBe(ISO_7730_LIMITS.tdb);
  });

  test("a humid call gives a derived pa row with the kernel's value", () => {
    // met 1.0 keeps the PMV under 2, so pa is the only row.
    const { warnings } = pmv_ppd(30, 30, 0.1, 95, 1.0, 0.5);
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
    const raw = pmv_ppd(30, 30, 0.1, 50, 3, 1.5, 0, Standard.iso_7730_2025, {
      limit_inputs: false,
      round_output: false,
    });
    expect(raw.pmv).toBeGreaterThan(2);

    const { warnings } = pmv_ppd(30, 30, 0.1, 50, 3, 1.5);
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
    const args = [
      35,
      45,
      1.5,
      95,
      0.5,
      2.5,
      0,
      Standard.iso_7730_2025,
    ] as const;
    const on = pmv_ppd(...args, { limit_inputs: true });
    const off = pmv_ppd(...args, { limit_inputs: false });
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
    const { warnings } = pmv_ppd(
      45,
      30,
      0.1,
      95,
      3,
      1.6,
      0,
      Standard.ashrae_55_2023,
      { limit_inputs: false },
    );
    expect(warnings).toEqual([
      { key: "tdb", role: "input", value: 45, bound: ASHRAE_55_LIMITS.tdb },
      { key: "clo", role: "input", value: 1.6, bound: ASHRAE_55_LIMITS.clo },
    ]);
  });

  describe("ASHRAE airspeed limits without airspeed control", () => {
    const noControl = { airspeed_control: false };
    // clo < 0.7 and met < 1.3, the only case these limits apply to.
    const ashrae = (tdb: number, vr: number, kwargs = {}) =>
      pmv_ppd(tdb, tdb, vr, 50, 1.0, 0.5, 0, Standard.ashrae_55_2023, {
        ...noControl,
        ...kwargs,
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
      const {
        tdb,
        tr,
        vr,
        rh,
        met,
        clo,
        wme,
        standard,
        units,
        airspeed_control,
      } = testCase.inputs as {
        tdb: number;
        tr: number;
        vr: number;
        rh: number;
        met: number;
        clo: number;
        wme: number;
        standard: string;
        units?: "SI" | "IP";
        airspeed_control?: boolean;
      };
      const std = ((FIXTURE_STANDARD as Record<string, string>)[standard] ??
        standard) as Parameters<typeof pmv_ppd>[7];
      const run = (limit_inputs: boolean) =>
        pmv_ppd(tdb, tr, vr, rh, met, clo, wme, std, {
          units,
          airspeed_control,
          limit_inputs,
        });
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
                const rows = pmv_ppd(tdb, tdb, vr, 50, met, clo, 0, standard, {
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
