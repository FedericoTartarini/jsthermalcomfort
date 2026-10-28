import { afterEach, describe, expect, vi, test } from "vitest";
import {
  PMV_COMPLIANCE_INTERVAL_ASHRAE,
  pmv_ppd_ashrae,
  pmv_ppd_iso,
  PMV_PPD_ISO_INFO,
  PMV_THERMAL_SENSATION_VOTE_BINS_ASHRAE,
} from "../../src/models/index.ts";
import type { PmvPpdAshraeParams } from "../../src/models/pmv_ppd_ashrae.ts";
import { classifyFromBins } from "../../src/_internal/classifierBins.ts";
import { ASHRAE_55_LIMITS } from "../../src/_internal/ashrae55.ts";
import { check_standard_compliance } from "../../src/utilities/utilities.js";
import { Standard } from "../../src/utilities/options.ts";
import { testDataUrls } from "./comftest.ts";
import {
  assertNonEmptyRows,
  loadTestData,
  validateResult,
} from "./testUtils.ts";

// Array rows run element-wise.
const { testData: reference_table, tolerances: tolerance } = await loadTestData(
  testDataUrls.pmvPpd,
);

// As upstream, the rows whose label lower-cases to "ashrae" (tests/test_pmv_ppd_ashrae.py:23-25).
const ashrae_rows = assertNonEmptyRows(
  reference_table.data.filter(
    ({ inputs }) => String(inputs.standard).toLowerCase() === "ashrae",
  ),
  "pmv_ppd_ashrae ASHRAE rows",
);

