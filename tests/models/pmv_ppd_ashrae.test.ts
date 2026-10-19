import { afterEach, describe, expect, jest, test } from "@jest/globals";
import {
  PMV_COMPLIANCE_INTERVAL_ASHRAE,
  pmv_ppd_ashrae,
  pmv_ppd_iso,
} from "../../src/models/index.js";
import type { PmvPpdAshraeParams } from "../../src/models/pmv_ppd_ashrae.ts";
import { classifyFromBins } from "../../src/models/classifierBins.ts";
import {
  PMV_THERMAL_SENSATION_VOTE_BINS_ISO,
  PMV_THERMAL_SENSATION_VOTE_BINS_ASHRAE,
} from "../../src/models/pmv_ppd.ts";
import { ASHRAE_55_LIMITS, Standard } from "../../src/utilities/utilities.js";
import { testDataUrls } from "./comftest.ts";
import {
  assertNonEmptyRows,
  correctNoControlFixtureCase,
  loadTestData,
  validateResult,
} from "./testUtils.ts";

// Array rows run element-wise.
let { testData, tolerances } = await loadTestData(testDataUrls.pmvPpd);

// Upstream keeps the rows labelled "ashrae", which matches none of the
// fixture's uppercase "ASHRAE" labels, so its fixture test runs no row. This
// runs what it means to run: every ASHRAE row, SI and IP, arrays included.
// ADR 0004 changed the no-control row: see correctNoControlFixtureCase.
const ashraeRows = assertNonEmptyRows(
  testData.data.filter(({ inputs }) => inputs.standard === "ASHRAE"),
  "pmv_ppd_ashrae ASHRAE rows",
).map(correctNoControlFixtureCase);

// Mirrors pythermalcomfort v4.6.0 tests/test_pmv_ppd_ashrae.py.
describe("test_pmv_ppd_ashrae", () => {
  test.each(ashraeRows)("test_pmv_ppd: fixture case %#", (row) => {
    const { inputs, outputs } = row;
    // As upstream, which swaps the row's label for `model="55-2023"`; the key
    // is `standard` here (ADR 0003). The rest of the row goes in unchanged,
    // but for the v ADR 0004 adds to the no-control row.
    const result = pmv_ppd_ashrae({
      ...inputs,
      standard: Standard.ashrae_55_2023,
    } as unknown as PmvPpdAshraeParams);

    validateResult(result, outputs, tolerances, inputs);
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
      // ADR 0004 changed this block: each call gains v at its vr, and at
      // exactly 1.3 met and 0.7 clo the limits now apply, so the last three
      // pmv are NaN where upstream has -0.14, -0.43 and -0.57.
      const airspeed: [number, number, number, number, number][] = [
        [26, 0.9, 1.1, 0.5, NaN],
        [24, 0.6, 1.1, 0.5, NaN],
        [22, 0.3, 1.1, 0.5, NaN],
        [26, 0.9, 1.3, 0.7, NaN],
        [24, 0.6, 1.3, 0.7, NaN],
        [22, 0.3, 1.3, 0.7, NaN],
      ];
      for (const [t, vr, met, clo, pmv] of airspeed) {
        const result = pmv_ppd_ashrae({
          tdb: t,
          tr: t,
          vr,
          v: vr,
          rh: 50,
          met,
          clo,
          standard: Standard.ashrae_55_2023,
          airspeed_control: false,
        });
        expect(result.pmv).toBe(pmv);
      }

      const outOfRange: [number, number, number, number, number][] = [
        [41, 20, 0.1, 1.1, 0.5],
        [20, 41, 0.1, 1.1, 0.5],
        [20, 20, 2.1, 1.1, 0.5],
        [20, 20, 0.1, 0.7, 0.5],
        [20, 20, 0.1, 1.1, 2.1],
        [39, 39, 0.1, 3.9, 1.9],
      ];
      for (const [tdb, tr, vr, met, clo] of outOfRange) {
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
      expect(result.pmv).toBe(4.48);
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

    // Upstream's UserWarning naming 'tdb' is a warnings row keyed "tdb" here.
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
      expect(result.warnings.map((w) => w.key)).toEqual(["tdb"]);
      expect(result.pmv).toBeNaN();
    });

    // Upstream emits nothing with limit_inputs off, and neither does this: no
    // console output. The warnings rows are still filled, the same as with
    // limit_inputs on (a consumer-contract deviation: a caller that shows the
    // out-of-range numbers can say which bounds they broke).
    test("test_limit_inputs_false_no_warning", () => {
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
      const params = {
        tdb: 41,
        tr: 41,
        vr: 2,
        rh: 50,
        met: 0.7,
        clo: 2.1,
        standard: Standard.ashrae_55_2023,
      };
      const result = pmv_ppd_ashrae({ ...params, limit_inputs: false });
      expect(warn).not.toHaveBeenCalled();
      expect(result.warnings).toEqual(pmv_ppd_ashrae(params).warnings);
      expect(result.warnings.map((w) => w.key)).toEqual([
        "tdb",
        "tr",
        "met",
        "clo",
      ]);
    });

    // "exceeding 0.8 m/s" is a v row bounded at 0.8. ADR 0004 changed this
    // test: it gains v at upstream's vr, and the row is keyed v.
    test("test_airspeed_control_false_cond1_warns", () => {
      // to ≈ 26 > 25.5, so only cond1 applies: v=0.9 > 0.8, clo=0.5 < 0.7, met=1.1 < 1.3
      const result = pmv_ppd_ashrae({
        tdb: 26,
        tr: 26,
        vr: 0.9,
        v: 0.9,
        rh: 50,
        met: 1.1,
        clo: 0.5,
        standard: Standard.ashrae_55_2023,
        airspeed_control: false,
      });
      expect(result.warnings).toEqual([
        { key: "v", role: "input", value: 0.9, bound: { max: 0.8 } },
      ]);
    });

    // "comfort zone" is a v row bounded at the operative-temperature limit.
    // ADR 0004 changed this test: it gains v at upstream's vr, and the row is
    // keyed v.
    test("test_airspeed_control_false_cond2_warns", () => {
      // to ≈ 24, so 23 < to < 25.5; v=0.6 exceeds computed v_limit ≈ 0.32
      const result = pmv_ppd_ashrae({
        tdb: 24,
        tr: 24,
        vr: 0.6,
        v: 0.6,
        rh: 50,
        met: 1.1,
        clo: 0.5,
        standard: Standard.ashrae_55_2023,
        airspeed_control: false,
      });
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].key).toBe("v");
      expect(result.warnings[0].bound.max).toBeCloseTo(0.318, 6);
    });

    // "exceeding 0.2 m/s" is a v row bounded at 0.2. ADR 0004 changed this
    // test: it gains v at upstream's vr, and the row is keyed v.
    test("test_airspeed_control_false_cond3_warns", () => {
      // to ≈ 22 <= 23; v=0.3 > 0.2, clo=0.5 < 0.7, met=1.1 < 1.3
      const result = pmv_ppd_ashrae({
        tdb: 22,
        tr: 22,
        vr: 0.3,
        v: 0.3,
        rh: 50,
        met: 1.1,
        clo: 0.5,
        standard: Standard.ashrae_55_2023,
        airspeed_control: false,
      });
      expect(result.warnings).toEqual([
        { key: "v", role: "input", value: 0.3, bound: { max: 0.2 } },
      ]);
    });
  });
});

