import { describe, expect, test } from "@jest/globals";
import { clo_tout } from "../../src/models/clo_tout.ts";
import type { CloToutParams } from "../../src/models/clo_tout.ts";
import { testDataUrls } from "./comftest.ts";
import { loadTestData, validateResult } from "./testUtils.ts";

let { testData, tolerances } = await loadTestData(testDataUrls.cloTout);

// Mirrors pythermalcomfort v4.6.1 tests/test_clo_tout.py.
describe("test_clo_tout", () => {
  test.each(testData.data)("test_clo_tout: fixture case %#", (row) => {
    const { inputs, outputs } = row;
    // As upstream, `clo_tout(tout=..., units=inputs.get("units", "SI"))`.
    const result = clo_tout(inputs as unknown as CloToutParams);

    validateResult(result, outputs, tolerances, inputs);
  });
});

describe("clo_tout (JS-only)", () => {
  // A numeric string is not coerced, unlike in arithmetic.
  test("throws TypeError if tout is not a number", () => {
    // Cast: deliberately passing a string to test the runtime TypeError.
    const params = { tout: "20" } as unknown as CloToutParams;
    expect(() => clo_tout(params)).toThrow(TypeError);
  });

  // ADR 0001: a non-finite number throws rather than propagating as NaN.
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
    expect(clo_tout({ tout: 20, units: undefined })).toEqual(
      clo_tout({ tout: 20, units: "SI" }),
    );
  });
});
