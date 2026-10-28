import { describe, expect, test } from "vitest";
import {
  pmv_ppd_iso,
  PMV_CATEGORY_BINS_ISO_7730_2005,
  PMV_CATEGORY_BINS_ISO_7730_2025,
} from "../../src/models/index.ts";
import { Standard } from "../../src/utilities/options.ts";
import { round } from "../../src/_internal/round.ts";
import { testDataUrls } from "./comftest.ts";
import {
  approx,
  assertNonEmptyRows,
  loadTestData,
  validateResult,
} from "./testUtils.ts";

type Inputs = Parameters<typeof pmv_ppd_iso>[0];
type Outputs = ReturnType<typeof pmv_ppd_iso>;

// Array rows run element-wise.
const { testData: reference_table, tolerances: tolerance } = await loadTestData(
  testDataUrls.pmvPpd,
);

// Upstream keeps the rows without a standard and those labelled "iso", which
// matches none of the fixture's uppercase "ISO" labels, so its fixture test
// runs only the two rows without one. This runs what it means to run: those
// two and every ISO row, SI and IP, arrays included.
const iso_rows = assertNonEmptyRows(
  reference_table.data.filter(
    ({ inputs }) => (inputs.standard ?? "ISO") === "ISO",
  ),
  "pmv_ppd_iso ISO rows",
);