// Mirrors pythermalcomfort v4.7.0 tests/test_pmv_ppd_ashrae.py.
describe("test_pmv_ppd_ashrae", () => {
  test.each(ashrae_rows)("test_pmv_ppd: fixture case %#", (row) => {
    const { inputs, outputs } = row;
    // As upstream, which swaps the row's label for `model="55-2023"`; the key
    // is `standard` here (ADR 0003). The rest of the row goes in unchanged.
    const result = pmv_ppd_ashrae({
      ...inputs,
      standard: Standard.ashrae_55_2023,
    } as unknown as Parameters<typeof pmv_ppd_ashrae>[0]);

    validateResult(result, outputs, tolerance, inputs);
  });

  describe("TestPmvPpd", () => {
    test("test_thermal_sensation", () => {
      const cases: [number, string][] = [
        [16, "Cold"],
        [21, "Cool"],
        [24, "Slightly Cool"],
        [26, "Neutral"],
        [29, "Slightly Warm"],
        [32, "Warm"],
        [34, "Hot"],
        [33.47, "Warm"],
        [33.46, "Warm"],
      ];
      for (const [t, tsv] of cases) {
        const result = pmv_ppd_ashrae({
          tdb: t,
          tr: t,
          vr: 0.2,
          rh: 50,
          met: 1,
          clo: 0.5,
          standard: Standard.ashrae_55_2023,
        });
        expect(result.tsv).toBe(tsv);
      }
    });

    test("test_returns_nan_for_invalid_input_values", () => {
      // test airspeed limits
      const airspeed: [number, number, number, number, number][] = [
        [26, 0.9, 1.1, 0.5, NaN],
        [24, 0.6, 1.1, 0.5, NaN],
        [22, 0.3, 1.1, 0.5, NaN],
        [26, 0.9, 1.3, 0.7, -0.14],
        [24, 0.6, 1.3, 0.7, -0.43],
        [22, 0.3, 1.3, 0.7, -0.57],
      ];
      for (const [t, vr, met, clo, pmv] of airspeed) {
        const result = pmv_ppd_ashrae({
          tdb: t,
          tr: t,
          vr,
          rh: 50,
          met,
          clo,
          standard: Standard.ashrae_55_2023,
          airspeed_control: false,
        });
        expect(result.pmv).toBe(pmv);
      }

      const out_of_range: [number, number, number, number, number][] = [
        [41, 20, 0.1, 1.1, 0.5],
        [20, 41, 0.1, 1.1, 0.5],
        [20, 20, 2.1, 1.1, 0.5],
        [20, 20, 0.1, 0.7, 0.5],
        [20, 20, 0.1, 1.1, 2.1],
        [39, 39, 0.1, 3.9, 1.9],
      ];
      for (const [tdb, tr, vr, met, clo] of out_of_range) {
        const result = pmv_ppd_ashrae({
          tdb,
          tr,
          vr,
          rh: 50,
          met,
          clo,
          standard: Standard.ashrae_55_2023,
        });
        expect(result.pmv).toBeNaN();
      }

      // Upstream compares the whole PMVPPDAshrae; field by field here, as the
      // JS result also carries the warnings rows.
      const result = pmv_ppd_ashrae({
        tdb: 41,
        tr: 41,
        vr: 2,
        rh: 50,
        met: 0.7,
        clo: 2.1,
        standard: Standard.ashrae_55_2023,
        limit_inputs: false,
      });
      expect(result.pmv).toBe(4.51); // 4.48 before #489
      expect(result.ppd).toBe(100.0);
      expect(result.tsv).toBe("Hot");
      expect(result.compliance).toBe(false);
    });

    test("test_compliance", () => {
      const at = (t: number) =>
        pmv_ppd_ashrae({
          tdb: t,
          tr: t,
          vr: 0.1,
          rh: 50,
          met: 1.0,
          clo: 0.5,
          standard: Standard.ashrae_55_2023,
        });

      // Test scalar values - compliant case (PMV within -0.5 to 0.5)
      expect(at(25).compliance).toBe(true);

      // Test scalar values - non-compliant case (PMV outside -0.5 to 0.5)
      expect(at(30).compliance).toBe(false);

      // Test array values with known PMV results, element-wise
      // PMV around -0.77, -0.03, 1.17 approximately
      // First is not compliant (< -0.5), second is compliant, third is not compliant (> 0.5)
      expect([22, 25, 30].map((t) => at(t).compliance)).toEqual([
        false,
        true,
        false,
      ]);

      // For these inputs, PMV is outside (-0.5, 0.5), so should be non-compliant
      let result = at(22.5);
      expect(result.pmv < -0.5 || result.pmv > 0.5).toBe(true);
      expect(result.compliance).toBe(false);

      // Also test inputs that produce PMV close to upper bound
      result = at(27.45);
      expect(result.pmv < -0.5 || result.pmv > 0.5).toBe(true);
      expect(result.compliance).toBe(false);
    });

    test("test_wrong_standard", () => {
      expect(() =>
        pmv_ppd_ashrae({
          tdb: 25,
          tr: 25,
          vr: 0.1,
          rh: 50,
          met: 1.1,
          clo: 0.5,
          // @ts-expect-error standard is "55-2023"; the runtime check is under test
          standard: "random",
        }),
      ).toThrow(Error);
    });

    // Upstream's UserWarning naming 'tdb' is a range row keyed "tdb".
    test("test_out_of_range_warns", () => {
      const result = pmv_ppd_ashrae({
        tdb: 41,
        tr: 25,
        vr: 0.1,
        rh: 50,
        met: 1.1,
        clo: 0.5,
        standard: Standard.ashrae_55_2023,
      });
      expect(result.warnings).toEqual([
        expect.objectContaining({ key: "tdb", value: 41 }),
      ]);
      expect(result.pmv).toBeNaN();
    });

    // Upstream warns nothing with the gate off; the library returns the gate-off rows (decision 78).
    test("test_limit_inputs_false_no_warning", () => {
      const result = pmv_ppd_ashrae({
        tdb: 41,
        tr: 41,
        vr: 2,
        rh: 50,
        met: 0.7,
        clo: 2.1,
        standard: Standard.ashrae_55_2023,
        limit_inputs: false,
      });
      expect(result.warnings).toEqual([
        expect.objectContaining({ key: "tdb", value: 41 }),
        expect.objectContaining({ key: "tr", value: 41 }),
        expect.objectContaining({ key: "met", value: 0.7 }),
        expect.objectContaining({ key: "clo", value: 2.1 }),
      ]);
    });

    // "exceeding 0.8 m/s" is a vr row bounded at 0.8.
    test("test_airspeed_control_false_cond1_warns", () => {
      // to ≈ 26 > 25.5, so only cond1 applies: v=0.9 > 0.8, clo=0.5 < 0.7, met=1.1 < 1.3
      const result = pmv_ppd_ashrae({
        tdb: 26,
        tr: 26,
        vr: 0.9,
        rh: 50,
        met: 1.1,
        clo: 0.5,
        standard: Standard.ashrae_55_2023,
        airspeed_control: false,
      });
      expect(result.warnings).toEqual([
        expect.objectContaining({ key: "vr", value: 0.9, bound: { max: 0.8 } }),
      ]);
    });

    // "comfort zone" is a vr row bounded at the operative-temperature limit.
    test("test_airspeed_control_false_cond2_warns", () => {
      // to ≈ 24, so 23 < to < 25.5; v=0.6 exceeds computed v_limit ≈ 0.32
      const result = pmv_ppd_ashrae({
        tdb: 24,
        tr: 24,
        vr: 0.6,
        rh: 50,
        met: 1.1,
        clo: 0.5,
        standard: Standard.ashrae_55_2023,
        airspeed_control: false,
      });
      expect(result.warnings).toEqual([
        expect.objectContaining({
          key: "vr",
          value: 0.6,
          bound: { max: expect.closeTo(0.318, 6) as number },
        }),
      ]);
    });

    // "exceeding 0.2 m/s" is a vr row bounded at 0.2.
    test("test_airspeed_control_false_cond3_warns", () => {
      // to ≈ 22 <= 23; v=0.3 > 0.2, clo=0.5 < 0.7, met=1.1 < 1.3
      const result = pmv_ppd_ashrae({
        tdb: 22,
        tr: 22,
        vr: 0.3,
        rh: 50,
        met: 1.1,
        clo: 0.5,
        standard: Standard.ashrae_55_2023,
        airspeed_control: false,
      });
      expect(result.warnings).toEqual([
        expect.objectContaining({ key: "vr", value: 0.3, bound: { max: 0.2 } }),
      ]);
    });
  });
});

