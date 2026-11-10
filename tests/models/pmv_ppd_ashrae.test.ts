import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import {
  classifyFromBins,
  pmv_ppd_ashrae,
  PMV_PPD_ASHRAE_INFO,
  pmv_ppd_iso,
  PMV_PPD_ISO_INFO,
  UTCI_INFO,
} from "../../src/models/index.ts";
import {
  clo_dynamic_ashrae,
  Standard,
  Units,
} from "../../src/utilities/index.ts";
import { v_relative } from "../../src/environment/index.ts";
import { pmv_ppd_ashrae as from_root } from "../../src/index.ts";
import { ASHRAE_55_LIMITS } from "../../src/_internal/ashrae55.ts";
import { read_data, upstream_returns } from "../parity/harness.ts";
import { test_data_urls } from "./comftest.ts";
import { describeModelContract, isDeepFrozen } from "./modelContract.ts";
import {
  approx,
  assertNonEmptyRows,
  loadTestData,
  validateResult,
} from "./testUtils.ts";

type Inputs = Parameters<typeof pmv_ppd_ashrae>[0];

// Array rows run element-wise.
const { testData: reference_table, tolerances: tolerance } = await loadTestData(
  test_data_urls.pmvPpd,
);

// As upstream, the rows whose label lower-cases to "ashrae" (tests/test_pmv_ppd_ashrae.py:23-25).
const ashrae_rows = assertNonEmptyRows(
  reference_table.data.filter(
    ({ inputs }) => String(inputs.standard).toLowerCase() === "ashrae",
  ),
  "pmv_ppd_ashrae ASHRAE rows",
);

