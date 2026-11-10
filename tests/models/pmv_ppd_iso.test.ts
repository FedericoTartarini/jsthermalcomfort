import { describe, expect, test } from "vitest";
import {
  pmv_ppd_iso,
  PMV_CATEGORY_BINS_ISO_7730,
  PMV_PPD_ISO_INFO,
  UTCI_INFO,
} from "../../src/models/index.ts";
import { Standard, Units } from "../../src/utilities/index.ts";
import { v_relative } from "../../src/environment/index.ts";
import { pmv_ppd_iso as pmv_ppd_iso_from_root } from "../../src/index.ts";
import { round } from "../../src/_internal/round.ts";
import { test_data_urls } from "./comftest.ts";
import { describeModelContract } from "./modelContract.ts";
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
  test_data_urls.pmvPpd,
);

// As upstream, the rows without a standard and those whose label lower-cases to "iso" (tests/test_pmv_ppd_iso.py:25-27).
const iso_rows = assertNonEmptyRows(
  reference_table.data.filter(
    ({ inputs }) => (inputs.standard ?? "ISO") === "ISO",
  ),
  "pmv_ppd_iso ISO rows",
);

// Mirrors pythermalcomfort v4.8.0 tests/test_pmv_ppd_iso.py.
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
      expect(results[1]?.pmv).toBe(null);
      expect(results[1]?.ppd).toBe(null);

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
          }).pmv ?? NaN,
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
            }).pmv ?? NaN,
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
        expect(result.pmv).toBe(null);
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
      expect(result.pmv).toBe(null);
      expect(result.ppd).toBe(null);
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

// Each category edge's tdb = tr whose unrounded pmv is the edge, and the next double toward 0;
// pythermalcomfort 4.7.0 gives the same pmv at every row (register, pmv_ppd_iso's Notes).
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

const neutral = { tdb: 25, tr: 25, vr: 0.1, rh: 50, met: 1.2, clo: 0.5 };

describeModelContract(pmv_ppd_iso, PMV_PPD_ISO_INFO, neutral, {
  ...neutral,
  tdb: 35,
  rh: 30,
});

