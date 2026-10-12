import { describe, expect, test } from "@jest/globals";
import { pmv_e } from "../../src/models/pmv_e.js";
import { e_pmv } from "../../src/models/e_pmv.js";
import jsthermalcomfort, {
  pmv_e as publicPmvE,
  e_pmv as publicLegacyPmvE,
} from "../../src/index.js";
import models, { pmv_e as modelPmvE } from "../../src/models/index.js";
import { testDataUrls } from "./comftest.js";
import { loadTestData, validateResult } from "./testUtils.js";

// Mirrors pythermalcomfort/tests/test_e_pmv.py. Keep every fixture, including
// the list case: the supported JS batch API is Array.map(), not broadcasting.
const { testData, tolerances } = await loadTestData(testDataUrls.ePmv, true);

function evaluate(inputs) {
  const { tdb, tr, vr, rh, met, clo, e_coefficient, wme, units, limit_inputs } =
    inputs;
  return pmv_e(tdb, tr, vr, rh, met, clo, e_coefficient, wme, {
    units,
    limit_inputs,
  });
}

describe("pmv_e", () => {
  test("exports the canonical and legacy names through the public API", () => {
    expect(publicPmvE).toBe(pmv_e);
    expect(modelPmvE).toBe(pmv_e);
    expect(models.pmv_e).toBe(pmv_e);
    expect(jsthermalcomfort.models.pmv_e).toBe(pmv_e);
    expect(publicLegacyPmvE).toBe(pmv_e);
    expect(jsthermalcomfort.models.e_pmv).toBe(pmv_e);
  });

  test.each(testData.data)("test_e_pmv case %#", ({ inputs, outputs }) => {
    const result = Array.isArray(inputs.tdb)
      ? {
          e_pmv: inputs.tdb.map((tdb) => evaluate({ ...inputs, tdb }).e_pmv),
        }
      : evaluate(inputs);
    validateResult(result, outputs, tolerances, inputs);
  });

  test("retains e_pmv as the same function at its old module path", () => {
    expect(e_pmv).toBe(pmv_e);
    expect(e_pmv(24, 30, 0.22, 50, 1.4, 0.5, 0.6)).toEqual({ e_pmv: 0.29 });
  });

  test("defaults to zero external work, SI units and limited inputs", () => {
    const args = [24, 30, 0.22, 50, 1.4, 0.5, 0.6];
    expect(pmv_e(...args)).toEqual({ e_pmv: 0.29 });
    expect(pmv_e(...args, 0, { units: "SI", limit_inputs: true })).toEqual(
      pmv_e(...args),
    );
  });

  test.each(["IP", "ip"])("converts %s inputs", (units) => {
    expect(pmv_e(75.2, 86, 0.72182, 50, 1.4, 0.5, 0.6, 0, { units })).toEqual({
      e_pmv: 0.29,
    });
  });

  test("accepts lowercase SI without changing the options object", () => {
    const options = Object.freeze({ units: "si", limit_inputs: true });
    expect(pmv_e(24, 30, 0.22, 50, 1.4, 0.5, 0.6, 0, options)).toEqual({
      e_pmv: 0.29,
    });
    expect(options).toEqual({ units: "si", limit_inputs: true });
  });

  test("applies the expectancy factor after the metabolic adjustment", () => {
    expect(pmv_e(24, 30, 0.22, 50, 1.4, 0.5, 0)).toEqual({ e_pmv: 0 });
    expect(pmv_e(24, 30, 0.22, 50, 1.4, 0.5, 0.6)).toEqual({ e_pmv: 0.29 });
  });

  test("does not apply the warm-condition adjustment to a negative PMV", () => {
    expect(pmv_e(20, 20, 0.1, 50, 1.2, 1, 0.6)).toEqual({ e_pmv: -0.2 });
  });

  test("passes nonzero external work to the ISO calculation", () => {
    expect(pmv_e(25, 25, 0.1, 50, 1.2, 0.5, 0.6, 0.2)).toEqual({
      e_pmv: -0.22,
    });
  });

  test("rounds a final halfway value to even", () => {
    // The second ISO PMV is 0.49; NumPy rounds 0.49 * 0.5 to 0.24, not 0.25.
    expect(pmv_e(24, 30, 0.22, 50, 1.4, 0.5, 0.5)).toEqual({ e_pmv: 0.24 });
    expect(pmv_e(24, 30, 0.22, 50, 1.4, 0.5, -0.5)).toEqual({ e_pmv: -0.24 });
  });

  test("preserves a negative result rounded to zero", () => {
    expect(pmv_e(20, 20, 0.1, 50, 1.2, 1, 0.001).e_pmv).toBe(-0);
  });

  test.each([
    [5, 30, 0.22, 50, 1.4, 0.5, 0.6],
    [30, 30, 0.22, 90, 1.4, 0.5, 0.6],
  ])("returns NaN outside ISO applicability for %p", (...args) => {
    expect(pmv_e(...args).e_pmv).toBeNaN();
    expect(
      Number.isFinite(pmv_e(...args, 0, { limit_inputs: false }).e_pmv),
    ).toBe(true);
  });
});

describe("pmv_e input validation", () => {
  const names = ["tdb", "tr", "vr", "rh", "met", "clo", "e_coefficient", "wme"];
  const valid = [24, 30, 0.22, 50, 1.4, 0.5, 0.6, 0];
  const invalid = ["25", null, true, [], [25], NaN, Infinity, -Infinity];

  test.each(
    names.flatMap((name, index) =>
      invalid.map((value) => [name, index, value]),
    ),
  )("rejects invalid %s (argument %i): %p", (name, index, value) => {
    const args = [...valid];
    args[index] = value;
    expect(() => pmv_e(...args)).toThrow(TypeError);
    expect(() => pmv_e(...args)).toThrow(name);
  });

  test("requires the expectancy factor", () => {
    expect(() => pmv_e(...valid.slice(0, 6))).toThrow("e_coefficient");
  });

  test.each([null, [], true, "SI", 0])(
    "rejects non-object options %p",
    (kwargs) => {
      expect(() => pmv_e(...valid, kwargs)).toThrow(TypeError);
    },
  );

  test.each([null, 1, true])("rejects non-string units %p", (units) => {
    expect(() => pmv_e(...valid, { units })).toThrow(TypeError);
  });

  test.each(["INVALID", "", "metric"])(
    "rejects unsupported units %p",
    (units) => {
      expect(() => pmv_e(...valid, { units })).toThrow('"units"');
    },
  );

  test.each([null, "true", 0])(
    "rejects non-boolean limit_inputs %p",
    (limit_inputs) => {
      expect(() => pmv_e(...valid, { limit_inputs })).toThrow(TypeError);
    },
  );
});