// Mirrors TestCheckAshrae55Compliance in pythermalcomfort v4.6.0
// tests/test_internal.py. Upstream calls the private helper
// _check_ashrae55_compliance directly. Its JS counterpart
// (src/_internal/ashrae55.ts) pushes rows instead of warning, and
// pmv_ppd_ashrae returns them, so the tests go through the model, with
// upstream's v as both vr and v and an rh the model needs and the helper does
// not take. ADR 0004 changed the three cond tests: the no-control rows read v
// and are keyed v, where upstream names the speed in its warning text by
// v_param_name.
describe("test_internal", () => {
  describe("TestCheckAshrae55Compliance", () => {
    const at = (tdb: number, v: number, airspeed_control: boolean) =>
      pmv_ppd_ashrae({
        tdb,
        tr: tdb,
        vr: v,
        v,
        rh: 50,
        met: 1.2,
        clo: 0.5,
        airspeed_control,
      }).warnings;

    // tdb=tr=30 → to=30 > 25.5, so cond2 does not trigger alongside cond1.
    // ADR 0004 changed this test: the row is keyed v.
    test("test_airspeed_control_cond1_warns", () => {
      expect(at(30, 1.0, false)).toEqual([
        { key: "v", role: "input", value: 1.0, bound: { max: 0.8 } },
      ]);
    });

    // With tdb=tr=24, to=24; v_limit ≈ 0.32; v=0.5 > v_limit triggers cond2.
    // ADR 0004 changed this test: the row is keyed v.
    test("test_airspeed_control_cond2_warns", () => {
      const rows = at(24, 0.5, false);
      expect(rows).toHaveLength(1);
      expect(rows[0].key).toBe("v");
      expect(rows[0].bound.max).toBeCloseTo(0.318, 6);
    });

    // With tdb=tr=22, to=22 <= 23; v=0.3 > 0.2 triggers cond3.
    // ADR 0004 changed this test: the row is keyed v.
    test("test_airspeed_control_cond3_warns", () => {
      expect(at(22, 0.3, false)).toEqual([
        { key: "v", role: "input", value: 0.3, bound: { max: 0.2 } },
      ]);
    });

    // airspeed_control=True skips cond1/cond2/cond3 checks even when v=1.0.
    test("test_airspeed_control_true_no_condition_warning", () => {
      expect(at(25, 1.0, true)).toEqual([]);
    });
  });
});