describe("pmv_ppd_iso (JS-only)", () => {
  // A JS-only test passes an invalid input through here (decision 175).
  const call = (inputs: unknown) => () => pmv_ppd_iso(inputs as Inputs);

  describe("values", () => {
    // The docstring's examples (models/pmv_ppd_iso.py:121-154), measured on pythermalcomfort 4.7.0.
    test("the examples print upstream's values", () => {
      const results = pmv_ppd_iso({
        tdb: 25,
        tr: 25,
        vr: v_relative(0.1, 1.4),
        rh: 50,
        met: 1.4,
        clo: 0.5,
        standard: "7730-2025",
      });
      expect(results.pmv).toBe(0.17);
      expect(results.ppd).toBe(5.6);

      const result = [22, 25].map((tdb) =>
        pmv_ppd_iso({
          tdb,
          tr: 25,
          vr: 0.1,
          rh: 50,
          met: 1.4,
          clo: 0.5,
          standard: "7730-2025",
        }),
      );
      expect(result.map(({ pmv }) => pmv)).toEqual([-0, 0.41]);
      expect(result.map(({ ppd }) => ppd)).toEqual([5, 8.5]);
    });

    test("takes units in any case, and the constant, as upstream", () => {
      const ip = { tdb: 77, tr: 77, vr: 0.328, rh: 50, met: 1.2, clo: 0.5 };
      const upper = pmv_ppd_iso({ ...ip, units: "IP" });
      expect(pmv_ppd_iso({ ...ip, units: Units.IP })).toEqual(upper);
      expect(call({ ...ip, units: "ip" })()).toEqual(upper);
    });
  });

  describe("errors", () => {
    const message =
      "PMV calculations can only be performed in compliance with ISO 7730-2005 or ISO 7730-2025";

    // models/pmv_ppd_iso.py:180-186; a value that is not a string raises AttributeError there.
    test.each(["random", Standard.ashrae_55_2023, Standard.iso_7933_2023])(
      "standard %s throws upstream's message",
      (standard) => {
        expect(call({ ...neutral, standard })).toThrow(new RangeError(message));
      },
    );

    test("a standard that is not a string throws upstream's message", () => {
      expect(call({ ...neutral, standard: 7730 })).toThrow(
        new TypeError(message),
      );
    });

    // pythermalcomfort 4.7.0 raises StopIteration("Max iterations exceeded") here (decision 69).
    test.each([true, false])(
      "a loop that does not converge throws upstream's message (limit_inputs %s)",
      (limit_inputs) => {
        expect(
          call({ ...neutral, vr: 0, met: 1, clo: 20, limit_inputs }),
        ).toThrow(new Error("Max iterations exceeded"));
      },
    );
  });

  describe("PMV_PPD_ISO_INFO", () => {
    // models/pmv_ppd_iso.py:38, :181.
    test("standards are ISO 7730's two editions, the default first", () => {
      expect(PMV_PPD_ISO_INFO.standards).toEqual(["7730-2025", "7730-2005"]);
      expect(PMV_PPD_ISO_INFO.inputs.standard.allowed).toBe(
        PMV_PPD_ISO_INFO.standards,
      );
    });

    test("units is the entry the other models' INFO holds", () => {
      expect(PMV_PPD_ISO_INFO.inputs.units).toBe(UTCI_INFO.inputs.units);
    });

    test("category's classifier is the default edition's bins", () => {
      expect(PMV_PPD_ISO_INFO.outputs.category.classifier).toBe(
        PMV_CATEGORY_BINS_ISO_7730[Standard.iso_7730_2025],
      );
    });
  });

  describe("applicability limits", () => {
    // tdb 35 °C is outside ISO 7730's 10-30 °C.
    test("out-of-range inputs should return null under ISO standard", () => {
      const result = pmv_ppd_iso({
        tdb: 35,
        tr: 35,
        vr: 0.5,
        rh: 80,
        met: 2.0,
        clo: 0.3,
      });
      expect(result.pmv).toBe(null);
      expect(result.ppd).toBe(null);
    });

    // Issue #180: ISO 7730's met lower bound, 0.8, inclusive.
    test("met=0.7 (below lower bound) returns null when limit_inputs is enabled", () => {
      const result = pmv_ppd_iso({ ...neutral, met: 0.7, limit_inputs: true });
      expect(result.pmv).toBe(null);
      expect(result.ppd).toBe(null);
    });

    test("met=0.8 (inclusive lower bound) returns valid numbers when limit_inputs is enabled", () => {
      const result = pmv_ppd_iso({ ...neutral, met: 0.8, limit_inputs: true });
      expect(Number.isFinite(result.pmv)).toBe(true);
      expect(Number.isFinite(result.ppd)).toBe(true);
    });

    test("met=0.7 returns valid numbers when limit_inputs is disabled (opt-out)", () => {
      const result = pmv_ppd_iso({ ...neutral, met: 0.7, limit_inputs: false });
      expect(Number.isFinite(result.pmv)).toBe(true);
      expect(Number.isFinite(result.ppd)).toBe(true);
    });
  });

  // Issue #195: ISO 7730 Clause 4's 0-2700 Pa vapour pressure limit (models/pmv_ppd_iso.py:196-204).
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
      "pa just above 2700 Pa gives a null pmv, ppd and tsv (tdb=$tdb)",
      ({ tdb, rh }) => {
        const result = call(tdb, rh + STEP_OVER);
        expect(result.pmv).toBe(null);
        expect(result.ppd).toBe(null);
        expect(result.tsv).toBe(null);
      },
    );

    // Every input is inside its limit, and the ungated pmv inside [-2, 2].
    test("the null comes from the vapour pressure bound, not the PMV output gate", () => {
      const params = { tdb: 30, tr: 30, vr: 0.1, rh: 90, met: 1.2, clo: 0.5 };
      const unlimited = pmv_ppd_iso({ ...params, limit_inputs: false });
      expect(Math.abs(unlimited.pmv ?? NaN)).toBeLessThan(2);
      expect(pmv_ppd_iso(params).pmv).toBe(null);
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

    test("an input outside its bound gives an input row with INFO's bound", () => {
      // rh 30 keeps pa inside its bound at 35 °C, so tdb is the only row.
      const { warnings } = pmv_ppd_iso({ ...neutral, tdb: 35, rh: 30 });
      expect(warnings).toEqual([
        {
          kind: "range",
          key: "tdb",
          role: "input",
          value: 35,
          unit: "°C",
          bound: { min: 10.0, max: 30.0 },
        },
      ]);
      expect(warnings[0]).toHaveProperty(
        "bound",
        PMV_PPD_ISO_INFO.inputs.tdb.applicability,
      );
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
        {
          kind: "range",
          key: "pa",
          role: "derived",
          value: kernelPa(30, 95),
          unit: "Pa",
          bound: { min: 0.0, max: 2700.0 },
        },
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
        {
          kind: "range",
          key: "pmv",
          role: "output",
          value: raw.pmv,
          unit: null,
          bound: { min: -2, max: 2 },
        },
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
      expect(on.pmv).toBe(null);
      expect(Number.isFinite(off.pmv)).toBe(true);
      expect(off.warnings).toEqual(on.warnings);
      expect(
        on.warnings.map((w) => w.kind === "range" && [w.key, w.role]),
      ).toEqual([
        ["tdb", "input"],
        ["tr", "input"],
        ["vr", "input"],
        ["met", "input"],
        ["clo", "input"],
        ["pa", "derived"],
        ["pmv", "output"],
      ]);
    });

    test("under IP the rows hold the SI values upstream compares", () => {
      // 95 °F is 35 °C, and 0.328 fps 0.0999695... m/s.
      const { warnings } = pmv_ppd_iso({
        tdb: 95,
        tr: 77,
        vr: 0.328,
        rh: 30,
        met: 1.2,
        clo: 0.5,
        units: "IP",
      });
      expect(warnings).toEqual([
        expect.objectContaining({ key: "tdb", value: 35, unit: "°C" }),
      ]);
    });

    test.each(iso_rows)(
      "a null under the gate never comes without a row, and no notice (fixture #%#)",
      ({ inputs }) => {
        const run = (limit_inputs: boolean) =>
          pmv_ppd_iso({
            ...inputs,
            standard: Standard.iso_7730_2005,
            limit_inputs,
          } as unknown as Inputs);
        const limited = run(true);
        const caused_by_limits =
          limited.pmv === null && Number.isFinite(run(false).pmv);
        expect(limited.warnings.length > 0).toBe(caused_by_limits);
        expect(limited.warnings.every((w) => w.kind === "range")).toBe(true);
      },
    );
  });

  describe("tsv classification (left-inclusive)", () => {
    test("returns tsv field with correct value", () => {
      expect(pmv_ppd_iso(neutral).tsv).toBe("Neutral");
    });

    test("tsv is null when pmv is null (out of range)", () => {
      const result = pmv_ppd_iso({
        tdb: 35,
        tr: 35,
        vr: 0.5,
        rh: 80,
        met: 2.0,
        clo: 0.3,
      });
      expect(result.pmv).toBe(null);
      expect(result.tsv).toBe(null);
    });

    // models/pmv_ppd_iso.py:219-226: tsv classifies the pmv returned, after rounding.
    test("tsv is classified from the pmv returned, rounded or not", () => {
      // pmv ≈ 0.4983 rounds to 0.5, which opens the left-inclusive [0.5, 1.5).
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
      // pmv ≈ 0.5044 is in the left-inclusive [0.5, 1.5).
      const result = pmv_ppd_iso({
        ...neutral,
        tdb: 26.4,
        tr: 26.4,
        limit_inputs: false,
      });
      expect(result.tsv).toBe("Slightly Warm");
    });
  });

  // An added output with no upstream test to mirror (deviation pmv_ppd_iso-4).
  describe("category under ISO 7730:2005 (Annex A Table A.1)", () => {
    const iso2005 = { standard: Standard.iso_7730_2005 } as const;

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
        // Exact, since the bits at the edge are the subject: a failure on a new
        // engine is a parity finding to investigate, not a tolerance to widen.
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

    test("is null when the applicability gate fails", () => {
      // vr = 1.2 m/s breaks only ISO 7730's 1 m/s bound; the pmv, ≈ 0.26,
      // is otherwise category B.
      const out_of_range = { ...neutral, tdb: 28, tr: 28, vr: 1.2, ...iso2005 };
      const result = pmv_ppd_iso(out_of_range);
      expect(result.pmv).toBe(null);
      expect(result.category).toBe(null);
      // The same call with the gate off is classified.
      expect(
        pmv_ppd_iso({ ...out_of_range, limit_inputs: false }),
      ).toHaveProperty("category", "B");
    });

    // Both pmvs print 0.5; the category reads the unrounded ones, about 0.4983 and 0.5013.
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
        // Exact, since the bits at the edge are the subject: a failure on a new
        // engine is a parity finding to investigate, not a tolerance to widen.
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

    test("is null when the applicability gate fails", () => {
      // vr = 1.2 m/s breaks only ISO 7730's 1 m/s bound; the pmv, ≈ 0.26,
      // is otherwise category II.
      const out_of_range = {
        ...neutral,
        tdb: 28,
        tr: 28,
        vr: 1.2,
        ...iso2025,
      };
      const result = pmv_ppd_iso(out_of_range);
      expect(result.pmv).toBe(null);
      expect(result.category).toBe(null);
      // The same call with the gate off is classified.
      expect(
        pmv_ppd_iso({ ...out_of_range, limit_inputs: false }),
      ).toHaveProperty("category", "II");
    });
  });

  test("is exported from the package root as from its subpath", () => {
    expect(pmv_ppd_iso_from_root).toBe(pmv_ppd_iso);
  });
});
