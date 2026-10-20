import { describe, expect, test } from "@jest/globals";
import { two_nodes_gagge } from "../../src/models/two_nodes_gagge.ts";
import type {
  TwoNodesGaggeParams,
  TwoNodesGaggeResult,
} from "../../src/models/two_nodes_gagge.ts";
import { testDataUrls } from "./comftest.ts";
import {
  assertNonEmptyRows,
  loadTestData,
  validateResult,
} from "./testUtils.ts";

const { testData, tolerances } = await loadTestData(testDataUrls.twoNodes);

// Every row of the fixture is scalar (no list inputs), so each runs as it is.
const rows = assertNonEmptyRows(testData.data, "two_nodes_gagge fixture rows");

// Mirrors pythermalcomfort v4.6.2 tests/test_two_nodes_gagge.py.
describe("test_two_nodes_gagge", () => {
  // As upstream, `two_nodes_gagge(**inputs)`: the row's inputs unchanged,
  // so the output is rounded to 2 decimals, upstream's default.
  test.each(rows)("test_two_nodes: fixture case %#", ({ inputs, outputs }) => {
    const result = two_nodes_gagge(inputs as unknown as TwoNodesGaggeParams);
    validateResult(result, outputs, tolerances, inputs);
  });
});

// Upstream has no test for these. Every expected value is what
// pythermalcomfort 4.6.2 returns for the same call.
describe("two_nodes_gagge beyond upstream's tests", () => {
  const base = { tdb: 25, tr: 25, v: 0.3, rh: 50, met: 1.2, clo: 0.5 };

  test("unrounded output has upstream's snake_case fields and values", () => {
    const result = two_nodes_gagge({ ...base, round_output: false });
    const expected: Record<string, number> = {
      e_skin: 16.174628704733557,
      e_rsw: 7.002742953723013,
      e_max: 159.86750547056542,
      q_sensible: 47.614320411175704,
      q_skin: 63.78894911590926,
      q_res: 5.159704668041644,
      t_core: 36.85515163641616,
      t_skin: 33.713118305673476,
      m_bl: 12.91819636993954,
      m_rsw: 10.298151402533842,
      w: 0.10117521166746177,
      w_max: 0.649654290898561,
      set: 23.559603528358306,
      et: 25.0000302351544,
      pmv_gagge: 0.11162122004329866,
      pmv_set: -0.005165502811957912,
      disc: 0.1106432232765798,
      t_sens: 0.09132583404495881,
    };
    expect(Object.keys(result).sort()).toEqual(Object.keys(expected).sort());
    for (const [key, value] of Object.entries(expected)) {
      expect(result[key as keyof TwoNodesGaggeResult]).toBeCloseTo(value, 12);
    }
  });

  // Upstream's fixture has no row with a non-default wme, body_surface_area
  // or p_atm.
  test.each([
    [
      { wme: 0.5 },
      {
        e_skin: 8.474954747359735,
        e_rsw: -0.0,
        e_max: 141.24924578932894,
        q_sensible: 39.38340630838099,
        q_skin: 47.85836105574073,
        q_res: 5.159704668041644,
        t_core: 36.649152918616046,
        t_skin: 32.203684229881866,
        m_bl: 3.603793486757707,
        m_rsw: -0.0,
        w: 0.06,
        w_max: 0.649654290898561,
        set: 23.90125008148429,
        et: 24.98866872231046,
        pmv_gagge: -1.1540564265645477,
        pmv_set: -1.2613805196017867,
        disc: -0.35696351619470656,
        t_sens: -0.35696351619470656,
      },
    ],
    [
      { body_surface_area: 2.0 },
      {
        e_skin: 16.17961312466139,
        e_rsw: 7.007931195388816,
        e_max: 159.86929668326502,
        q_sensible: 47.615173881574826,
        q_skin: 63.79478700623622,
        q_res: 5.159704668041644,
        t_core: 36.85516331045233,
        t_skin: 33.71325832869229,
        m_bl: 12.919597254280337,
        m_rsw: 10.305781169689435,
        w: 0.10120525617071197,
        w_max: 0.649654290898561,
        set: 23.559441266318448,
        et: 25.000016230415103,
        pmv_gagge: 0.11158710043676474,
        pmv_set: -0.005233051681076339,
        disc: 0.11091308544955392,
        t_sens: 0.09156951205024809,
      },
    ],
    [
      { p_atm: 90000 },
      {
        e_skin: 17.037433203624804,
        e_rsw: 7.026493252344099,
        e_max: 173.87549244035586,
        q_sensible: 46.751498821103134,
        q_skin: 63.78893202472794,
        q_res: 5.159704668041644,
        t_core: 36.85519472421706,
        t_skin: 33.71409216205026,
        m_bl: 12.923366906047182,
        m_rsw: 10.333078312270732,
        w: 0.09798639799377776,
        w_max: 0.649654290898561,
        set: 23.801391731576466,
        et: 25.000030131117995,
        pmv_gagge: 0.11286948550875846,
        pmv_set: 0.012603757813802708,
        disc: 0.10246010836158657,
        t_sens: 0.09243081958876966,
      },
    ],
  ])("unrounded output with %p", (input, expected: Record<string, number>) => {
    const result = two_nodes_gagge({ ...base, ...input, round_output: false });
    expect(Object.keys(result).sort()).toEqual(Object.keys(expected).sort());
    for (const [key, value] of Object.entries(expected)) {
      expect(result[key as keyof TwoNodesGaggeResult]).toBeCloseTo(value, 12);
    }
  });

  test("rounds every field to 2 decimals by default", () => {
    expect(two_nodes_gagge(base)).toEqual({
      e_skin: 16.17,
      e_rsw: 7.0,
      e_max: 159.87,
      q_sensible: 47.61,
      q_skin: 63.79,
      q_res: 5.16,
      t_core: 36.86,
      t_skin: 33.71,
      m_bl: 12.92,
      m_rsw: 10.3,
      w: 0.1,
      w_max: 0.65,
      set: 23.56,
      et: 25.0,
      pmv_gagge: 0.11,
      pmv_set: -0.01,
      disc: 0.11,
      t_sens: 0.09,
    });
  });

  test("rounds a tie to even, as numpy's around", () => {
    const result = two_nodes_gagge({
      tdb: 36,
      tr: 36,
      v: 0.2,
      rh: 60,
      met: 1.5,
      clo: 0.5,
      w_max: 0.125,
    });
    expect(result.w_max).toBe(0.12);
    expect(result.w).toBe(0.12);
  });

  test("starts the SET secant from the guess rounded to 2 decimals", () => {
    const result = two_nodes_gagge({
      tdb: 40,
      tr: 40,
      v: 0.2,
      rh: 50,
      met: 2.5,
      clo: 0.5,
      max_sweating: 100,
      round_output: false,
    });
    expect(result.set).toBe(40.41382906005051);
  });

  // ADR 0007: position is validated without regard to case and accepts
  // "standing, forced convection"; only the exact "sitting" computes as
  // sitting.
  test.each([
    ["sitting", 23.51],
    ["standing", 23.56],
    ["Sitting", 23.56],
    ["STANDING", 23.56],
    ["standing, forced convection", 23.56],
  ])("position %p computes set %p", (position, set) => {
    const params = { ...base, position } as unknown as TwoNodesGaggeParams;
    expect(two_nodes_gagge(params).set).toBe(set);
  });

  test("position null computes as standing, as upstream's None", () => {
    const params = {
      ...base,
      position: null,
    } as unknown as TwoNodesGaggeParams;
    expect(two_nodes_gagge(params).set).toBe(23.56);
  });

  test.each(["lying", 1, true, { a: 1 }])(
    "position %p throws upstream's ValueError",
    (p) => {
      const params = { ...base, position: p } as unknown as TwoNodesGaggeParams;
      expect(() => two_nodes_gagge(params)).toThrow(
        new Error(
          "position must be one of ['sitting', 'standing', 'standing, forced convection']",
        ),
      );
    },
  );

  // ADR 0005 as amended: position takes one string. pythermalcomfort 4.6.2
  // broadcasts a list instead: two_nodes_gagge(tdb=25, tr=25, v=0.3, rh=50,
  // met=1.2, clo=0.5, position=["sitting"]).set is [23.51], and with
  // ["sitting", "standing"] it is [23.51 23.56].
  test.each([[["sitting"]], [["sitting", "standing"]]])(
    "position %p throws a TypeError",
    (p) => {
      const params = { ...base, position: p } as unknown as TwoNodesGaggeParams;
      const call = () => two_nodes_gagge(params);
      expect(call).toThrow(TypeError);
      expect(call).toThrow("position must be a string, got an array");
    },
  );

  test.each([false, null, 0] as const)(
    "w_max %p computes the practical upper limit",
    (w_max) => {
      const result = two_nodes_gagge({ ...base, w_max, round_output: false });
      expect(result.w_max).toBeCloseTo(0.649654290898561, 14);
    },
  );

  describe("calculate_ce", () => {
    test("returns only the unrounded set, whatever round_output is", () => {
      expect(two_nodes_gagge({ ...base, calculate_ce: true })).toEqual({
        set: 22.886202919249225,
      });
    });

    // Upstream computes the cooling-effect SET standing, with the kernel's
    // defaults for the skin blood flow, the sweating and w_max.
    test("computes standing whatever position is", () => {
      const result = two_nodes_gagge({
        ...base,
        position: "sitting",
        calculate_ce: true,
      });
      expect(result.set).toBe(22.886202919249225);
    });

    const hot = { tdb: 40, tr: 40, v: 0.2, rh: 50, met: 2.5, clo: 0.5 };

    test("ignores max_skin_blood_flow", () => {
      const result = two_nodes_gagge({
        ...hot,
        max_skin_blood_flow: 10,
        calculate_ce: true,
      });
      expect(result.set).toBe(40.38250661668867);
    });

    const dry = { tdb: 45, tr: 45, v: 3, rh: 5, met: 8, clo: 0 };

    test("caps regulatory sweating at the kernel's 500", () => {
      const result = two_nodes_gagge({ ...dry, calculate_ce: true });
      expect(result.set).toBeCloseTo(13.992490110657098, 11);
    });

    test("ignores max_sweating", () => {
      const result = two_nodes_gagge({
        ...dry,
        max_sweating: 50,
        calculate_ce: true,
      });
      expect(result.set).toBeCloseTo(13.992490110657098, 11);
    });

    test("ignores w_max", () => {
      const result = two_nodes_gagge({
        tdb: 36,
        tr: 36,
        v: 0.2,
        rh: 60,
        met: 1.5,
        clo: 0.5,
        w_max: 0.2,
        calculate_ce: true,
      });
      expect(result.set).toBeCloseTo(36.88556277468941, 12);
    });

    // Upstream's GaggeTwoNodesInputs is not given calculate_ce, so it is
    // read for its truth value and not validated.
    test("is read for its truth value", () => {
      const params = {
        ...base,
        calculate_ce: "yes",
      } as unknown as TwoNodesGaggeParams;
      expect(two_nodes_gagge(params)).toEqual({ set: 22.886202919249225 });
    });
  });

  describe("errors", () => {
    test("round_output that is not a boolean throws upstream's TypeError", () => {
      const params = {
        ...base,
        round_output: "yes",
      } as unknown as TwoNodesGaggeParams;
      expect(() => two_nodes_gagge(params)).toThrow(TypeError);
    });

    // ADR 0008: upstream raises a TypeError for an unexpected keyword.
    test("an unknown key throws a TypeError naming it", () => {
      const params = { ...base, units: "IP" } as unknown as TwoNodesGaggeParams;
      expect(() => two_nodes_gagge(params)).toThrow(
        new TypeError("two_nodes_gagge got an unexpected key: 'units'"),
      );
    });

    // ADR 0002: a positional call fails instead of running as defaults.
    test("a positional call throws a TypeError", () => {
      const call = two_nodes_gagge as unknown as (...args: number[]) => unknown;
      expect(() => call(25, 25, 0.3, 50, 1.2, 0.5)).toThrow(TypeError);
    });

    // ADR 0001: a public model throws a TypeError for a non-finite number.
    // Upstream raises StopIteration for a NaN tdb, tr, rh, met, clo or wme,
    // and returns numbers for a NaN v or max_sweating.
    test.each(["tdb", "tr", "v", "rh", "met", "clo", "wme", "max_sweating"])(
      "a non-finite %s throws a TypeError",
      (key) => {
        const params = {
          ...base,
          [key]: NaN,
        } as unknown as TwoNodesGaggeParams;
        expect(() => two_nodes_gagge(params)).toThrow(TypeError);
      },
    );

    // ADR 0005: quantities are numbers; upstream would broadcast the list.
    test("an array throws a TypeError", () => {
      const params = {
        ...base,
        tdb: [25, 30],
      } as unknown as TwoNodesGaggeParams;
      expect(() => two_nodes_gagge(params)).toThrow(TypeError);
    });
  });
});