describe("pmv_ppd_ashrae (JS-only)", () => {
  const neutral = { tdb: 25, tr: 25, vr: 0.1, rh: 50, met: 1.2, clo: 0.5 };

  afterEach(() => {
    jest.restoreAllMocks();
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

  // ADR 0004: without local control, the rule reads the average air speed v,
  // not vr, from exactly 0.7 clo and 1.3 met, at ASHRAE 55's operative
  // temperature.
  describe("the air-speed rule without local control", () => {
    const noControl = {
      tdb: 22,
      tr: 22,
      vr: 0.15,
      v: 0.15,
      rh: 50,
      met: 1.1,
      clo: 0.5,
      airspeed_control: false,
    };

    test("a v that breaks a limit while vr does not gives a row keyed v", () => {
      expect(pmv_ppd_ashrae({ ...noControl, v: 0.3 }).warnings).toEqual([
        { key: "v", role: "input", value: 0.3, bound: { max: 0.2 } },
      ]);
    });

    test("a vr that breaks a limit while v does not gives no row", () => {
      expect(pmv_ppd_ashrae({ ...noControl, vr: 0.3 }).warnings).toEqual([]);
    });

    test("the 0-2 m/s range row stays on vr, keyed vr", () => {
      expect(
        pmv_ppd_ashrae({ ...noControl, tdb: 26, tr: 26, vr: 2.5, v: 0.5 })
          .warnings,
      ).toEqual([
        { key: "vr", role: "input", value: 2.5, bound: ASHRAE_55_LIMITS.vr },
      ]);
      expect(
        pmv_ppd_ashrae({ ...noControl, tdb: 26, tr: 26, vr: 0.5, v: 2.5 })
          .warnings,
      ).toEqual([{ key: "v", role: "input", value: 2.5, bound: { max: 0.8 } }]);
    });

    test("PMV and PPD read vr: they equal those of the call with local control", () => {
      const off = { ...noControl, v: 0.3, limit_inputs: false };
      const controlled = pmv_ppd_ashrae({ ...off, airspeed_control: true });
      for (const v of [0.1, 0.3, 0.7]) {
        const result = pmv_ppd_ashrae({ ...off, v });
        expect(result.pmv).toBe(controlled.pmv);
        expect(result.ppd).toBe(controlled.ppd);
      }
    });

    test("a rule row makes pmv, ppd and compliance NaN under limit_inputs", () => {
      const broken = pmv_ppd_ashrae({ ...noControl, v: 0.3 });
      expect(broken.pmv).toBeNaN();
      expect(broken.ppd).toBeNaN();
      expect(broken.compliance).toBeNaN();
      const kept = pmv_ppd_ashrae({ ...noControl, vr: 0.3 });
      expect(Number.isFinite(kept.pmv)).toBe(true);
      expect(typeof kept.compliance).toBe("boolean");
    });

    // 71.6 °F is 22 °C. 0.492 fps is about 0.15 m/s, inside the 0.2 m/s
    // limit, which it would break unconverted; 0.984 fps is about 0.3 m/s.
    test("in IP units, v is converted from fps as vr is", () => {
      const ip = {
        ...noControl,
        tdb: 71.6,
        tr: 71.6,
        vr: 0.492,
        units: "IP" as const,
      };
      expect(pmv_ppd_ashrae({ ...ip, v: 0.492 }).warnings).toEqual([]);
      const [row] = pmv_ppd_ashrae({ ...ip, v: 0.984 }).warnings;
      expect(row.key).toBe("v");
      expect(row.value).toBeCloseTo(0.3, 3);
      expect(row.bound).toEqual({ max: 0.2 });
    });

    test("throws TypeError if v is not a finite number", () => {
      for (const bad of [NaN, Infinity, -Infinity, "0.3"]) {
        // Cast: deliberately passing a string to test the runtime TypeError.
        const params = { ...noControl, v: bad } as PmvPpdAshraeParams;
        expect(() => pmv_ppd_ashrae(params)).toThrow(TypeError);
      }
    });

    test("the limits apply at exactly 0.7 clo and at exactly 1.3 met", () => {
      const row = { key: "v", role: "input", value: 0.3, bound: { max: 0.2 } };
      expect(
        pmv_ppd_ashrae({ ...noControl, v: 0.3, clo: 0.7 }).warnings,
      ).toEqual([row]);
      expect(
        pmv_ppd_ashrae({ ...noControl, v: 0.3, met: 1.3 }).warnings,
      ).toEqual([row]);
    });

    test("above 0.7 clo or above 1.3 met, the occupant is exempt", () => {
      expect(
        pmv_ppd_ashrae({ ...noControl, v: 0.3, clo: 0.71 }).warnings,
      ).toEqual([]);
      expect(
        pmv_ppd_ashrae({ ...noControl, v: 0.3, met: 1.31 }).warnings,
      ).toEqual([]);
    });

    // At v = 0.79 m/s, tdb 30 and tr 14 °C weigh to 25.80 °C by ISO 7726,
    // above the 25.5 °C limit, where nothing below 0.8 m/s breaks, and to
    // 25.2 °C by ASHRAE 55 (0.7 tdb + 0.3 tr), where the limit is 0.7253 m/s.
    // Weighed by vr = 0.15 m/s instead, to would be 22 °C and the limit
    // 0.2 m/s.
    test("the limit is chosen at the operative temperature ASHRAE 55 weighs by v", () => {
      const rows = pmv_ppd_ashrae({
        ...noControl,
        tdb: 30,
        tr: 14,
        v: 0.79,
      }).warnings;
      expect(rows).toHaveLength(1);
      expect(rows[0].key).toBe("v");
      expect(rows[0].value).toBe(0.79);
      expect(rows[0].bound.max).toBeCloseTo(0.725292, 6);
    });

    test("without v, the call throws a TypeError naming v", () => {
      const { v: _, ...withoutV } = noControl;
      expect(() => pmv_ppd_ashrae(withoutV)).toThrow(TypeError);
      expect(() => pmv_ppd_ashrae(withoutV)).toThrow(/"v"/);
      expect(() => pmv_ppd_ashrae({ ...withoutV, v: undefined })).toThrow(
        TypeError,
      );
    });

    test("with local control, v is optional and unused", () => {
      const { v: _, ...withoutV } = noControl;
      const controlled = { ...withoutV, airspeed_control: true };
      expect(pmv_ppd_ashrae({ ...controlled, v: 0.5 })).toEqual(
        pmv_ppd_ashrae(controlled),
      );
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

    // ADR 0008: an unknown key throws, as an unexpected keyword argument does
    // in Python. suppress_warnings, declared beyond upstream's keys, is
    // accepted (see "suppress_warnings passes through to the cooling effect").
    test("throws TypeError naming an unknown key", () => {
      // Cast: deliberately passing a misspelt key to test the TypeError.
      const params = {
        ...neutral,
        unit: "IP",
      } as unknown as PmvPpdAshraeParams;
      expect(() => pmv_ppd_ashrae(params)).toThrow(TypeError);
      expect(() => pmv_ppd_ashrae(params)).toThrow("unexpected key: 'unit'");
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

    // Upstream upper-cases str(units) before its SI/IP check, so a non-string
    // fails that check with a ValueError (ADR 0012: Error).
    test("throws Error if units is not a string", () => {
      // Cast: deliberately passing a number to test the runtime Error.
      const params = { ...neutral, units: 5 } as unknown as PmvPpdAshraeParams;
      expect(() => pmv_ppd_ashrae(params)).toThrow('"units" must be one of');
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
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const hot = { tdb: 45, tr: 45, vr: 0.5, rh: 90, met: 1.2, clo: 0.5 };
    pmv_ppd_ashrae({ ...hot, suppress_warnings: true });
    expect(warn).not.toHaveBeenCalled();
    pmv_ppd_ashrae(hot);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  // Expected values from pythermalcomfort 4.6.2. The hand-written Brent v2 had
  // before reached another cooling-effect root here and gave pmv 1.36, ppd
  // 43.3, "Slightly Warm".
  test("elevated air speed gives upstream's PMV through the cooling effect", () => {
    const result = pmv_ppd_ashrae({
      tdb: 26.797928398725393,
      tr: 34.14962670449309,
      vr: 1.725343680434195,
      rh: 74.84087312235033,
      met: 3.259861609728725,
      clo: 0.6269445718389801,
    });
    expect(result).toMatchObject({ pmv: 1.54, ppd: 53.3, tsv: "Warm" });
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
        const iso = classifyFromBins(pmv, PMV_THERMAL_SENSATION_VOTE_BINS_ISO);
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
      expect(classifyFromBins(-1.5, PMV_THERMAL_SENSATION_VOTE_BINS_ISO)).toBe(
        "Slightly Cool",
      );
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
