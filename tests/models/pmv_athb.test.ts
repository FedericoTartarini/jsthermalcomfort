import { describe, expect, test } from "vitest";
import { pmv_athb, PMV_ATHB_INFO } from "../../src/models/index.ts";
import { pmv_athb as pmv_athb_from_root } from "../../src/index.ts";
import { test_data_urls } from "./comftest.ts";
import { describeModelContract } from "./modelContract.ts";
import { loadTestData, validateResult } from "./testUtils.ts";

type Inputs = Parameters<typeof pmv_athb>[0];

const { testData: reference_table, tolerances: tolerance } = await loadTestData(
  test_data_urls.athb,
);

// Mirrors pythermalcomfort v4.8.0 tests/test_athb.py.
describe("test_athb", () => {
  test.each(reference_table.data)("test_athb: case %#", (entry) => {
    const { inputs, outputs } = entry;
    const result = pmv_athb(inputs as unknown as Inputs);

    validateResult(result, outputs, tolerance, inputs);
  });
});

const neutral = {
  tdb: 25,
  tr: 25,
  vr: 0.1,
  rh: 50,
  met: 1.2,
  t_running_mean: 20,
};
const call = (inputs: unknown) => () => pmv_athb(inputs as Inputs);

describeModelContract(pmv_athb, PMV_ATHB_INFO, neutral);

// What upstream's tests leave out, measured on pythermalcomfort 4.7.0 in the
// parity image.
describe("pmv_athb (JS-only)", () => {
  // models/pmv_athb.py:98: False computes the adapted clothing, a number is used.
  test.each([
    [{ ...neutral, clo: false }, 0.206],
    [{ ...neutral, clo: 0 }, -0.626],
    [{ ...neutral, clo: 0.5 }, 0.105],
    [{ ...neutral, clo: 1 }, 0.44],
  ] as const)("%o gives %s", (inputs, expected) => {
    expect(pmv_athb(inputs).athb_pmv).toBe(expected);
  });

  // Upstream's athb_pmv is nan at neutral with met -400, measured on 4.8.0 in the parity image (models/pmv_athb.py:95-124).
  test("a met of -400 gives null", () => {
    expect(pmv_athb({ ...neutral, met: -400 }).athb_pmv).toBe(null);
  });

  // Deviation pmv_athb-3.
  test("clo true throws TypeError, where upstream computes with clo=1", () => {
    expect(call({ ...neutral, clo: true })).toThrow(
      new TypeError("clo must be a finite number."),
    );
  });

  // Deviation pmv_athb-2.
  test("returns no rows", () => {
    expect(pmv_athb({ ...neutral, tdb: 50, rh: 150, clo: 5 }).warnings).toEqual(
      [],
    );
  });

  test("is exported from the package root as from its subpath", () => {
    expect(pmv_athb_from_root).toBe(pmv_athb);
  });
});