// Mirrors pythermalcomfort v4.7.0 tests/test_pmv_ppd_iso.py.
describe("test_pmv_ppd_iso", () => {
  test.each(iso_rows)("test_pmv_ppd: fixture case %#", (row) => {
    const { inputs, outputs } = row;
    // As upstream, which swaps the row's label for `model="7730-2005"`; the
    // key is `standard` here (ADR 0003). The rest of the row goes in unchanged.
    const result = pmv_ppd_iso({
      ...inputs,
      standard: Standard.iso_7730_2005,
    } as unknown as Inputs);

    validateResult(result, outputs, tolerance, inputs);
  });

  describe("TestPmvPpd", () => {
    test("test_returns_nan_for_invalid_input_values", () => {
      // Upstream's arrays, one case per element; it asserts element 1 only.
      const results = (
        [
          { tdb: 25, tr: 23, vr: 0.5, rh: 50, met: 1.2, clo: 0.5 },
          { tdb: 50, tr: 45, vr: 3, rh: 80, met: 2.5, clo: 1.8 },
        ] as const
      ).map((inputs) =>
        pmv_ppd_iso({ ...inputs, standard: Standard.iso_7730_2005 }),
      );
      expect(results[1]?.pmv).toBeNaN();
      expect(results[1]?.ppd).toBeNaN();

      expect(
        round(
          pmv_ppd_iso({
            tdb: 67.28,
            tr: 67.28,
            vr: 0.328084,
            rh: 86,
            met: 1.1,
            clo: 1,
            units: "IP",
            standard: Standard.iso_7730_2005,
          }).pmv,
          1,
        ),
      ).toBe(-0.5);

      expect(
        [70, 70].map((t) =>
          round(
            pmv_ppd_iso({
              tdb: t,
              tr: 67.28,
              vr: 0.328084,
              rh: 86,
              met: 1.1,
              clo: 1,
              units: "IP",
              standard: Standard.iso_7730_2005,
            }).pmv,
            1,
          ),
        ),
      ).toEqual([-0.3, -0.3]);

      // checking that returns NaN when outside standard applicability limits,
      // one input out of range per case
      const out_of_range: [number, number, number, number, number][] = [
        [31, 20, 0.1, 1.1, 0.5],
        [20, 41, 0.1, 1.1, 0.5],
        [20, 20, 2, 1.1, 0.5],
        [20, 20, 0.1, 0.7, 0.5],
        [20, 20, 0.1, 1.1, 2.1],
        [30, 20, 0.1, 4.1, 0.1],
      ];
      for (const [tdb, tr, vr, met, clo] of out_of_range) {
        const result = pmv_ppd_iso({
          tdb,
          tr,
          vr,
          rh: 50,
          met,
          clo,
          standard: Standard.iso_7730_2005,
        });
        expect(result.pmv).toBeNaN();
      }

      // check results with limit_inputs disabled. Upstream compares the whole
      // PMVPPD; field by field here, as the JS result also carries the
      // warnings rows.
      const result = pmv_ppd_iso({
        tdb: 31,
        tr: 41,
        vr: 2,
        rh: 50,
        met: 0.7,
        clo: 2.1,
        standard: Standard.iso_7730_2005,
        limit_inputs: false,
      });
      expect(result.pmv).toBe(2.4);
      expect(result.ppd).toBe(91.0);
      expect(result.tsv).toBe("Warm");
    });

    test("test_no_compliance_attribute", () => {
      const result = pmv_ppd_iso({
        tdb: 25,
        tr: 25,
        vr: 0.1,
        rh: 50,
        met: 1.4,
        clo: 0.5,
        standard: Standard.iso_7730_2005,
      });
      expect(result).not.toHaveProperty("compliance");
    });

    test("test_wrong_standard", () => {
      expect(() =>
        pmv_ppd_iso({
          tdb: 25,
          tr: 25,
          vr: 0.1,
          rh: 50,
          met: 1.1,
          clo: 0.5,
          // @ts-expect-error standard is "7730-2005" or "7730-2025"; the runtime check is under test
          standard: "random",
        }),
      ).toThrow(Error);
    });

    test("test_7730_2025_alias_matches_2005", () => {
      const params = { tdb: 25, tr: 25, vr: 0.1, rh: 50, met: 1.4, clo: 0.5 };
      const result_2005 = pmv_ppd_iso({
        ...params,
        standard: Standard.iso_7730_2005,
      });
      const result_2025 = pmv_ppd_iso({
        ...params,
        standard: Standard.iso_7730_2025,
      });
      const result_default = pmv_ppd_iso(params);

      // Upstream's result has no category, an addition here (ADR 0001) that
      // each edition classifies by its own bins (see the category blocks
      // below), so the editions are compared on the fields upstream returns.
      const upstreamFields = ({ pmv, ppd, tsv }: Outputs) => ({
        pmv,
        ppd,
        tsv,
      });
      expect(upstreamFields(result_2005)).toEqual(upstreamFields(result_2025));
      expect(result_2025).toEqual(result_default);
    });

    // tdb=30, rh=100 gives pa ~4243 Pa, above the 2700 Pa limit
    test("test_returns_nan_for_pa_out_of_range", () => {
      const result = pmv_ppd_iso({
        tdb: 30,
        tr: 30,
        vr: 0.1,
        rh: 100,
        met: 1.2,
        clo: 0.5,
      });
      expect(result.pmv).toBeNaN();
      expect(result.ppd).toBeNaN();
    });

    // Upstream calls np.isclose without asserting its result; this asserts it,
    // at upstream's atol.
    test("test_no_rounding", () => {
      const result = pmv_ppd_iso({
        tdb: 25,
        tr: 25,
        vr: 0.1,
        rh: 50,
        met: 1.1,
        clo: 0.5,
        round_output: false,
        standard: Standard.iso_7730_2005,
      });
      expect(approx(result.pmv, -0.13201636, { abs: 0.01 })).toBe(true);
    });
  });
});

