import { describe, expect, test } from "@jest/globals";
import { pmv_ppd } from "../../src/models/pmv_ppd.ts";
import {
  ISO_7730_LIMITS,
  Standard,
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
