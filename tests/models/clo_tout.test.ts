import { describe, expect, test } from "vitest";
import { clo_tout } from "../../src/models/index.ts";
import type { CloToutParams } from "../../src/models/index.ts";
import { testDataUrls } from "./comftest.ts";
import { loadTestData, validateResult } from "./testUtils.ts";

type Inputs = Parameters<typeof clo_tout>[0];

const { testData: reference_table, tolerances: tolerance } = await loadTestData(
  testDataUrls.cloTout,
);

// Mirrors pythermalcomfort v4.6.2 tests/test_clo_tout.py.
describe("test_clo_tout", () => {
  test.each(reference_table.data)("test_clo_tout: fixture case %#", (entry) => {
    const { inputs, outputs } = entry;
    // As upstream, `clo_tout(tout=..., units=inputs.get("units", "SI"))`.
    const result = clo_tout({
      tout: inputs.tout,
      units: inputs.units ?? "SI",
    } as unknown as Inputs);

    validateResult(result, outputs, tolerance, inputs);
  });
});

describe("clo_tout (JS-only)", () => {
  // A numeric string is not coerced, unlike in arithmetic.
  test("throws TypeError if tout is not a number", () => {
    // Cast: deliberately passing a string to test the runtime TypeError.
    const params = { tout: "20" } as unknown as CloToutParams;
    expect(() => clo_tout(params)).toThrow(TypeError);
  });

  // ADR 0001: a non-finite number throws, where upstream returns 0.46 (NaN,
  // +Infinity) or 1 (-Infinity).
  test("throws TypeError if tout is not finite", () => {
    for (const bad of [NaN, Infinity, -Infinity]) {
      expect(() => clo_tout({ tout: bad })).toThrow(TypeError);
    }
  });

  // tout and units were positional before v2 (ADR 0002). A call still
  // written that way throws rather than running on anything else.
  test("throws TypeError if called positionally", () => {
    // @ts-expect-error the function takes one params object
    expect(() => clo_tout(20)).toThrow(TypeError);
    // @ts-expect-error the function takes one params object
    expect(() => clo_tout(68, "IP")).toThrow(TypeError);
    // @ts-expect-error null is not a params object
    expect(() => clo_tout(null)).toThrow(TypeError);
    // @ts-expect-error the params object is required
    expect(() => clo_tout()).toThrow(TypeError);
  });

  test("throws Error if units is not SI or IP", () => {
    // @ts-expect-error units is "SI" or "IP"
    expect(() => clo_tout({ tout: 20, units: "INVALID" })).toThrow(
      /"units" must be one of/,
    );
  });

  test("returns clo_tout only, with no warnings field", () => {
    expect(clo_tout({ tout: 27 })).toEqual({ clo_tout: 0.46 });
  });

  test("units passed as undefined takes its default", () => {
    // @ts-expect-error the Params type lacks ADR 0019's `?: T | undefined`; the runtime default is under test
    expect(clo_tout({ tout: 20, units: undefined })).toEqual(
      clo_tout({ tout: 20, units: "SI" }),
    );
  });
});