// The category edges: at each met (and rh), the tdb = tr whose unrounded pmv
// is exactly the edge, and the adjacent double one step toward pmv = 0, each
// with the category of both editions. pythermalcomfort 4.7.0 gives the same
// unrounded pmv at every row.
const EDGES = [
  {
    id: "0",
    rh: 50,
    met: 1.01,
    t: 26.014491696246804,
    pmv: 0,
    iso2005: "A",
    iso2025: "I",
  },
  {
    id: "just below 0.2",
    rh: 40,
    met: 1.23,
    t: 25.44654272872879,
    pmv: 0.1999999999999993,
    iso2005: "A",
    iso2025: "I",
  },
  {
    id: "just above -0.2",
    rh: 50,
    met: 1.23,
    t: 23.82031658710553,
    pmv: -0.1999999999999993,
    iso2005: "A",
    iso2025: "I",
  },
  {
    id: "0.2",
    rh: 40,
    met: 1.23,
    t: 25.446542728728794,
    pmv: 0.2,
    iso2005: "B",
    iso2025: "II",
  },
  {
    id: "-0.2",
    rh: 50,
    met: 1.23,
    t: 23.820316587105527,
    pmv: -0.2,
    iso2005: "B",
    iso2025: "II",
  },
  {
    id: "just below 0.5",
    rh: 50,
    met: 1.08,
    t: 27.00538109763518,
    pmv: 0.49999999999999917,
    iso2005: "B",
    iso2025: "II",
  },
  {
    id: "just above -0.5",
    rh: 50,
    met: 1.27,
    t: 22.434637579856535,
    pmv: -0.49999999999999933,
    iso2005: "B",
    iso2025: "II",
  },
  {
    id: "0.5",
    rh: 50,
    met: 1.08,
    t: 27.005381097635183,
    pmv: 0.5,
    iso2005: "C",
    iso2025: "III",
  },
  {
    id: "-0.5",
    rh: 50,
    met: 1.27,
    t: 22.43463757985653,
    pmv: -0.5,
    iso2005: "C",
    iso2025: "III",
  },
  {
    id: "just below 0.7",
    rh: 50,
    met: 1.05,
    t: 27.72440262767248,
    pmv: 0.699999999999999,
    iso2005: "C",
    iso2025: "III",
  },
  {
    id: "just above -0.7",
    rh: 50,
    met: 1.02,
    t: 24.002992653080213,
    pmv: -0.6999999999999933,
    iso2005: "C",
    iso2025: "III",
  },
  {
    id: "0.7",
    rh: 50,
    met: 1.05,
    t: 27.724402627672482,
    pmv: 0.7,
    iso2005: "none",
    iso2025: "IV",
  },
  {
    id: "-0.7",
    rh: 50,
    met: 1.02,
    t: 24.00299265308021,
    pmv: -0.7,
    iso2005: "none",
    iso2025: "IV",
  },
  {
    id: "just below 1.0",
    rh: 50,
    met: 1.04,
    t: 28.60089392706653,
    pmv: 0.999999999999999,
    iso2005: "none",
    iso2025: "IV",
  },
  {
    id: "just above -1.0",
    rh: 50,
    met: 1.02,
    t: 23.161718454726806,
    pmv: -0.9999999999999991,
    iso2005: "none",
    iso2025: "IV",
  },
  {
    id: "1.0",
    rh: 50,
    met: 1.04,
    t: 28.600893927066533,
    pmv: 1,
    iso2005: "none",
    iso2025: "none",
  },
  {
    id: "-1.0",
    rh: 50,
    met: 1.02,
    t: 23.161718454726802,
    pmv: -1,
    iso2005: "none",
    iso2025: "none",
  },
];