describe("pmv_ppd_ashrae (JS-only)", () => {
  const neutral = { tdb: 25, tr: 25, vr: 0.1, rh: 50, met: 1.2, clo: 0.5 };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("compliance", () => {
    test("the interval is the open (-0.5, 0.5), frozen", () => {
      expect(PMV_COMPLIANCE_INTERVAL_ASHRAE).toEqual({ min: -0.5, max: 0.5 });
      expect(Object.isFrozen(PMV_COMPLIANCE_INTERVAL_ASHRAE)).toBe(true);
    });

    // Both pmvs round to 0.5, so the rounded value cannot tell them apart;
    // upstream reads the unrounded one. Expected values from pythermalcomfort
    // 4.6.0: 0.49960946928969807 and 0.5033653770344304.
    test("is read from the unrounded pmv", () => {
      const at = (t: number) =>
        pmv_ppd_ashrae({ tdb: t, tr: t, vr: 0.1, rh: 50, met: 1.0, clo: 0.5 });
      expect(at(27.42).pmv).toBe(0.5);
      expect(at(27.42).compliance).toBe(true);
      expect(at(27.43).pmv).toBe(0.5);
      expect(at(27.43).compliance).toBe(false);
    });

    test("is NaN when the applicability gate fails", () => {
      const result = pmv_ppd_ashrae({ ...neutral, tdb: 45 });
      expect(result.pmv).toBeNaN();
      expect(result.compliance).toBeNaN();
    });

    // Upstream 4.6.0 returns False here: the gate is off, so the pmv of 6.6
    // is judged like any other.
    test("is a boolean with limit_inputs off, even out of range", () => {
      const result = pmv_ppd_ashrae({
        ...neutral,
        tdb: 45,
        tr: 45,
        limit_inputs: false,
      });
      expect(result.pmv).toBe(6.6);
      expect(result.compliance).toBe(false);
    });

    // Expected values from pythermalcomfort 4.6.0 with round_output=False.
    test("is the same whether round_output is on or off", () => {
      const at = (round_output: boolean) =>
        pmv_ppd_ashrae({
          tdb: 25,
          tr: 25,
          vr: 0.1,
          rh: 50,
          met: 1.0,
          clo: 0.5,
          round_output,
        });
      expect(
        Math.abs(at(false).pmv - -0.40087108864648396),
      ).toBeLessThanOrEqual(1e-6);
      expect(at(false).compliance).toBe(true);
      expect(at(true).compliance).toBe(true);
    });
  });

  describe("input validation", () => {
    const quantities = ["tdb", "tr", "vr", "rh", "met", "clo"] as const;

    // A numeric string is not coerced, unlike in arithmetic.
    test.each([...quantities, "wme"] as const)(
      "throws TypeError if %s is not a number",
      (key) => {
        // Cast: deliberately passing a string to test the runtime TypeError.
        const params = {
          ...neutral,
          [key]: "25",
        } as unknown as PmvPpdAshraeParams;
        expect(() => pmv_ppd_ashrae(params)).toThrow(TypeError);
      },
    );

    // A missing quantity is a TypeError, as a missing keyword argument is in
    // Python.
    test.each(quantities)("throws TypeError if %s is missing", (key) => {
      const params: Partial<PmvPpdAshraeParams> = { ...neutral };
      delete params[key];
      // @ts-expect-error deliberately omitting a quantity to test the runtime TypeError
      expect(() => pmv_ppd_ashrae(params)).toThrow(TypeError);
    });

    // ADR 0001: a non-finite number throws rather than propagating as NaN.
    test.each([...quantities, "wme"] as const)(
      "throws TypeError if %s is not finite",
      (key) => {
        for (const bad of [NaN, Infinity, -Infinity]) {
          expect(() => pmv_ppd_ashrae({ ...neutral, [key]: bad })).toThrow(
            TypeError,
          );
        }
      },
    );

    // The quantities were positional before v2 (ADR 0002). A call still
    // written that way throws rather than running on anything else.
    test("throws TypeError if called positionally", () => {
      // @ts-expect-error the model takes one params object
      expect(() => pmv_ppd_ashrae(25, 25, 0.1, 50, 1.2, 0.5)).toThrow(
        TypeError,
      );
      // @ts-expect-error null is not a params object
      expect(() => pmv_ppd_ashrae(null)).toThrow(TypeError);
      // @ts-expect-error the params object is required
      expect(() => pmv_ppd_ashrae()).toThrow(TypeError);
    });

    // The shared PMV module accepts the ISO 7730 standards too; this wrapper
    // must not hand one through and compute the ISO equation under its name.
    test("throws Error if standard is an ISO 7730 standard", () => {
      for (const standard of [Standard.iso_7730_2005, Standard.iso_7730_2025]) {
        expect(() =>
          pmv_ppd_ashrae({
            ...neutral,
            // @ts-expect-error standard is "55-2023"; the runtime check is under test
            standard,
          }),
        ).toThrow(Error);
      }
    });

    test("throws Error if units is not a valid enum", () => {
      expect(() =>
        pmv_ppd_ashrae({
          ...neutral,
          // @ts-expect-error units is "SI" or "IP"; the runtime check is under test
          units: "INVALID",
        }),
      ).toThrow(Error);
    });

    test.each([
      "limit_inputs",
      "airspeed_control",
      "round_output",
      "suppress_warnings",
    ] as const)("throws TypeError if %s is not a boolean", (key) => {
      // Cast: deliberately passing a string to test the runtime TypeError.
      const params = {
        ...neutral,
        [key]: "true",
      } as unknown as PmvPpdAshraeParams;
      expect(() => pmv_ppd_ashrae(params)).toThrow(TypeError);
    });

    test("a switch passed as undefined takes its default", () => {
      expect(
        // @ts-expect-error the Params type lacks ADR 0019's `?: T | undefined`; the runtime default is under test
        pmv_ppd_ashrae({
          ...neutral,
          wme: undefined,
          standard: undefined,
          units: undefined,
          limit_inputs: undefined,
          airspeed_control: undefined,
          round_output: undefined,
          suppress_warnings: undefined,
        }),
      ).toEqual(pmv_ppd_ashrae(neutral));
    });
  });

  // At 45 °C and 90 % RH the cooling effect falls back to 0 with a warning.
  test("suppress_warnings passes through to the cooling effect", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const hot = { tdb: 45, tr: 45, vr: 0.5, rh: 90, met: 1.2, clo: 0.5 };
    pmv_ppd_ashrae({ ...hot, suppress_warnings: true });
    expect(warn).not.toHaveBeenCalled();
    pmv_ppd_ashrae(hot);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  describe("tsv classification (right-inclusive)", () => {
    // ASHRAE has more lenient range than ISO, so try an extreme case
    test("tsv is NaN when pmv is NaN (out of range)", () => {
      const result = pmv_ppd_ashrae({
        tdb: 50,
        tr: 50,
        vr: 0.5,
        rh: 80,
        met: 2.0,
        clo: 0.3,
        limit_inputs: true,
      });
      expect(result.pmv).toBeNaN();
      expect(result.tsv).toBeNaN();
    });

    // This test used to assert the opposite: tsv from the unrounded pmv whatever
    // round_output was. Upstream classifies the pmv it returns, after rounding
    // (pmv_ppd_ashrae.py in 4.6.0), so the label never disagrees with the number
    // shown. Expected values from pythermalcomfort 4.6.0 at these inputs.
    test("tsv is classified from the pmv returned, rounded or not", () => {
      // pmv ≈ 0.5044, just above the 0.5 edge. ASHRAE is right-inclusive, so
      // the rounded 0.5 closes (-0.5, 0.5] = "Neutral", while the unrounded
      // value falls in (0.5, 1.5] = "Slightly Warm".
      const warm = { ...neutral, tdb: 26.4, tr: 26.4, limit_inputs: false };
      const result_rounded = pmv_ppd_ashrae({ ...warm, round_output: true });
      const result_unrounded = pmv_ppd_ashrae({ ...warm, round_output: false });
      expect(result_rounded.pmv).toBe(0.5);
      expect(result_rounded.tsv).toBe("Neutral");
      expect(result_unrounded.pmv).toBeGreaterThan(0.5);
      expect(result_unrounded.tsv).toBe("Slightly Warm");
    });

    // At comfortable neutral conditions (25°C, symmetric), pmv should be ~0, so tsv should be "Neutral"
    test("neutral comfort (pmv ~0) -> Neutral", () => {
      expect(pmv_ppd_ashrae(neutral).tsv).toBe("Neutral");
    });

    test("warm comfort (pmv ~1) -> Slightly Warm", () => {
      // tdb=26.4 used to be asserted "Slightly Warm" here from its unrounded
      // pmv ≈ 0.5044; rounded by default to 0.5, it is "Neutral" (the test
      // above), as upstream classifies the rounded pmv. tdb=27 gives pmv ≈ 0.68,
      // inside the right-inclusive interval (0.5, 1.5] = "Slightly Warm" (ASHRAE).
      // This test verifies the exact classification, not a set of possibilities,
      // so that rounding errors or classification bugs are caught.
      const result = pmv_ppd_ashrae({
        ...neutral,
        tdb: 27,
        tr: 27,
        limit_inputs: false,
      });
      // Must be exactly "Slightly Warm", not one of three options
      expect(result.tsv).toBe("Slightly Warm");
    });
  });

  // -------------------------------------------------------------------------
  // Intentional divergence between ISO and ASHRAE (pythermalcomfort#382)
  // -------------------------------------------------------------------------
  describe("ISO vs ASHRAE TSV interval convention (pythermalcomfort#382)", () => {
    // The two models share identical bin edges and labels but opposite interval
    // conventions: ISO is left-inclusive, ASHRAE is right-inclusive. Classify the
    // SAME value under both bin sets so the convention is the only variable —
    // going through the models instead would confound this with the fact that
    // ASHRAE applies a cooling effect and therefore computes a different PMV.
    test.each([-2.5, -1.5, -0.5, 0.5, 1.5, 2.5])(
      "pmv = %s is labelled differently by the two conventions",
      (pmv) => {
        const iso = classifyFromBins(
          pmv,
          PMV_PPD_ISO_INFO.outputs.tsv.classifier,
        );
        const ashrae = classifyFromBins(
          pmv,
          PMV_THERMAL_SENSATION_VOTE_BINS_ASHRAE,
        );
        expect(iso).not.toBe(ashrae);
      },
    );

    test("at pmv = -1.5 exactly, ISO says Slightly Cool and ASHRAE says Cool", () => {
      // ISO is left-inclusive, so -1.5 opens the [-1.5, -0.5) bin -> "Slightly Cool".
      // ASHRAE is right-inclusive, so -1.5 closes the (-2.5, -1.5] bin -> "Cool".
      expect(
        classifyFromBins(-1.5, PMV_PPD_ISO_INFO.outputs.tsv.classifier),
      ).toBe("Slightly Cool");
      expect(
        classifyFromBins(-1.5, PMV_THERMAL_SENSATION_VOTE_BINS_ASHRAE),
      ).toBe("Cool");
    });

    test("the two models can also disagree end-to-end, for a separate reason", () => {
      // Here the pmvs differ because ASHRAE's cooling effect (vr = 0.5) makes it
      // compute a DIFFERENT pmv from ISO -- not because of the interval convention.
      // Recorded so the two causes of divergence are not conflated. The labels
      // used to differ too, while ASHRAE classified its unrounded pmv (just above
      // -1.5); classified from the rounded -1.5, as upstream does, the
      // right-inclusive (-2.5, -1.5] bin makes it "Cool" like ISO's -1.52.
      const iso = pmv_ppd_iso({
        tdb: 22.5,
        tr: 22.5,
        vr: 0.5,
        rh: 50,
        met: 1.2,
        clo: 0.5,
        wme: 0,
        standard: Standard.iso_7730_2025,
        limit_inputs: false,
      });
      const ashrae = pmv_ppd_ashrae({
        tdb: 22.5,
        tr: 22.5,
        vr: 0.5,
        rh: 50,
        met: 1.2,
        clo: 0.5,
        limit_inputs: false,
      });
      expect(iso.pmv).toBe(-1.52);
      expect(iso.tsv).toBe("Cool");
      expect(ashrae.pmv).toBe(-1.5);
      expect(ashrae.tsv).toBe("Cool");
    });
  });
});

// Moved from the shared PMV module's tests when ticket 12 split it.
describe("pmv_ppd_ashrae warnings rows (JS-only)", () => {
  test("input rows against the ASHRAE 55 bounds, never pa or pmv", () => {
    const { warnings } = pmv_ppd_ashrae({
      tdb: 45,
      tr: 30,
      vr: 0.1,
      rh: 95,
      met: 3,
      clo: 1.6,
      limit_inputs: false,
    });
    expect(warnings).toEqual([
      { key: "tdb", role: "input", value: 45, bound: ASHRAE_55_LIMITS.tdb },
      { key: "clo", role: "input", value: 1.6, bound: ASHRAE_55_LIMITS.clo },
    ]);
  });

  test("no vapour pressure bound: a humid call is computed", () => {
    const result = pmv_ppd_ashrae({
      tdb: 30,
      tr: 30,
      vr: 0.1,
      rh: 90,
      met: 1.2,
      clo: 0.5,
    });
    expect(Number.isFinite(result.pmv)).toBe(true);
  });

  describe("airspeed limits without airspeed control", () => {
    // clo < 0.7 and met < 1.3, the only case these limits apply to.
    const ashrae = (
      tdb: number,
      vr: number,
      params: Partial<PmvPpdAshraeParams> = {},
    ) =>
      pmv_ppd_ashrae({
        tdb,
        tr: tdb,
        vr,
        rh: 50,
        met: 1.0,
        clo: 0.5,
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
        { key: "vr", role: "input", value: 2.5, bound: ASHRAE_55_LIMITS.v },
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
      expect(Object.isFrozen(ashrae(tdb, vr).warnings[0]!.bound)).toBe(true);
    });
  });

  test.each(ashrae_rows)(
    "a NaN that limit_inputs caused comes with a row (fixture #%#)",
    ({ inputs }) => {
      const run = (limit_inputs: boolean) =>
        pmv_ppd_ashrae({
          ...inputs,
          standard: Standard.ashrae_55_2023,
          limit_inputs,
        } as unknown as PmvPpdAshraeParams);
      const limited = run(true);
      const caused_by_limits =
        Number.isNaN(limited.pmv) && Number.isFinite(run(false).pmv);
      expect(limited.warnings.length > 0).toBe(caused_by_limits);
    },
  );

  // check_standard_compliance keeps its own copy of these bounds and of the
  // airspeed rules, so this pins the two copies together on every branch.
  test("the input rows break exactly when check_standard_compliance warns", () => {
    for (const airspeed_control of [true, false])
      for (const tdb of [5, 10, 20, 24, 30, 35, 40, 45])
        for (const vr of [0, 0.1, 0.25, 0.5, 0.9, 1.5, 2, 2.5])
          for (const met of [0.7, 0.8, 1, 1.2, 4, 4.5])
            for (const clo of [0, 0.5, 1, 1.5, 2, 2.5]) {
              const rows = pmv_ppd_ashrae({
                tdb,
                tr: tdb,
                vr,
                rh: 50,
                met,
                clo,
                airspeed_control,
              }).warnings.filter((w) => w.role === "input");
              const strings = check_standard_compliance(
                Standard.ashrae_55_2023,
                { tdb, tr: tdb, v: vr, met, clo, airspeed_control },
              );
              expect({ tdb, vr, met, clo, broke: rows.length > 0 }).toEqual({
                tdb,
                vr,
                met,
                clo,
                broke: strings.length > 0,
              });
            }
  });
});
