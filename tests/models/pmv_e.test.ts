import { describe, expect, test } from "vitest";
import {
  pmv_e,
  PMV_E_INFO,
  pmv_ppd_iso,
  PMV_PPD_ISO_INFO,
} from "../../src/models/index.ts";
import { pmv_e as pmv_e_from_root } from "../../src/index.ts";
import { DEFAULT_TOLERANCE } from "../parity/harness.ts";
import { test_data_urls } from "./comftest.ts";
import { describeModelContract } from "./modelContract.ts";
import { loadTestData, validateResult } from "./testUtils.ts";

type Inputs = Parameters<typeof pmv_e>[0];

const { testData: reference_table, tolerances: tolerance } = await loadTestData(
  test_data_urls.ePmv,
);

// Mirrors pythermalcomfort v4.8.0 tests/test_e_pmv.py.
describe("test_e_pmv", () => {
  test.each(reference_table.data)("test_e_pmv: case %#", (entry) => {
    const { inputs, outputs } = entry;
    const result = pmv_e(inputs as unknown as Inputs);

    validateResult(result, outputs, tolerance, inputs);
  });
});

const neutral = { tdb: 25, tr: 25, vr: 0.1, rh: 50, met: 1.2, clo: 0.5 };
const hot = { ...neutral, tdb: 35, tr: 35, e_coefficient: 0.6 };
const warm = {
  tdb: 29,
  tr: 35,
  vr: 0.1,
  rh: 50,
  met: 0.85,
  clo: 1.5,
  e_coefficient: 0.6,
};
const call = (inputs: unknown) => () => pmv_e(inputs as Inputs);

describeModelContract(
  pmv_e,
  PMV_E_INFO,
  { ...neutral, e_coefficient: 0.6 },
  hot,
);

// What upstream's tests leave out, measured on pythermalcomfort 4.7.0 in the
// parity image.
describe("pmv_e (JS-only)", () => {
  // Decision 321; upstream's e_pmv is NaN here, measured on 4.8.0 in the parity image.
  test("a null pmv from pmv_ppd_iso gives upstream's NaN e_pmv, as null", () => {
    expect(
      pmv_e({
        tdb: -240,
        tr: -240,
        vr: 0.1,
        rh: 0,
        met: 1.2,
        clo: 0.5,
        e_coefficient: 0.6,
        limit_inputs: false,
      }).e_pmv,
    ).toBe(null);
  });

  test.each([
    [{ ...neutral, e_coefficient: 0.6 }, 0.04],
    [{ ...neutral, e_coefficient: 1 }, 0.07],
    [{ ...neutral, e_coefficient: -0.6 }, -0.04],
    [{ ...neutral, e_coefficient: 0.6, wme: 0.1 }, -0.09],
    [{ ...neutral, tdb: 20, tr: 20, e_coefficient: 0.6 }, -0.86],
    [{ ...hot, limit_inputs: false }, 2.05],
    [{ ...warm, limit_inputs: false }, 1.23],
  ] as const)("%o gives %s", (inputs, expected) => {
    expect(pmv_e(inputs).e_pmv).toBe(expected);
  });

  test("converts tdb, tr and vr from IP in any case, as upstream", () => {
    const ip = { tdb: 77, tr: 77, vr: 0.3, rh: 50, met: 1.2, clo: 0.5 };
    for (const units of ["IP", "ip", "Ip"])
      expect(pmv_e({ ...ip, e_coefficient: 0.6, units } as Inputs).e_pmv).toBe(
        0.06,
      );
  });

  // classes_input.py:120 (deviation _shared-24).
  test("units other than SI or IP throws upstream's message", () => {
    const message = "Units must be either 'SI' or 'IP'";
    const valid = { ...neutral, e_coefficient: 0.6 };
    for (const units of ["celsius", "", "wrong"])
      expect(call({ ...valid, units })).toThrow(new RangeError(message));
    for (const units of [null, 5, true, ["SI"]])
      expect(call({ ...valid, units })).toThrow(new TypeError(message));
  });

  // Deviation pmv_e-2.
  test("returns both inner pmv_ppd_iso calls' rows, without deduplication", () => {
    const result = pmv_e(hot);
    expect(result.e_pmv).toBe(null);
    const inner = pmv_ppd_iso({ ...neutral, tdb: 35, tr: 35 }).warnings;
    expect(inner).toEqual([
      expect.objectContaining({ key: "tdb", role: "input" }),
      expect.objectContaining({ key: "pa", role: "derived" }),
      expect.objectContaining({ key: "pmv", role: "output" }),
    ]);
    expect(result.warnings).toEqual([...inner, ...inner]);
  });

  // Deviation pmv_e-2; models/pmv_e.py:134.
  test("the second call's met row is derived", () => {
    expect(pmv_e({ ...warm, met: 0.7 }).warnings).toEqual([
      expect.objectContaining({ key: "met", role: "input", value: 0.7 }),
      expect.objectContaining({ key: "met", role: "derived", value: 0.7 }),
    ]);
  });

  // Deviation pmv_e-3 (decision 243).
  test("with the gate off, the second call checks the adjusted met", () => {
    expect(pmv_e(warm).warnings).toEqual([
      expect.objectContaining({
        key: "pmv",
        value: expect.toBeApprox(2.323863160308001, DEFAULT_TOLERANCE),
      }),
      expect.objectContaining({
        key: "pmv",
        value: expect.toBeApprox(2.323863160308001, DEFAULT_TOLERANCE),
      }),
    ]);
    expect(pmv_e({ ...warm, limit_inputs: false }).warnings).toEqual([
      expect.objectContaining({
        key: "pmv",
        value: expect.toBeApprox(2.323863160308001, DEFAULT_TOLERANCE),
      }),
      expect.objectContaining({ key: "met", role: "derived", value: 0.717876 }),
      expect.objectContaining({
        key: "pmv",
        value: expect.toBeApprox(2.045025099778569, DEFAULT_TOLERANCE),
      }),
    ]);
  });

  // Deviation pmv_e-3.
  test("returns the same rows with the gate off where met is not adjusted", () => {
    expect(
      pmv_e({ ...hot, tdb: 5, tr: 5, limit_inputs: false }).warnings,
    ).toEqual(pmv_e({ ...hot, tdb: 5, tr: 5 }).warnings);
  });

  // Deviation pmv_e-1 (decision 242).
  test("INFO takes its bounds from PMV_PPD_ISO_INFO", () => {
    for (const key of ["tdb", "tr", "vr", "met", "clo"] as const)
      expect(PMV_E_INFO.inputs[key].applicability).toBe(
        PMV_PPD_ISO_INFO.inputs[key].applicability,
      );
    expect(PMV_E_INFO.derived.pa).toBe(PMV_PPD_ISO_INFO.derived.pa);
    expect(PMV_E_INFO.derived.pmv.applicability).toBe(
      PMV_PPD_ISO_INFO.outputs.pmv.applicability,
    );
    expect(PMV_E_INFO.derived.met.applicability).toBe(
      PMV_PPD_ISO_INFO.inputs.met.applicability,
    );
  });

  test("is exported from the package root as from its subpath", () => {
    expect(pmv_e_from_root).toBe(pmv_e);
  });
});