describe("pmv_ppd_iso (JS-only)", () => {
  const neutral = { tdb: 25, tr: 25, vr: 0.1, rh: 50, met: 1.2, clo: 0.5 };

  describe("applicability limits", () => {
    // Supplementary boundary test — not present in the shared validation data.
    // tdb=35°C exceeds the ISO 7730 valid range (10–30°C), so NaN is expected.
    test("out-of-range inputs should return NaN under ISO standard", () => {
      const result = pmv_ppd_iso({
        tdb: 35,
        tr: 35,
        vr: 0.5,
        rh: 80,
        met: 2.0,
        clo: 0.3,
      });
      expect(result.pmv).toBeNaN();
      expect(result.ppd).toBeNaN();
    });

    // Tests for ISO met lower bound fix (issue #180)
    // met=0.7 is below the ISO 7730 lower bound of 0.8, so should return NaN with limit_inputs enabled
    test("met=0.7 (below lower bound) returns NaN when limit_inputs is enabled", () => {
      const result = pmv_ppd_iso({ ...neutral, met: 0.7, limit_inputs: true });
      expect(result.pmv).toBeNaN();
      expect(result.ppd).toBeNaN();
    });

    // met=0.8 is the inclusive lower bound of ISO 7730, so should return valid numbers
    test("met=0.8 (inclusive lower bound) returns valid numbers when limit_inputs is enabled", () => {
      const result = pmv_ppd_iso({ ...neutral, met: 0.8, limit_inputs: true });
      expect(Number.isFinite(result.pmv)).toBe(true);
      expect(Number.isFinite(result.ppd)).toBe(true);
    });

    // met=0.7 with limit_inputs=false should return valid numbers (opt-out works)
    test("met=0.7 returns valid numbers when limit_inputs is disabled (opt-out)", () => {
      const result = pmv_ppd_iso({ ...neutral, met: 0.7, limit_inputs: false });
      expect(Number.isFinite(result.pmv)).toBe(true);
      expect(Number.isFinite(result.ppd)).toBe(true);
    });
  });

  // Issue #195: upstream's ISO 7730 Clause 4 limit on the partial water vapour
  // pressure, 0-2700 Pa.
  describe("vapour pressure limit (#195)", () => {
    // rh solved for pa = 2700 Pa, landing a few parts in 1e-6 below it.
    const NEAR_LIMIT = [
      { tdb: 25, rh: 85.244688 },
      { tdb: 28, rh: 71.429553 },
      { tdb: 30, rh: 63.628386 },
    ];
    // About 3e-4 Pa above 2700 Pa: dpa/drh is about 32 Pa per %rh here.
    const STEP_OVER = 1e-5;
    const call = (tdb: number, rh: number) =>
      pmv_ppd_iso({ tdb, tr: tdb, vr: 0.1, rh, met: 1.2, clo: 0.5 });

    test.each(NEAR_LIMIT)(
      "pa just below 2700 Pa is valid (tdb=$tdb, rh=$rh)",
      ({ tdb, rh }) => {
        const result = call(tdb, rh);
        expect(Number.isFinite(result.pmv)).toBe(true);
        expect(Number.isFinite(result.ppd)).toBe(true);
      },
    );

    test.each(NEAR_LIMIT)(
      "pa just above 2700 Pa NaNs pmv, ppd and tsv (tdb=$tdb)",
      ({ tdb, rh }) => {
        const result = call(tdb, rh + STEP_OVER);
        expect(result.pmv).toBeNaN();
        expect(result.ppd).toBeNaN();
        expect(result.tsv).toBeNaN();
      },
    );

    // Every input is inside its limit, and the ungated pmv inside [-2, 2].
    test("the NaN comes from the vapour pressure bound, not the PMV output gate", () => {
      const params = { tdb: 30, tr: 30, vr: 0.1, rh: 90, met: 1.2, clo: 0.5 };
      const unlimited = pmv_ppd_iso({ ...params, limit_inputs: false });
      expect(Math.abs(unlimited.pmv)).toBeLessThan(2);
      expect(pmv_ppd_iso(params).pmv).toBeNaN();
    });
  });

  // Issue #199: the rows a call broke, whatever limit_inputs is.
  describe("warnings rows", () => {
    // The kernel's Antoine relation, restated so the test pins the value.
    const kernelPa = (tdb: number, rh: number) =>
      rh * 10 * Math.exp(16.6536 - 4030.183 / (tdb + 235));

    test("empty at the neutral inputs", () => {
      expect(pmv_ppd_iso(neutral).warnings).toEqual([]);
    });

    test("an input outside its bound gives an input row", () => {
      // rh 30 keeps pa inside its bound at 35 °C, so tdb is the only row.
      const { warnings } = pmv_ppd_iso({ ...neutral, tdb: 35, rh: 30 });
      expect(warnings).toEqual([
        expect.objectContaining({
          key: "tdb",
          role: "input",
          value: 35,
          bound: { min: 10, max: 30 },
        }),
      ]);
    });

    test("a humid call gives a derived pa row with the kernel's value", () => {
      // met 1.0 keeps the PMV under 2, so pa is the only row.
      const { warnings } = pmv_ppd_iso({
        tdb: 30,
        tr: 30,
        vr: 0.1,
        rh: 95,
        met: 1.0,
        clo: 0.5,
      });
      expect(warnings).toEqual([
        expect.objectContaining({
          key: "pa",
          role: "derived",
          value: kernelPa(30, 95),
          bound: { min: 0, max: 2700 },
        }),
      ]);
    });

    test("a PMV beyond ±2 gives an output row with the unrounded pmv", () => {
      const params = { tdb: 30, tr: 30, vr: 0.1, rh: 50, met: 3, clo: 1.5 };
      const raw = pmv_ppd_iso({
        ...params,
        limit_inputs: false,
        round_output: false,
      });
      expect(raw.pmv).toBeGreaterThan(2);
      expect(pmv_ppd_iso(params).warnings).toEqual([
        expect.objectContaining({
          key: "pmv",
          role: "output",
          value: raw.pmv,
          bound: { min: -2, max: 2 },
        }),
      ]);
    });

    test("every check gives its row, in upstream's order, with the gate on and off", () => {
      const params = {
        tdb: 35,
        tr: 45,
        vr: 1.5,
        rh: 95,
        met: 0.5,
        clo: 2.5,
      };
      const on = pmv_ppd_iso({ ...params, limit_inputs: true });
      const off = pmv_ppd_iso({ ...params, limit_inputs: false });
      expect(on.pmv).toBeNaN();
      expect(Number.isFinite(off.pmv)).toBe(true);
      expect(off.warnings).toEqual(on.warnings);
      expect(on.warnings.map((w) => [w.key, w.role])).toEqual([
        ["tdb", "input"],
        ["tr", "input"],
        ["vr", "input"],
        ["met", "input"],
        ["clo", "input"],
        ["pa", "derived"],
        ["pmv", "output"],
      ]);
    });

    test.each(iso_rows)(
      "a NaN that limit_inputs caused comes with a row (fixture #%#)",
      ({ inputs }) => {
        const run = (limit_inputs: boolean) =>
          pmv_ppd_iso({
            ...inputs,
            standard: Standard.iso_7730_2005,
            limit_inputs,
          } as unknown as Inputs);
        const limited = run(true);
        const caused_by_limits =
          Number.isNaN(limited.pmv) && Number.isFinite(run(false).pmv);
        expect(limited.warnings.length > 0).toBe(caused_by_limits);
      },
    );
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
        } as unknown as Inputs;
        expect(() => pmv_ppd_iso(params)).toThrow(TypeError);
      },
    );

    // A missing quantity is a TypeError, as a missing keyword argument is in
    // Python.
    test.each(quantities)("throws TypeError if %s is missing", (key) => {
      const params: Partial<Inputs> = { ...neutral };
      delete params[key];
      // @ts-expect-error deliberately omitting a quantity to test the runtime TypeError
      expect(() => pmv_ppd_iso(params)).toThrow(TypeError);
    });

    // ADR 0001: a non-finite number throws rather than propagating as NaN.
    test.each([...quantities, "wme"] as const)(
      "throws TypeError if %s is not finite",
      (key) => {
        for (const bad of [NaN, Infinity, -Infinity]) {
          expect(() => pmv_ppd_iso({ ...neutral, [key]: bad })).toThrow(
            TypeError,
          );
        }
      },
    );

    // The quantities and the standard were positional before v2 (ADR 0002). A
    // call still written that way throws rather than running on anything else.
    test("throws TypeError if called positionally", () => {
      // @ts-expect-error the model takes one params object
      expect(() => pmv_ppd_iso(25, 25, 0.1, 50, 1.2, 0.5)).toThrow(TypeError);
      expect(() =>
        // @ts-expect-error the model takes one params object
        pmv_ppd_iso(25, 25, 0.1, 50, 1.2, 0.5, 0, Standard.iso_7730_2025),
      ).toThrow(TypeError);
      // @ts-expect-error null is not a params object
      expect(() => pmv_ppd_iso(null)).toThrow(TypeError);
      // @ts-expect-error the params object is required
      expect(() => pmv_ppd_iso()).toThrow(TypeError);
    });

    // The shared PMV module accepts ASHRAE 55 too; this wrapper must not hand
    // it through and compute the ASHRAE equation under its name.
    test("throws Error if standard is the ASHRAE 55 standard", () => {
      expect(() =>
        pmv_ppd_iso({
          ...neutral,
          // @ts-expect-error standard is "7730-2005" or "7730-2025"; the runtime check is under test
          standard: Standard.ashrae_55_2023,
        }),
      ).toThrow(Error);
    });

    test("throws Error if units is not a valid enum", () => {
      expect(() =>
        pmv_ppd_iso({
          ...neutral,
          // @ts-expect-error units is "SI" or "IP"; the runtime check is under test
          units: "INVALID",
        }),
      ).toThrow(Error);
    });

    test.each(["limit_inputs", "round_output"] as const)(
      "throws TypeError if %s is not a boolean",
      (key) => {
        // Cast: deliberately passing a string to test the runtime TypeError.
        const params = {
          ...neutral,
          [key]: "true",
        } as unknown as Inputs;
        expect(() => pmv_ppd_iso(params)).toThrow(TypeError);
      },
    );

    test("a switch passed as undefined takes its default", () => {
      expect(
        // @ts-expect-error the Params type lacks ADR 0019's `?: T | undefined`; the runtime default is under test
        pmv_ppd_iso({
          ...neutral,
          wme: undefined,
          standard: undefined,
          units: undefined,
          limit_inputs: undefined,
          round_output: undefined,
        }),
      ).toEqual(pmv_ppd_iso(neutral));
    });
  });

  describe("tsv classification (left-inclusive)", () => {
    // At comfortable neutral conditions (25°C, symmetric), pmv should be ~0, so tsv should be "Neutral"
    test("returns tsv field with correct value", () => {
      expect(pmv_ppd_iso(neutral).tsv).toBe("Neutral");
    });

    test("tsv is NaN when pmv is NaN (out of range)", () => {
      const result = pmv_ppd_iso({
        tdb: 35,
        tr: 35,
        vr: 0.5,
        rh: 80,
        met: 2.0,
        clo: 0.3,
      });
      expect(result.pmv).toBeNaN();
      expect(result.tsv).toBeNaN();
    });

    // This test used to assert the opposite: tsv from the unrounded pmv whatever
    // round_output was (at tdb=26.4, whose pmv ≈ 0.5044 gives "Slightly Warm"
    // either way, so it could not tell the two rules apart). Upstream classifies
    // the pmv it returns, after rounding (pmv_ppd_iso.py in 4.6.0), so the label
    // never disagrees with the number shown. Expected values from
    // pythermalcomfort 4.6.0 at these inputs.
    test("tsv is classified from the pmv returned, rounded or not", () => {
      // pmv ≈ 0.4983, just below the 0.5 edge. ISO is left-inclusive, so the
      // rounded 0.5 opens [0.5, 1.5) = "Slightly Warm", while the unrounded
      // value stays in [-0.5, 0.5) = "Neutral".
      const edge = { ...neutral, tdb: 26.38, tr: 26.38, limit_inputs: false };
      const result_rounded = pmv_ppd_iso({ ...edge, round_output: true });
      const result_unrounded = pmv_ppd_iso({ ...edge, round_output: false });
      expect(result_rounded.pmv).toBe(0.5);
      expect(result_rounded.tsv).toBe("Slightly Warm");
      expect(result_unrounded.pmv).toBeLessThan(0.5);
      expect(result_unrounded.tsv).toBe("Neutral");
    });

    test("neutral comfort (pmv ~0) -> Neutral", () => {
      expect(pmv_ppd_iso(neutral).tsv).toBe("Neutral");
    });

    test("warm comfort (pmv ~1) -> Slightly Warm", () => {
      // Using tdb=26.4, rh=50 produces pmv ≈ 0.5044, classifying into
      // the left-inclusive interval [0.5, 1.5) = "Slightly Warm".
      // This test verifies the exact classification, not a set of possibilities,
      // so that rounding errors or classification bugs are caught.
      const result = pmv_ppd_iso({
        ...neutral,
        tdb: 26.4,
        tr: 26.4,
        limit_inputs: false,
      });
      // Must be exactly "Slightly Warm", not one of three options
      expect(result.tsv).toBe("Slightly Warm");
    });
  });

  // Upstream has no ISO category (ADR 0001, consumer-needed), so there is no
  // test_pmv_ppd_iso.py counterpart to mirror.
  describe("category under ISO 7730:2005 (Annex A Table A.1)", () => {
    const iso2005 = { standard: Standard.iso_7730_2005 } as const;

    test("the bins cut |pmv| at 0.2, 0.5 and 0.7, left-inclusive, frozen", () => {
      expect(PMV_CATEGORY_BINS_ISO_7730_2005).toEqual({
        edges: [0.2, 0.5, 0.7, 10],
        labels: ["A", "B", "C", "none"],
        right: false,
      });
      expect(Object.isFrozen(PMV_CATEGORY_BINS_ISO_7730_2005)).toBe(true);
      expect(Object.isFrozen(PMV_CATEGORY_BINS_ISO_7730_2005.edges)).toBe(true);
      expect(Object.isFrozen(PMV_CATEGORY_BINS_ISO_7730_2005.labels)).toBe(
        true,
      );
    });

    // No fixture row puts pmv on an edge, so the inputs are built around the
    // model's own roots: the tdb whose pmv is exactly the edge, and the
    // adjacent double one step toward pmv = 0. pythermalcomfort 4.7.0 gives
    // the same pmv at each, and the pmv is asserted too, so each row proves
    // where it lands.
    const at = (rh: number, met: number, t: number) =>
      pmv_ppd_iso({
        tdb: t,
        tr: t,
        vr: 0.1,
        rh,
        met,
        clo: 0.5,
        round_output: false,
        limit_inputs: false,
        ...iso2005,
      });

    test.each(EDGES)(
      "pmv $id is category $iso2005",
      ({ rh, met, t, pmv, iso2005: category }) => {
        const result = at(rh, met, t);
        expect(result.pmv).toBe(pmv);
        expect(result.category).toBe(category);
      },
    );

    test("is none well past 0.7, on both signs", () => {
      const warm = at(50, 1.2, 29);
      expect(warm.pmv).toBeCloseTo(1.3, 2);
      expect(warm.category).toBe("none");
      const cool = at(50, 1.2, 18);
      expect(cool.pmv).toBeCloseTo(-2.06, 2);
      expect(cool.category).toBe("none");
    });

    test("is NaN when the applicability gate fails", () => {
      // vr = 1.2 m/s breaks only ISO 7730's 1 m/s bound; the pmv, ≈ 0.26,
      // is otherwise category B.
      const outOfRange = { ...neutral, tdb: 28, tr: 28, vr: 1.2, ...iso2005 };
      const result = pmv_ppd_iso(outOfRange);
      expect(result.pmv).toBeNaN();
      expect(result.category).toBeNaN();
      // The same call with the gate off is classified.
      expect(
        pmv_ppd_iso({ ...outOfRange, limit_inputs: false }),
      ).toHaveProperty("category", "B");
    });

    // Both pmvs print 0.5, so the rounded value cannot tell them apart; the
    // category reads the unrounded one. pythermalcomfort 4.6.0 gives the same
    // unrounded pmvs: 0.4983292256773187 and 0.5013467793369747.
    test("is read from the unrounded pmv", () => {
      const printed = (t: number) =>
        pmv_ppd_iso({ ...neutral, tdb: t, tr: t, ...iso2005 });
      const below = printed(26.38);
      expect(below.pmv).toBe(0.5);
      expect(below.category).toBe("B");
      const above = printed(26.39);
      expect(above.pmv).toBe(0.5);
      expect(above.category).toBe("C");
    });
  });

  describe("category under ISO 7730:2025 (Annex A Table A.1)", () => {
    const iso2025 = { standard: Standard.iso_7730_2025 } as const;

    test("the bins cut |pmv| at 0.2, 0.5, 0.7 and 1.0, left-inclusive, frozen", () => {
      expect(PMV_CATEGORY_BINS_ISO_7730_2025).toEqual({
        edges: [0.2, 0.5, 0.7, 1.0, 10],
        labels: ["I", "II", "III", "IV", "none"],
        right: false,
      });
      expect(Object.isFrozen(PMV_CATEGORY_BINS_ISO_7730_2025)).toBe(true);
      expect(Object.isFrozen(PMV_CATEGORY_BINS_ISO_7730_2025.edges)).toBe(true);
      expect(Object.isFrozen(PMV_CATEGORY_BINS_ISO_7730_2025.labels)).toBe(
        true,
      );
    });

    // The roots of the 2005 block, whose pmv the edition does not change,
    // and the same construction at ±1.0.
    const at = (rh: number, met: number, t: number) =>
      pmv_ppd_iso({
        tdb: t,
        tr: t,
        vr: 0.1,
        rh,
        met,
        clo: 0.5,
        round_output: false,
        limit_inputs: false,
        ...iso2025,
      });

    test.each(EDGES)(
      "pmv $id is category $iso2025",
      ({ rh, met, t, pmv, iso2025: category }) => {
        const result = at(rh, met, t);
        expect(result.pmv).toBe(pmv);
        expect(result.category).toBe(category);
      },
    );

    test("is none well past 1.0, on both signs", () => {
      const warm = at(50, 1.2, 29);
      expect(warm.pmv).toBeCloseTo(1.3, 2);
      expect(warm.category).toBe("none");
      const cool = at(50, 1.2, 18);
      expect(cool.pmv).toBeCloseTo(-2.06, 2);
      expect(cool.category).toBe("none");
    });

    test("is read by the 2025 bins in a call without a standard", () => {
      // pmv ≈ 0.26: category II under 2025, B under 2005.
      const warm = {
        ...neutral,
        tdb: 28,
        tr: 28,
        vr: 1.2,
        limit_inputs: false,
      };
      expect(pmv_ppd_iso(warm).pmv).toBeCloseTo(0.26, 2);
      expect(pmv_ppd_iso(warm)).toHaveProperty("category", "II");
    });

    test("is NaN when the applicability gate fails", () => {
      // vr = 1.2 m/s breaks only ISO 7730's 1 m/s bound; the pmv, ≈ 0.26,
      // is otherwise category II.
      const outOfRange = {
        ...neutral,
        tdb: 28,
        tr: 28,
        vr: 1.2,
        ...iso2025,
      };
      const result = pmv_ppd_iso(outOfRange);
      expect(result.pmv).toBeNaN();
      expect(result.category).toBeNaN();
      // The same call with the gate off is classified.
      expect(
        pmv_ppd_iso({ ...outOfRange, limit_inputs: false }),
      ).toHaveProperty("category", "II");
    });
  });
});