// Mirrors pythermalcomfort v4.8.0 tests/test_pmv_ppd_ashrae.py.
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
      const airspeed: [number, number, number, number, number | null][] = [
        [26, 0.9, 1.1, 0.5, null],
        [24, 0.6, 1.1, 0.5, null],
        [22, 0.3, 1.1, 0.5, null],
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
        expect(result.pmv).toBe(null);
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
      // Upstream's compliance=np.bool_(False) (tests/test_pmv_ppd_ashrae.py:107).
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
      expect(Math.abs(result.pmv ?? NaN) > 0.5).toBe(true);
      expect(result.compliance).toBe(false);

      // Also test inputs that produce PMV close to upper bound
      result = at(27.45);
      expect(Math.abs(result.pmv ?? NaN) > 0.5).toBe(true);
      // Upstream's `is False or == np.bool_(False)` (tests/test_pmv_ppd_ashrae.py:176).
      expect(result.compliance).toBe(false);
    });

    // Upstream's tdb = [25, 25, 60], element-wise.
    test("test_compliance_is_float_with_nan", () => {
      const results = [25, 25, 60].map((tdb) =>
        pmv_ppd_ashrae({ tdb, tr: 25, vr: 0.1, rh: 50, met: 1.2, clo: 0.5 }),
      );
      expect(results.flatMap(({ warnings }) => warnings)).toEqual([
        expect.objectContaining({ key: "tdb", value: 60 }),
      ]);
      expect(
        results.map(({ compliance }) =>
          compliance === null ? null : typeof compliance,
        ),
      ).toEqual(["boolean", "boolean", null]);
      expect(results.map(({ compliance }) => compliance === null)).toEqual([
        false,
        false,
        true,
      ]);
    });

    // Upstream's tdb = [25, np.nan], element-wise; deviation _shared-7.
    test("test_compliance_nan_where_pmv_undefined", () => {
      const inputs = {
        tr: 25,
        vr: 0.1,
        rh: 50,
        met: 1.2,
        clo: 0.5,
        limit_inputs: false,
      };
      expect(pmv_ppd_ashrae({ ...inputs, tdb: 25 }).compliance).toBe(true);
      expect(() => pmv_ppd_ashrae({ ...inputs, tdb: NaN })).toThrow(RangeError);
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
      expect(result.pmv).toBe(null);
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

const neutral = { tdb: 25, tr: 25, vr: 0.1, rh: 50, met: 1.2, clo: 0.5 };
const notice = {
  kind: "notice",
  message: "Cooling effect could not be calculated. Returning 0.",
};
// pythermalcomfort 4.7.0 warns "Cooling effect could not be calculated. Returning 0." here.
const unbracketed = { tdb: 45, tr: 45, vr: 0.5, rh: 90, met: 1.2, clo: 0.5 };
const range = (key: string, value: number, bound: object) => ({
  kind: "range",
  key,
  role: "input",
  value,
  unit: PMV_PPD_ASHRAE_INFO.inputs[key as "tdb"].unit,
  bound,
});

describeModelContract(pmv_ppd_ashrae, PMV_PPD_ASHRAE_INFO, neutral, {
  ...neutral,
  tdb: 45,
});

// What upstream's tests leave out, measured on pythermalcomfort 4.7.0 in the
// parity image, and compliance on 4.8.0.
describe("pmv_ppd_ashrae (JS-only)", () => {
  // A JS-only test passes an invalid input through here (decision 175).
  const call = (inputs: unknown) => () => pmv_ppd_ashrae(inputs as Inputs);

  describe("values", () => {
    // The docstring's examples (models/pmv_ppd_ashrae.py:121-155).
    test("the examples print upstream's values", () => {
      const met = 1.4;
      const results = pmv_ppd_ashrae({
        tdb: 25,
        tr: 25,
        vr: v_relative(0.1, met),
        rh: 50,
        met,
        clo: clo_dynamic_ashrae(0.5, met),
        standard: "55-2023",
      });
      expect(results.pmv).toBe(-0);
      expect(results.ppd).toBe(5);
      expect(results.compliance).toBe(true);

      const result = [22, 25, 28].map((tdb) =>
        pmv_ppd_ashrae({
          tdb,
          tr: 25,
          vr: 0.1,
          rh: 50,
          met: 1.4,
          clo: 0.5,
          standard: "55-2023",
        }),
      );
      expect(result.map(({ pmv }) => pmv)).toEqual([-0, 0.41, 0.81]);
      expect(result.map(({ ppd }) => ppd)).toEqual([5, 8.5, 19]);
      expect(result.map(({ tsv }) => tsv)).toEqual([
        "Neutral",
        "Neutral",
        "Slightly Warm",
      ]);
      expect(result.map(({ compliance }) => compliance)).toEqual([
        true,
        true,
        false,
      ]);
    });

    test("takes units in any case, and the constant, as upstream", () => {
      const ip = { tdb: 77, tr: 77, vr: 0.328, rh: 50, met: 1.2, clo: 0.5 };
      const upper = pmv_ppd_ashrae({ ...ip, units: "IP" });
      expect(upper).toMatchObject({
        pmv: 0.08,
        ppd: 5.1,
        tsv: "Neutral",
        compliance: true,
      });
      expect(pmv_ppd_ashrae({ ...ip, units: Units.IP })).toEqual(upper);
      expect(call({ ...ip, units: "ip" })()).toEqual(upper);
    });

    test("is exported from the package root as from its subpath", () => {
      expect(from_root).toBe(pmv_ppd_ashrae);
    });
  });

  describe("errors", () => {
    const message = (model: string) =>
      `Model '${model}' is not supported. Supported models are: 55-2023.`;

    // models/pmv_ppd_ashrae.py:182-188, which lower-cases the value before its message.
    test.each([
      ["random", "random"],
      ["RANDOM", "random"],
      ["55-2020", "55-2020"],
      [Standard.iso_7730_2025, "7730-2025"],
      [Standard.iso_7933_2023, "7933-2023"],
    ])("standard %s throws upstream's message", (standard, lowered) => {
      expect(call({ ...neutral, standard })).toThrow(
        new RangeError(message(lowered)),
      );
    });

    // Deviation pmv_ppd_ashrae-9: upstream's model.lower() raises AttributeError here.
    test("a standard that is not a string throws upstream's message for it", () => {
      expect(call({ ...neutral, standard: 7730 })).toThrow(
        new TypeError(message("7730")),
      );
    });
  });

  // Deviation pmv_ppd_ashrae-1.
  describe("PMV_PPD_ASHRAE_INFO", () => {
    // models/pmv_ppd_ashrae.py:39, :183.
    test("standards are the one ASHRAE 55 edition upstream supports", () => {
      expect(PMV_PPD_ASHRAE_INFO.standards).toEqual(["55-2023"]);
      expect(PMV_PPD_ASHRAE_INFO.inputs.standard.allowed).toBe(
        PMV_PPD_ASHRAE_INFO.standards,
      );
    });

    test("shares ASHRAE 55's bounds and BaseInputs' units, not copies", () => {
      const { inputs } = PMV_PPD_ASHRAE_INFO;
      expect(inputs.tdb.applicability).toBe(ASHRAE_55_LIMITS.tdb);
      expect(inputs.tr.applicability).toBe(ASHRAE_55_LIMITS.tr);
      expect(inputs.vr.applicability).toBe(ASHRAE_55_LIMITS.v);
      expect(inputs.met.applicability).toBe(ASHRAE_55_LIMITS.met);
      expect(inputs.clo.applicability).toBe(ASHRAE_55_LIMITS.clo);
      expect(inputs.units).toBe(UTCI_INFO.inputs.units);
    });
  });

  describe("compliance", () => {
    const at = (t: number, round_output = true) =>
      pmv_ppd_ashrae({
        tdb: t,
        tr: t,
        vr: 0.1,
        rh: 50,
        met: 1.0,
        clo: 0.5,
        round_output,
      });

    // Both pmvs round to 0.5; upstream gives 0.49960946928969807 and 0.5033653770344304.
    test("is read from the unrounded pmv", () => {
      expect(at(27.42).pmv).toBe(0.5);
      expect(at(27.42).compliance).toBe(true);
      expect(at(27.43).pmv).toBe(0.5);
      expect(at(27.43).compliance).toBe(false);
    });

    test("is the same whether round_output is on or off", () => {
      expect(approx(at(25, false).pmv, -0.40087108864648396)).toBe(true);
      expect(at(25, false).compliance).toBe(true);
      expect(at(25).compliance).toBe(true);
    });

    // models/pmv_ppd_ashrae.py:237: upstream masks it with np.nan.
    test("is null where the gate makes pmv null", () => {
      const result = pmv_ppd_ashrae({ ...neutral, tdb: 45 });
      expect(result.pmv).toBe(null);
      expect(result.compliance).toBe(null);
    });

    test("is false, not null, with limit_inputs off, even out of range", () => {
      const result = pmv_ppd_ashrae({
        ...neutral,
        tdb: 45,
        tr: 45,
        limit_inputs: false,
      });
      expect(result.pmv).toBe(6.6);
      expect(result.compliance).toBe(false);
    });

    // A clo below 0 overflows the kernel; upstream's _as_flag makes the NaN pmv's compliance NaN.
    test("is null where the kernel's pmv is NaN and the gate is off", () => {
      const result = pmv_ppd_ashrae({
        tdb: 45,
        tr: 5,
        vr: 2.5,
        rh: 50,
        met: 0.9,
        clo: -0.1,
        airspeed_control: false,
        limit_inputs: false,
      });
      expect(result.pmv).toBe(null);
      expect(result.compliance).toBe(null);
    });
  });

  describe("warnings rows", () => {
    test("empty at the neutral inputs", () => {
      expect(pmv_ppd_ashrae(neutral).warnings).toEqual([]);
    });

    test("an input outside its bound gives a range row with INFO's bound", () => {
      const { warnings } = pmv_ppd_ashrae({ ...neutral, tdb: 45 });
      expect(warnings).toEqual([range("tdb", 45, { min: 10.0, max: 40.0 })]);
      expect(warnings[0]).toHaveProperty(
        "bound",
        PMV_PPD_ASHRAE_INFO.inputs.tdb.applicability,
      );
    });

    // Deviation pmv_ppd_ashrae-3.
    test("every check gives its row, in upstream's order, with the gate on and off", () => {
      const inputs = {
        tdb: 45,
        tr: 5,
        vr: 2.5,
        rh: 50,
        met: 0.9,
        clo: -0.1,
        airspeed_control: false,
      };
      const on = pmv_ppd_ashrae(inputs);
      const off = pmv_ppd_ashrae({ ...inputs, limit_inputs: false });
      expect(on.warnings).toEqual([
        notice,
        range("tdb", 45, ASHRAE_55_LIMITS.tdb),
        range("tr", 5, ASHRAE_55_LIMITS.tr),
        range("vr", 2.5, ASHRAE_55_LIMITS.v),
        range("vr", 2.5, { max: 0.8 }),
        range("met", 0.9, ASHRAE_55_LIMITS.met),
        range("clo", -0.1, ASHRAE_55_LIMITS.clo),
      ]);
      expect(off.warnings).toEqual(on.warnings);
    });

    test("under IP the rows hold the SI values upstream compares", () => {
      // 113 °F is 45 °C.
      const { warnings } = pmv_ppd_ashrae({
        tdb: 113,
        tr: 77,
        vr: 0.328,
        rh: 30,
        met: 1.2,
        clo: 0.5,
        units: "IP",
      });
      expect(warnings).toEqual([range("tdb", 45, ASHRAE_55_LIMITS.tdb)]);
    });

    // Deviation pmv_ppd_ashrae-2: cooling_effect's notice row passes through.
    test("a cooling effect that falls back to 0 gives upstream's notice, once", () => {
      const result = pmv_ppd_ashrae({ ...unbracketed, limit_inputs: false });
      expect(result.warnings).toEqual([
        notice,
        range("tdb", 45, ASHRAE_55_LIMITS.tdb),
        range("tr", 45, ASHRAE_55_LIMITS.tr),
      ]);
      expect(isDeepFrozen(result)).toBe(true);
    });

    // Deviation pmv_ppd_ashrae-4: upstream warns twice where the library returns one row.
    test("gives one notice where upstream warns, over the parity data", () => {
      const root = fileURLToPath(new URL("../..", import.meta.url));
      const cases = read_data(root, "pmv_ppd_ashrae").cases.filter(
        upstream_returns,
      );
      const counts = cases.map(({ inputs: { model, ...inputs }, warnings }) => [
        pmv_ppd_ashrae({
          ...inputs,
          standard: model,
        } as Inputs).warnings.filter(({ kind }) => kind === "notice").length,
        warnings.some(({ message }) => message === notice.message) ? 1 : 0,
      ]);
      expect(counts.filter(([, upstream]) => upstream === 1)).toHaveLength(88);
      for (const [library, upstream] of counts) expect(library).toBe(upstream);
    });

    test.each(ashrae_rows)(
      "a null under the gate never comes without a row (fixture #%#)",
      ({ inputs }) => {
        const run = (limit_inputs: boolean) =>
          pmv_ppd_ashrae({
            ...inputs,
            standard: Standard.ashrae_55_2023,
            limit_inputs,
          } as unknown as Inputs);
        const limited = run(true);
        const caused_by_limits =
          limited.pmv === null && Number.isFinite(run(false).pmv);
        const rows = limited.warnings.filter(({ kind }) => kind === "range");
        expect(rows.length > 0).toBe(caused_by_limits);
      },
    );
  });

  // _internal/ashrae55.py:45-83; clo < 0.7 and met < 1.3, the only case these limits apply to.
  describe("airspeed limits without airspeed control", () => {
    const ashrae = (tdb: number, vr: number, inputs: Partial<Inputs> = {}) =>
      pmv_ppd_ashrae({
        tdb,
        tr: tdb,
        vr,
        rh: 50,
        met: 1.0,
        clo: 0.5,
        airspeed_control: false,
        ...inputs,
      });

    test("to <= 23 °C: vr above 0.2 m/s gives a vr row against 0.2", () => {
      const result = ashrae(20, 0.3);
      expect(result.pmv).toBe(null);
      expect(result.warnings).toEqual([range("vr", 0.3, { max: 0.2 })]);
    });

    test("23 < to < 25.5 °C: vr above the operative-temperature limit gives a row against it", () => {
      // v_limit = 50.49 - 4.4047 to + 0.096425 to², about 0.318 m/s at 24 °C.
      const to = 24;
      const v_limit = 50.49 - 4.4047 * to + 0.096425 * to * to;
      const result = ashrae(24, 0.5);
      expect(result.pmv).toBe(null);
      expect(result.warnings).toEqual([range("vr", 0.5, { max: v_limit })]);
    });

    test("vr above 0.8 m/s gives a row against 0.8", () => {
      const result = ashrae(26, 1.0);
      expect(result.pmv).toBe(null);
      expect(result.warnings).toEqual([range("vr", 1.0, { max: 0.8 })]);
    });

    test("the same call with airspeed control gives no row", () => {
      expect(ashrae(20, 0.3, { airspeed_control: true }).warnings).toEqual([]);
    });

    test("the rows are the same with limit_inputs off", () => {
      const off = ashrae(20, 0.3, { limit_inputs: false });
      expect(Number.isFinite(off.pmv)).toBe(true);
      expect(off.warnings).toEqual(ashrae(20, 0.3).warnings);
    });
  });

  describe("tsv classification (right-inclusive)", () => {
    test("tsv is null when pmv is null (out of range)", () => {
      const result = pmv_ppd_ashrae({
        tdb: 50,
        tr: 50,
        vr: 0.5,
        rh: 80,
        met: 2.0,
        clo: 0.3,
      });
      expect(result.pmv).toBe(null);
      expect(result.tsv).toBe(null);
    });

    // Upstream classifies the pmv it returns, 0.5043645689727003 rounded to 0.5 (models/pmv_ppd_ashrae.py:239-246).
    test("tsv is classified from the pmv returned, rounded or not", () => {
      const warm = { ...neutral, tdb: 26.4, tr: 26.4, limit_inputs: false };
      const rounded = pmv_ppd_ashrae({ ...warm, round_output: true });
      const unrounded = pmv_ppd_ashrae({ ...warm, round_output: false });
      expect(rounded.pmv).toBe(0.5);
      expect(rounded.tsv).toBe("Neutral");
      expect(unrounded.pmv).toBeGreaterThan(0.5);
      expect(unrounded.tsv).toBe("Slightly Warm");
    });

    test("pmv 0.69 is Slightly Warm", () => {
      const result = pmv_ppd_ashrae({
        ...neutral,
        tdb: 27,
        tr: 27,
        limit_inputs: false,
      });
      expect(result.pmv).toBe(0.69);
      expect(result.tsv).toBe("Slightly Warm");
    });
  });

  // pythermalcomfort#382: the two models share edges and labels, with opposite `right`.
  describe("ISO vs ASHRAE TSV interval convention (pythermalcomfort#382)", () => {
    const iso = PMV_PPD_ISO_INFO.outputs.tsv.classifier;
    const ashrae = PMV_PPD_ASHRAE_INFO.outputs.tsv.classifier;

    test.each([-2.5, -1.5, -0.5, 0.5, 1.5, 2.5])(
      "pmv = %s is labelled differently by the two conventions",
      (pmv) => {
        expect(classifyFromBins(pmv, iso)).not.toBe(
          classifyFromBins(pmv, ashrae),
        );
      },
    );

    test("at pmv = -1.5 exactly, ISO says Slightly Cool and ASHRAE says Cool", () => {
      expect(classifyFromBins(-1.5, iso)).toBe("Slightly Cool");
      expect(classifyFromBins(-1.5, ashrae)).toBe("Cool");
    });

    // ASHRAE's cooling effect at vr 0.5 gives another pmv: -1.5 against ISO's -1.52.
    test("the two models' pmv differ through the cooling effect, not the convention", () => {
      const inputs = {
        tdb: 22.5,
        tr: 22.5,
        vr: 0.5,
        rh: 50,
        met: 1.2,
        clo: 0.5,
        limit_inputs: false,
      };
      const iso_result = pmv_ppd_iso(inputs);
      const ashrae_result = pmv_ppd_ashrae(inputs);
      expect(iso_result.pmv).toBe(-1.52);
      expect(iso_result.tsv).toBe("Cool");
      expect(ashrae_result.pmv).toBe(-1.5);
      expect(ashrae_result.tsv).toBe("Cool");
    });
  });
});
