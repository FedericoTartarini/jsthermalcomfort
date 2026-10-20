import { describe, expect, test } from "@jest/globals";
import { pmv_a } from "../../src/models/index.js";
import type { PmvAParams } from "../../src/models/pmv_a.ts";
import { ISO_7730_LIMITS } from "../../src/utilities/utilities.js";
import { testDataUrls } from "./comftest.ts";
import {
  assertNonEmptyRows,
  loadTestData,
  validateResult,
} from "./testUtils.ts";

const { testData, tolerances } = await loadTestData(testDataUrls.aPmv);

// The fixture's list row (tdb [24, 30]) runs one scalar case per element
// (ADR 0005).
const rows = assertNonEmptyRows(testData.data, "pmv_a fixture rows");

// Mirrors pythermalcomfort v4.6.2 tests/test_a_pmv.py.
describe("test_a_pmv", () => {
  test.each(rows)("test_a_pmv: fixture case %#", ({ inputs, outputs }) => {
    const result = pmv_a(inputs as unknown as PmvAParams);
    validateResult(result, outputs, tolerances, inputs);
  });

  // Upstream calls pmv_a("25", 25, 0.1, 50, 1.2, 0.5, 7) positionally; here
  // each argument gets its name (ADR 0002). Its ValueError is an Error here
  // (ADR 0012).
  test("test_a_pmv_wrong_input_type", () => {
    expect(() =>
      pmv_a({
        // @ts-expect-error tdb is a number; the runtime check is under test
        tdb: "25",
        tr: 25,
        vr: 0.1,
        rh: 50,
        met: 1.2,
        clo: 0.5,
        a_coefficient: 7,
      }),
    ).toThrow(TypeError);
    expect(() =>
      pmv_a({
        tdb: 25,
        tr: 25,
        vr: 0.1,
        rh: 50,
        met: 1.2,
        clo: 0.5,
        a_coefficient: 7,
        // @ts-expect-error units is "SI" or "IP"; the runtime check is under test
        units: "celsius",
      }),
    ).toThrow(Error);
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
        // @ts-expect-error units is "SI" or "IP"; the runtime check is under test
        units: "wrong",
      }),
    ).toThrow(Error);
  });
});

