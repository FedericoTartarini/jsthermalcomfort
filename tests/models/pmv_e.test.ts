import { describe, expect, test } from "@jest/globals";
import { pmv_e } from "../../src/models/index.js";
import type { PmvEParams } from "../../src/models/pmv_e.ts";
import { testDataUrls } from "./comftest.ts";
import {
  assertNonEmptyRows,
  loadTestData,
  validateResult,
} from "./testUtils.ts";

const { testData, tolerances } = await loadTestData(testDataUrls.ePmv);

// The fixture's list row (tdb [24, 30]) runs one scalar case per element
// (ADR 0005).
const rows = assertNonEmptyRows(testData.data, "pmv_e rows");

// Mirrors pythermalcomfort v4.6.2 tests/test_e_pmv.py.
describe("test_e_pmv", () => {
  test.each(rows)("test_e_pmv: fixture case %#", (row) => {
    const result = pmv_e(row.inputs as unknown as PmvEParams);
    validateResult(result, row.outputs, tolerances, row.inputs);
  });
});

// Upstream has no test for these. Every expected value is what
// pythermalcomfort 4.6.2 returns for the same call.
describe("pmv_e beyond upstream's tests", () => {
  // The first fixture row.
  const base = {
    tdb: 24,
    tr: 30,
    vr: 0.22,
    rh: 50,
    met: 1.4,
    clo: 0.5,
    e_coefficient: 0.6,
  };

  test("the docstring example gives 0.48", () => {
    // pmv_e.py:93-106; v_relative(v=0.1, met=1.4) is 0.22 and
    // clo_dynamic_iso(clo=0.5, met=1.4, v=0.1) is 0.40533195941028055 in
    // pythermalcomfort 4.6.2.
    expect(
      pmv_e({
        tdb: 28,
        tr: 28,
        vr: 0.22,
        rh: 50,
        met: 1.4,
        clo: 0.40533195941028055,
        e_coefficient: 0.6,
      }).e_pmv,
    ).toBe(0.48);
  });

  test("a negative first pmv leaves met as it is", () => {
    // The first pmv is -0.34, so met stays 1.2 (pmv_e.py:134).
    expect(
      pmv_e({
        tdb: 20,
        tr: 20,
        vr: 0.1,
        rh: 50,
        met: 1.2,
        clo: 1,
        e_coefficient: 0.6,
      }).e_pmv,
    ).toBe(-0.2);
  });

  test("wme is passed to both pmv calls", () => {
    expect(
      pmv_e({
        tdb: 25,
        tr: 25,
        vr: 0.1,
        rh: 50,
        met: 1.2,
        clo: 0.5,
        e_coefficient: 0.6,
        wme: 0.2,
      }).e_pmv,
    ).toBe(-0.22);
  });

  test.each([
    [0.5, 0.24],
    [-0.5, -0.24],
  ])(
    "e_coefficient %p rounds the tie 0.49 × e to even, as np.around: %p",
    (e_coefficient, expected) => {
      expect(pmv_e({ ...base, e_coefficient }).e_pmv).toBe(expected);
    },
  );

  test("a negative product that rounds to zero is -0, as upstream", () => {
    expect(
      pmv_e({
        tdb: 20,
        tr: 20,
        vr: 0.1,
        rh: 50,
        met: 1.2,
        clo: 1,
        e_coefficient: 0.001,
      }).e_pmv,
    ).toBe(-0);
  });

  test.each([
    ["tdb above 30 °C", { tdb: 31 }, 1.02],
    ["pa above 2700 Pa", { tdb: 30, rh: 90 }, 1.12],
  ])(
    "%s returns NaN, and with limit_inputs false a value",
    (_, change, unlimited) => {
      expect(pmv_e({ ...base, ...change }).e_pmv).toBeNaN();
      expect(pmv_e({ ...base, ...change, limit_inputs: false }).e_pmv).toBe(
        unlimited,
      );
    },
  );

  test.each([
    [
      "the first pmv above 2",
      { tdb: 29, tr: 35, vr: 0.1, rh: 50, met: 0.85, clo: 1.5 },
      1.23,
    ],
    ["pmv above 2", { tdb: 29, tr: 39, vr: 0.1, rh: 60, met: 2, clo: 1 }, 1.61],
  ])(
    "%s returns NaN, and with limit_inputs false a value",
    (_, change, unlimited) => {
      expect(pmv_e({ ...base, ...change }).e_pmv).toBeNaN();
      expect(pmv_e({ ...base, ...change, limit_inputs: false }).e_pmv).toBe(
        unlimited,
      );
    },
  );

  // ADR 0011 as amended: pmv_e returns the rows of both pmv_ppd_iso calls,
  // exact duplicates dropped, in first-seen order.
  // Each expected row is the UserWarning upstream's pmv_ppd_iso emits for
  // that call's inputs under limit_inputs True, with the second call's met
  // upstream's adjusted met (pmv_e.py:121-145 at v4.6.2).
  describe("warnings rows", () => {
    test("a bound both calls break is one row, as upstream's default warnings filter shows it once", () => {
      // Upstream warns "'tdb' has value 31.0 outside the applicability
      // limits [10.0, 30.0]" once per call, so twice.
      expect(pmv_e({ ...base, tdb: 31 })).toEqual({
        e_pmv: NaN,
        warnings: [
          { key: "tdb", role: "input", value: 31, bound: { min: 10, max: 30 } },
        ],
      });
    });

    test("an adjusted met below 0.8 is a derived row", () => {
      // The first pmv is 1.55, so met 0.85 becomes 0.7617275
      // (pmv_e.py:134), and upstream warns "'met' has value 0.7617275
      // outside the applicability limits [0.8, 4.0]" from the second call.
      expect(
        pmv_e({
          tdb: 29,
          tr: 29,
          vr: 0.1,
          rh: 50,
          met: 0.85,
          clo: 1.5,
          e_coefficient: 0.6,
        }),
      ).toEqual({
        e_pmv: NaN,
        warnings: [
          {
            key: "met",
            role: "derived",
            value: 0.7617275,
            bound: { min: 0.8, max: 4 },
          },
        ],
      });
    });

    test("inside every bound there are no rows", () => {
      expect(pmv_e(base)).toEqual({ e_pmv: 0.29, warnings: [] });
    });

    // Upstream warns nothing with limit_inputs False (its range checks run
    // only under limit_inputs, pmv_ppd_iso.py:181-191); the rows say what
    // e_pmv was computed despite, as every model's rows do.
    test("with limit_inputs false, the first call's rows come first, then the second call's new ones", () => {
      // The first pmv is 1.86, so met 0.85 becomes 0.744073; tdb 31 is out
      // of bounds in both calls.
      expect(
        pmv_e({
          tdb: 31,
          tr: 29,
          vr: 0.1,
          rh: 50,
          met: 0.85,
          clo: 1.5,
          e_coefficient: 0.6,
          limit_inputs: false,
        }),
      ).toEqual({
        e_pmv: 0.94,
        warnings: [
          { key: "tdb", role: "input", value: 31, bound: { min: 10, max: 30 } },
          {
            key: "met",
            role: "derived",
            value: 0.744073,
            bound: { min: 0.8, max: 4 },
          },
        ],
      });
    });

    test("with limit_inputs false, two calls' pmv above 2 are two rows, told apart by value", () => {
      // The first pmv is 2.323863160308001 unrounded (2.32 rounded), so met
      // 0.85 becomes 0.717876, and the second pmv is 2.045025099778569.
      expect(
        pmv_e({
          tdb: 29,
          tr: 35,
          vr: 0.1,
          rh: 50,
          met: 0.85,
          clo: 1.5,
          e_coefficient: 0.6,
          limit_inputs: false,
        }),
      ).toEqual({
        e_pmv: 1.23,
        warnings: [
          {
            key: "pmv",
            role: "output",
            value: 2.323863160308001,
            bound: { min: -2, max: 2 },
          },
          {
            key: "met",
            role: "derived",
            value: 0.717876,
            bound: { min: 0.8, max: 4 },
          },
          {
            key: "pmv",
            role: "output",
            value: 2.045025099778569,
            bound: { min: -2, max: 2 },
          },
        ],
      });
    });
  });

  test.each(["IP", "ip"])("units %p converts the inputs", (units) => {
    expect(
      pmv_e({
        tdb: 75.2,
        tr: 86,
        vr: 0.72182,
        rh: 50,
        met: 1.4,
        clo: 0.5,
        e_coefficient: 0.6,
        units: units as "IP",
      }).e_pmv,
    ).toBe(0.29);
  });

  test("units 'si' is SI", () => {
    expect(pmv_e({ ...base, units: "si" as "SI" }).e_pmv).toBe(0.29);
  });

  test("an undefined wme, units or limit_inputs takes its default", () => {
    expect(
      pmv_e({
        ...base,
        wme: undefined,
        units: undefined,
        limit_inputs: undefined,
      }).e_pmv,
    ).toBe(0.29);
    expect(pmv_e({ ...base, tdb: 31, limit_inputs: undefined }).e_pmv).toBe(
      NaN,
    );
  });

  describe("errors", () => {
    const call = (params: unknown) => () => pmv_e(params as PmvEParams);

    test("a positional call throws a TypeError", () => {
      expect(() =>
        (pmv_e as unknown as (...args: number[]) => unknown)(
          24,
          30,
          0.22,
          50,
          1.4,
          0.5,
          0.6,
        ),
      ).toThrow(TypeError);
    });

    // Upstream: "pmv_e() got an unexpected keyword argument 'round_output'"
    // (ADR 0008). The old e_pmv passed round_output on to pmv.
    test.each(["round_output", "airspeed_control", "standard"])(
      "an unknown key %p throws a TypeError",
      (key) => {
        expect(call({ ...base, [key]: false })).toThrow(TypeError);
        expect(call({ ...base, [key]: false })).toThrow(`'${key}'`);
      },
    );

    // Upstream: "pmv_e() missing 1 required positional argument".
    test("a missing e_coefficient throws a TypeError", () => {
      const { e_coefficient: _, ...rest } = base;
      expect(call(rest)).toThrow(TypeError);
    });

    // Upstream's EPMVInputs raises a TypeError for a string.
    test.each(["tdb", "tr", "vr", "rh", "met", "clo", "e_coefficient", "wme"])(
      "a string %s throws a TypeError",
      (key) => {
        expect(call({ ...base, [key]: "1" })).toThrow(TypeError);
      },
    );

    // ADR 0001: upstream returns NaN for a NaN tdb or e_coefficient, NaN for
    // an infinite tdb, and inf or -inf for an infinite e_coefficient.
    test.each([
      ["tdb", NaN],
      ["tdb", Infinity],
      ["e_coefficient", NaN],
      ["e_coefficient", Infinity],
      ["e_coefficient", -Infinity],
    ])("a non-finite %s (%p) throws a TypeError", (key, value) => {
      expect(call({ ...base, [key]: value })).toThrow(TypeError);
    });

    // ADR 0005: upstream reads True as 1 (an e_coefficient True gives 0.49)
    // and broadcasts a list tdb ([0.29, 0.91]); upstream raises a TypeError
    // for a list e_coefficient and a None quantity.
    test.each([
      ["tdb", true],
      ["e_coefficient", true],
      ["tdb", [24, 30]],
      ["e_coefficient", [0.6, 0.5]],
      ["tdb", null],
      ["e_coefficient", null],
      ["wme", null],
    ])("%s %p throws a TypeError", (key, value) => {
      expect(call({ ...base, [key]: value })).toThrow(TypeError);
    });

    // Upstream: ValueError "Units must be either 'SI' or 'IP'" (ADR 0012:
    // Error), also for 5 and None.
    test.each(["X", 5, null])("units %p throws an Error", (units) => {
      expect(call({ ...base, units })).toThrow('"units" must be one of');
    });

    // Upstream: TypeError "limit_inputs must be a boolean (True or False)".
    test.each(["true", 1, null])(
      "limit_inputs %p throws a TypeError",
      (limit_inputs) => {
        expect(call({ ...base, limit_inputs })).toThrow(TypeError);
      },
    );
  });
});
