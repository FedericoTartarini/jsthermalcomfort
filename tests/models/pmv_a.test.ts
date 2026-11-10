import { describe, expect, test } from "vitest";
import {
  pmv_a,
  PMV_A_INFO,
  pmv_ppd_iso,
  PMV_PPD_ISO_INFO,
} from "../../src/models/index.ts";
import { pmv_a as pmv_a_from_root } from "../../src/index.ts";
import { test_data_urls } from "./comftest.ts";
import { describeModelContract } from "./modelContract.ts";
import { loadTestData, validateResult } from "./testUtils.ts";

type Inputs = Parameters<typeof pmv_a>[0];

const { testData: reference_table, tolerances: tolerance } = await loadTestData(
  test_data_urls.aPmv,
);

// Mirrors pythermalcomfort v4.8.0 tests/test_a_pmv.py.
describe("test_a_pmv", () => {
  test.each(reference_table.data)("test_a_pmv: case %#", (entry) => {
    const { inputs, outputs } = entry;
    const result = pmv_a(inputs as unknown as Inputs);

    validateResult(result, outputs, tolerance, inputs);
  });

  test("test_a_pmv_wrong_input_type", () => {
    const inputs = {
      tdb: 25,
      tr: 25,
      vr: 0.1,
      rh: 50,
      met: 1.2,
      clo: 0.5,
      a_coefficient: 7,
    };
    expect(() => pmv_a({ ...inputs, tdb: "25" } as unknown as Inputs)).toThrow(
      TypeError,
    );
    expect(() =>
      pmv_a({ ...inputs, units: "celsius" } as unknown as Inputs),
    ).toThrow(RangeError);
  });

  test("test_not_valid_units", () => {
    expect(() =>
      pmv_a({
        tdb: 25,
        tr: 25,
        vr: 0.1,
        rh: 50,
        met: 1.2,
        clo: 0.5,
        a_coefficient: 7,
        units: "wrong",
      } as unknown as Inputs),
    ).toThrow(RangeError);
  });
});

const neutral = { tdb: 25, tr: 25, vr: 0.1, rh: 50, met: 1.2, clo: 0.5 };
const hot = { ...neutral, tdb: 35, tr: 35, a_coefficient: 0.293 };
const call = (inputs: unknown) => () => pmv_a(inputs as Inputs);

describeModelContract(
  pmv_a,
  PMV_A_INFO,
  { ...neutral, a_coefficient: 0.293 },
  hot,
);

// What upstream's tests leave out, measured on pythermalcomfort 4.7.0 in the
// parity image.
describe("pmv_a (JS-only)", () => {
  // Decision 321; upstream's a_pmv is NaN here, measured on 4.8.0 in the parity image.
  test("a null pmv from pmv_ppd_iso gives upstream's NaN a_pmv, as null", () => {
    expect(
      pmv_a({
        tdb: -240,
        tr: -240,
        vr: 0.1,
        rh: 0,
        met: 1.2,
        clo: 0.5,
        a_coefficient: 0.293,
        limit_inputs: false,
      }).a_pmv,
    ).toBe(null);
  });

  test.each([
    [{ ...neutral, a_coefficient: 0.293 }, 0.08],
    [{ ...neutral, a_coefficient: 1 }, 0.07],
    [{ ...neutral, a_coefficient: -3.0 }, 0.11],
    [{ ...neutral, a_coefficient: 0.293, wme: 0.1 }, -0.16],
    [{ ...neutral, tdb: 20, tr: 20, a_coefficient: -0.293 }, -1.01],
    [{ ...hot, limit_inputs: false }, 1.65],
  ] as const)("%o gives %s", (inputs, expected) => {
    expect(pmv_a(inputs).a_pmv).toBe(expected);
  });

  test("converts tdb, tr and vr from IP in any case, as upstream", () => {
    const ip = { tdb: 77, tr: 77, vr: 0.3, rh: 50, met: 1.2, clo: 0.5 };
    for (const units of ["IP", "ip", "Ip"])
      expect(
        pmv_a({ ...ip, a_coefficient: 0.293, units } as Inputs).a_pmv,
      ).toBe(0.11);
  });

  // classes_input.py:120 (deviation _shared-24).
  test("units other than SI or IP throws upstream's message", () => {
    const message = "Units must be either 'SI' or 'IP'";
    const valid = { ...neutral, a_coefficient: 0.293 };
    for (const units of ["celsius", "", "wrong"])
      expect(call({ ...valid, units })).toThrow(new RangeError(message));
    for (const units of [null, 5, true, ["SI"]])
      expect(call({ ...valid, units })).toThrow(new TypeError(message));
  });

  // models/pmv_a.py:132; numpy's divide by zero gives inf.
  test("a zero divisor gives Infinity, as upstream's inf", () => {
    expect(
      pmv_a({ ...neutral, tdb: 30, tr: 30, a_coefficient: -1 / 1.61 }).a_pmv,
    ).toBe(Infinity);
  });

  // Deviation pmv_a-2.
  test("returns the inner pmv_ppd_iso call's rows", () => {
    const result = pmv_a(hot);
    expect(result.a_pmv).toBe(null);
    expect(result.warnings).toEqual([
      expect.objectContaining({ key: "tdb", role: "input" }),
      expect.objectContaining({ key: "pa", role: "derived" }),
      expect.objectContaining({ key: "pmv", role: "output" }),
    ]);
    expect(result.warnings).toEqual(
      pmv_ppd_iso({ ...neutral, tdb: 35, tr: 35 }).warnings,
    );
  });

  // Deviation pmv_a-3.
  test("returns the same rows with the gate off", () => {
    expect(pmv_a({ ...hot, limit_inputs: false }).warnings).toEqual(
      pmv_a(hot).warnings,
    );
  });

  // Deviation pmv_a-1 (decision 242).
  test("INFO takes its bounds from PMV_PPD_ISO_INFO", () => {
    for (const key of ["tdb", "tr", "vr", "met", "clo"] as const)
      expect(PMV_A_INFO.inputs[key].applicability).toBe(
        PMV_PPD_ISO_INFO.inputs[key].applicability,
      );
    expect(PMV_A_INFO.derived.pa).toBe(PMV_PPD_ISO_INFO.derived.pa);
    expect(PMV_A_INFO.derived.pmv.applicability).toBe(
      PMV_PPD_ISO_INFO.outputs.pmv.applicability,
    );
  });

  test("is exported from the package root as from its subpath", () => {
    expect(pmv_a_from_root).toBe(pmv_a);
  });
});