// Upstream has no test for these. Every expected value is what
// pythermalcomfort 4.6.2 returns for the same call, and every row is a
// UserWarning upstream emits for it under limit_inputs=True.
describe("pmv_a beyond upstream's tests", () => {
  const base = {
    tdb: 25,
    tr: 25,
    vr: 0.1,
    rh: 50,
    met: 1.2,
    clo: 0.5,
    a_coefficient: 0.293,
  };
  const row = (
    key: "tdb" | "met" | "pa" | "pmv",
    role: string,
    value: number,
  ) => ({ key, role, value, bound: ISO_7730_LIMITS[key] });

  test("base case: a_pmv 0.08 and no rows", () => {
    expect(pmv_a(base)).toEqual({ a_pmv: 0.08, warnings: [] });
  });

  // pmv_a.py:84-104: vr = v_relative(v=0.1, met=1.4) is 0.22 and
  // clo_dynamic_iso(clo=0.5, met=1.4, v=0.1) is 0.40533195941028055 in
  // upstream 4.6.2. Upstream's docstring prints 0.74 and then 0.71 for this
  // call; it returns 0.71.
  test("upstream's docstring example returns 0.71", () => {
    const result = pmv_a({
      tdb: 28,
      tr: 28,
      vr: 0.22,
      rh: 50,
      met: 1.4,
      clo: 0.40533195941028055,
      a_coefficient: 0.293,
    });
    expect(result).toEqual({ a_pmv: 0.71, warnings: [] });
  });

  test.each([
    [
      "tdb 5",
      { tdb: 5 },
      [row("tdb", "input", 5), row("pmv", "output", -3.7205270788545484)],
      41.35,
    ],
    // The tdb bound is inclusive; the pmv bound is broken.
    [
      "tdb 10",
      { tdb: 10 },
      [row("pmv", "output", -2.7116113922073306)],
      -13.16,
    ],
    ["tdb 30.01", { tdb: 30.01 }, [row("tdb", "input", 30.01)], 0.7],
    [
      "pa above 2700 Pa",
      { tdb: 29, rh: 90 },
      [row("pa", "derived", 3605.2632345813454)],
      0.81,
    ],
    [
      "pmv above 2",
      { tdb: 30, tr: 40, met: 2, clo: 1 },
      [row("pmv", "output", 2.847201761094712)],
      1.55,
    ],
    [
      "tdb 5 and met 5",
      { tdb: 5, met: 5 },
      [row("tdb", "input", 5), row("met", "input", 5)],
      1.25,
    ],
  ])(
    "%s: NaN with its rows, and with limit_inputs false the value and the same rows",
    (_, inputs, warnings, unlimited) => {
      expect(pmv_a({ ...base, ...inputs })).toEqual({ a_pmv: NaN, warnings });
      expect(pmv_a({ ...base, ...inputs, limit_inputs: false })).toEqual({
        a_pmv: unlimited,
        warnings,
      });
    },
  );

  test("tdb 30, on the bound, is computed", () => {
    expect(pmv_a({ ...base, tdb: 30 })).toEqual({ a_pmv: 0.7, warnings: [] });
  });

  test("limit_inputs undefined keeps the default", () => {
    expect(pmv_a({ ...base, tdb: 5, limit_inputs: undefined }).a_pmv).toBe(NaN);
  });

  test.each([["IP"], ["ip"]])("units %p: 77 °F, 0.4 fps", (units) => {
    const ip = { ...base, tdb: 77, tr: 77, vr: 0.4 };
    expect(pmv_a({ ...ip, units: units as "IP" })).toEqual({
      a_pmv: 0.02,
      warnings: [],
    });
  });

  test("units IP: the rows hold the SI values", () => {
    const result = pmv_a({ ...base, tdb: 40, tr: 77, vr: 0.4, units: "IP" });
    expect(result).toEqual({
      a_pmv: NaN,
      warnings: [
        row("tdb", "input", 4.444444444444445),
        row("pmv", "output", -3.834089852517872),
      ],
    });
  });

  test("units 'si' is accepted", () => {
    expect(pmv_a({ ...base, units: "si" as "SI" }).a_pmv).toBe(0.08);
  });

  test.each([
    ["wme 0.1", { wme: 0.1 }, -0.16],
    ["a_coefficient -0.293", { a_coefficient: -0.293 }, 0.08],
    ["a_coefficient 0", { a_coefficient: 0 }, 0.08],
    ["a_coefficient 7", { a_coefficient: 7 }, 0.05],
  ])("%s", (_, inputs, a_pmv) => {
    expect(pmv_a({ ...base, ...inputs }).a_pmv).toBe(a_pmv);
  });

  // Inputs where upstream's rounded pmv is exactly 0.25, 0.5 or -0.5, so the
  // quotient is exactly ±0.125: np.around rounds half to even.
  test.each([
    [26.03, 4, 0.12],
    [27.61, 6, 0.12],
    [21.49, -6, -0.12],
  ])("tie: tdb %p, a_coefficient %p gives %p", (tdb, a_coefficient, a_pmv) => {
    expect(pmv_a({ ...base, tdb, a_coefficient }).a_pmv).toBe(a_pmv);
  });

  // pmv -0.5 and a_coefficient 2: 1 + 2 * -0.5 is 0, and numpy's division
  // gives -inf.
  test("a zero denominator gives -Infinity", () => {
    expect(pmv_a({ ...base, tdb: 21.49, a_coefficient: 2 }).a_pmv).toBe(
      -Infinity,
    );
  });

  test.each([
    [24.44, -0],
    [24.48, 0],
  ])("tdb %p: a_pmv keeps the sign of zero, as upstream", (tdb, a_pmv) => {
    expect(Object.is(pmv_a({ ...base, tdb }).a_pmv, a_pmv)).toBe(true);
  });

  describe("errors", () => {
    // Upstream raises TypeError: pmv_a() got an unexpected keyword argument
    // for each (ADR 0008); this library names upstream's model `standard`
    // (ADR 0003).
    test.each([
      ["round_output"],
      ["model"],
      ["standard"],
      ["airspeed_control"],
    ])("an unknown key %p throws a TypeError", (key) => {
      const params = { ...base, [key]: false } as unknown as PmvAParams;
      expect(() => pmv_a(params)).toThrow(TypeError);
      expect(() => pmv_a(params)).toThrow(`unexpected key: '${key}'`);
    });

    test("a positional call throws a TypeError (ADR 0002)", () => {
      // @ts-expect-error the positional shape is under test
      expect(() => pmv_a(25, 25, 0.1, 50, 1.2, 0.5, 0.293)).toThrow(TypeError);
    });

    // Upstream raises TypeError: limit_inputs must be a boolean.
    test.each([["true"], [null]])(
      "limit_inputs %p throws a TypeError",
      (limit_inputs) => {
        const params = { ...base, limit_inputs } as unknown as PmvAParams;
        expect(() => pmv_a(params)).toThrow(TypeError);
      },
    );

    // Upstream raises ValueError: Units must be either 'SI' or 'IP' (ADR 0012).
    test.each([[null], [5]])("units %p throws an Error", (units) => {
      const params = { ...base, units } as unknown as PmvAParams;
      expect(() => pmv_a(params)).toThrow('"units" must be one of');
    });

    // Upstream raises TypeError for each.
    test.each([["0.293"], [[0.293]], [null]])(
      "a_coefficient %p throws a TypeError",
      (a_coefficient) => {
        const params = { ...base, a_coefficient } as unknown as PmvAParams;
        expect(() => pmv_a(params)).toThrow(TypeError);
      },
    );

    const keys = [
      "tdb",
      "tr",
      "vr",
      "rh",
      "met",
      "clo",
      "a_coefficient",
      "wme",
    ];
    // Upstream returns a result for every one of these: NaN, except 0.0 and
    // -0.0 for an a_coefficient of +inf and -inf. A public model rejects a
    // non-finite number (ADR 0001).
    test.each(
      keys.flatMap((key) =>
        [NaN, Infinity, -Infinity].map((value) => [key, value]),
      ),
    )("%s %p throws a TypeError", (key, value) => {
      const params = { ...base, [key as string]: value } as PmvAParams;
      expect(() => pmv_a(params)).toThrow(TypeError);
    });

    // Upstream reads True as 1 (a tdb of True returns NaN with a tdb row, an
    // a_coefficient of True returns 0.07); a quantity is a number
    // (ADR 0005).
    test.each(keys)("%s true throws a TypeError", (key) => {
      const params = { ...base, [key]: true } as unknown as PmvAParams;
      expect(() => pmv_a(params)).toThrow(TypeError);
    });

    // Upstream returns array([-0.07, 0.7]) for tdb [24, 30]; quantities are
    // scalars (ADR 0005).
    test("a list tdb throws a TypeError", () => {
      const params = { ...base, tdb: [24, 30] } as unknown as PmvAParams;
      expect(() => pmv_a(params)).toThrow(TypeError);
    });
  });
});
