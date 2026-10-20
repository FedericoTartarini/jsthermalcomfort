import { describe, expect, jest, test } from "@jest/globals";
import { use_fans_heatwaves } from "../../src/models/index.js";
import {
  USE_FANS_HEATWAVES_LIMITS,
  type UseFansHeatwavesParams,
} from "../../src/models/use_fans_heatwaves.ts";
import { testDataUrls } from "./comftest.ts";
import {
  assertNonEmptyRows,
  loadTestData,
  validateResult,
} from "./testUtils.ts";

const { testData, tolerances } = await loadTestData(
  testDataUrls.use_fans_heatwaves,
);

// The fixture's list row (tdb [41, 60]) runs one scalar case per element
// (ADR 0005).
const rows = assertNonEmptyRows(testData.data, "use_fans_heatwaves rows");

// Mirrors pythermalcomfort v4.6.2 tests/test_use_fans_heatwaves.py.
describe("test_use_fans_heatwaves", () => {
  test.each(rows)("test_use_fans_heatwaves: fixture case %#", (row) => {
    const result = use_fans_heatwaves(
      row.inputs as unknown as UseFansHeatwavesParams,
    );
    validateResult(result, row.outputs, tolerances, row.inputs);
  });
});

// Upstream has no test for these. Every expected value is what
// pythermalcomfort 4.6.2 returns for the same call.
describe("use_fans_heatwaves beyond upstream's tests", () => {
  // The docstring example (use_fans_heatwaves.py:91-92).
  const base = { tdb: 35, tr: 35, v: 1.0, rh: 50, met: 1.2, clo: 0.5 };
  // The quantities the gate masks for; rh adds a row only.
  type Gated = "tdb" | "tr" | "v" | "met" | "clo";
  const row = (key: keyof typeof USE_FANS_HEATWAVES_LIMITS, value: number) => ({
    key,
    role: "input",
    value,
    bound: USE_FANS_HEATWAVES_LIMITS[key],
  });
  // Unrounded outputs can differ from upstream's in the last bits, from
  // two_nodes_gagge's Math.exp (see the note at its kernel); toEqual still
  // checks the key set, the flags, the NaNs and the rows exactly.
  const near = (expected: Record<string, unknown>) =>
    Object.fromEntries(
      Object.entries(expected).map(([key, value]) => [
        key,
        typeof value === "number" && !Number.isNaN(value)
          ? expect.closeTo(value, 9)
          : value,
      ]),
    );
  const masked = {
    e_skin: NaN,
    e_rsw: NaN,
    e_max: NaN,
    q_sensible: NaN,
    q_skin: NaN,
    q_res: NaN,
    t_core: NaN,
    t_skin: NaN,
    m_bl: NaN,
    m_rsw: NaN,
    w: NaN,
    w_max: NaN,
    heat_strain: NaN,
    heat_strain_blood_flow: NaN,
    heat_strain_w: NaN,
    heat_strain_sweating: NaN,
  };
  const base_unrounded = {
    e_skin: 63.04048341967246,
    e_rsw: 56.010600807754486,
    e_max: 173.1753110063874,
    q_sensible: 2.8096641382809286,
    q_skin: 65.85014755795339,
    q_res: 3.6799093185532494,
    t_core: 37.00660520566826,
    t_skin: 35.41609298239892,
    m_bl: 31.092624680191296,
    m_rsw: 82.36853059963894,
    w: 0.3640269681244994,
    w_max: 0.59,
    heat_strain: false,
    heat_strain_blood_flow: false,
    heat_strain_w: false,
    heat_strain_sweating: false,
  };
  const base_rounded = {
    e_skin: 63.0,
    e_rsw: 56.0,
    e_max: 173.2,
    q_sensible: 2.8,
    q_skin: 65.9,
    q_res: 3.7,
    t_core: 37.0,
    t_skin: 35.4,
    m_bl: 31.1,
    m_rsw: 82.4,
    w: 0.4,
    w_max: 0.6,
    heat_strain: false,
    heat_strain_blood_flow: false,
    heat_strain_w: false,
    heat_strain_sweating: false,
  };

  test("the docstring example gives e_skin 63.0", () => {
    expect(use_fans_heatwaves(base)).toEqual({
      ...base_rounded,
      warnings: [],
    });
  });

  test("round_output false returns the unrounded values", () => {
    expect(use_fans_heatwaves({ ...base, round_output: false })).toEqual(
      near({
        ...base_unrounded,
        warnings: [],
      }),
    );
  });

  // Upstream's own test runs only the fixture, whose rows have no true flag
  // and no heat_strain_sweating or heat_strain field. Upstream returns the
  // flags as floats 1.0 / 0.0 under limit_inputs; they are booleans here
  // (ADR 0006).
  describe("the heat-strain flags", () => {
    test("m_bl at max_skin_blood_flow and w at w_max: blood flow, w and heat_strain true", () => {
      const result = use_fans_heatwaves({
        tdb: 40,
        tr: 40,
        v: 0.5,
        rh: 50,
        met: 2.0,
        clo: 0.5,
        round_output: false,
      });
      expect(Object.keys(result)).toEqual([
        "e_skin",
        "e_rsw",
        "e_max",
        "q_sensible",
        "q_skin",
        "q_res",
        "t_core",
        "t_skin",
        "m_bl",
        "m_rsw",
        "w",
        "w_max",
        "heat_strain",
        "heat_strain_blood_flow",
        "heat_strain_w",
        "heat_strain_sweating",
        "warnings",
      ]);
      expect(result).toEqual(
        near({
          e_skin: 92.39394622528623,
          e_rsw: 89.66484451436244,
          e_max: 135.1498730297589,
          q_sensible: -16.666457543916508,
          q_skin: 75.72748868136972,
          q_res: 4.3726593302317704,
          t_core: 38.07135156461896,
          t_skin: 37.283697293973965,
          m_bl: 80.0,
          m_rsw: 131.8600654622977,
          w: 0.6236406439312143,
          w_max: 0.6236406439312143,
          heat_strain: true,
          heat_strain_blood_flow: true,
          heat_strain_w: true,
          heat_strain_sweating: false,
          warnings: [],
        }),
      );
    });

    test("m_rsw exactly at max_sweating: sweating and heat_strain true", () => {
      const result = use_fans_heatwaves({
        tdb: 44,
        tr: 44,
        v: 3,
        rh: 30,
        met: 2.0,
        clo: 0,
        max_sweating: 300,
        round_output: false,
      });
      expect(result).toEqual(
        near({
          e_skin: 245.29481192752405,
          e_rsw: 204.00000000000003,
          e_max: 892.2468654587341,
          q_sensible: -143.76537559204866,
          q_skin: 101.5294363354754,
          q_res: 6.296346513362758,
          t_core: 37.9402086263557,
          t_skin: 36.90254714898873,
          m_bl: 80.0,
          m_rsw: 300.0,
          w: 0.2749180988172032,
          w_max: 0.27632388912313743,
          heat_strain: true,
          heat_strain_blood_flow: true,
          heat_strain_w: false,
          heat_strain_sweating: true,
          warnings: [],
        }),
      );
    });

    test("w at w_max alone, with max_skin_blood_flow 50 and max_sweating 100", () => {
      expect(
        use_fans_heatwaves({
          tdb: 30,
          tr: 30,
          v: 0.1,
          rh: 70,
          met: 1.6,
          clo: 1,
          max_sweating: 100,
          max_skin_blood_flow: 50,
          round_output: false,
        }),
      ).toEqual(
        near({
          e_skin: 67.10599747930735,
          e_rsw: 65.8217507846214,
          e_max: 87.22586236272046,
          q_sensible: 21.31948350910776,
          q_skin: 88.4254809884151,
          q_res: 4.651912716266304,
          t_core: 37.05481199573007,
          t_skin: 35.24255121248602,
          m_bl: 36.877439487608726,
          m_rsw: 96.79669233032558,
          w: 0.7093360164242736,
          w_max: 0.7093360164242736,
          heat_strain: true,
          heat_strain_blood_flow: false,
          heat_strain_w: true,
          heat_strain_sweating: false,
          warnings: [],
        }),
      );
    });

    test("rounded, the flags stay booleans", () => {
      expect(
        use_fans_heatwaves({
          tdb: 44,
          tr: 44,
          v: 3,
          rh: 30,
          met: 2.0,
          clo: 0,
          max_sweating: 300,
        }),
      ).toEqual({
        e_skin: 245.3,
        e_rsw: 204.0,
        e_max: 892.2,
        q_sensible: -143.8,
        q_skin: 101.5,
        q_res: 6.3,
        t_core: 37.9,
        t_skin: 36.9,
        m_bl: 80.0,
        m_rsw: 300.0,
        w: 0.3,
        w_max: 0.3,
        heat_strain: true,
        heat_strain_blood_flow: true,
        heat_strain_w: false,
        heat_strain_sweating: true,
        warnings: [],
      });
    });
  });

  // Upstream checks tdb, tr, v, rh, met and clo under limit_inputs, with a
  // UserWarning for each (use_fans_heatwaves.py:178-195); here the rows are
  // built whatever limit_inputs is (ADR 0001).
  describe("the applicability limits", () => {
    test("are USE_FANS_HEATWAVES_LIMITS, frozen", () => {
      expect(USE_FANS_HEATWAVES_LIMITS).toEqual({
        tdb: { min: 20, max: 50 },
        tr: { min: 20, max: 50 },
        v: { min: 0.1, max: 4.5 },
        rh: { min: 0, max: 100 },
        met: { min: 0.7, max: 2 },
        clo: { min: 0, max: 1 },
      });
      expect(Object.isFrozen(USE_FANS_HEATWAVES_LIMITS)).toBe(true);
      for (const bound of Object.values(USE_FANS_HEATWAVES_LIMITS)) {
        expect(Object.isFrozen(bound)).toBe(true);
      }
    });

    test.each([
      ["tdb", 20, 13.3],
      ["tdb", 50, 33.3],
      ["tr", 20, 36.4],
      ["tr", 50, 95.4],
      ["v", 0.1, 63.0],
      ["v", 4.5, 63.1],
      ["met", 0.7, 37.6],
      ["met", 2.0, 103.7],
      ["clo", 0, 65.4],
      ["clo", 1, 63.3],
    ] as [Gated, number, number][])(
      "are inclusive: %s %p gives e_skin %p",
      (key, value, e_skin) => {
        const result = use_fans_heatwaves({ ...base, [key]: value });
        expect(result.e_skin).toBe(e_skin);
        expect(result.warnings).toEqual([]);
      },
    );

    // Upstream 4.6.2 returns -0.0 for both.
    test("tdb 20 rounds e_rsw and m_rsw to -0, as upstream", () => {
      const result = use_fans_heatwaves({ ...base, tdb: 20 });
      expect(result.e_rsw).toBe(-0);
      expect(result.m_rsw).toBe(-0);
    });

    test.each([
      ["tdb", 19.99],
      ["tdb", 50.01],
      ["tr", 19.99],
      ["tr", 50.01],
      ["v", 0.09000000000000001],
      ["v", 4.51],
      ["met", 0.69],
      ["met", 2.01],
      ["clo", -0.01],
      ["clo", 1.01],
    ] as [Gated, number][])(
      "%s %p masks every field to NaN, with its row",
      (key, value) => {
        expect(use_fans_heatwaves({ ...base, [key]: value })).toEqual({
          ...masked,
          warnings: [row(key, value)],
        });
      },
    );

    test("round_output false keeps the mask", () => {
      expect(
        use_fans_heatwaves({ ...base, tdb: 60, round_output: false }),
      ).toEqual({ ...masked, warnings: [row("tdb", 60)] });
    });

    // Upstream warns that rh "will be set to NaN", but leaves it out of the
    // mask (use_fans_heatwaves.py:183-185).
    test.each([
      [
        110,
        {
          e_skin: 12.2,
          e_rsw: 11.7,
          e_max: 18.7,
          q_sensible: 17.9,
          q_skin: 30.0,
          q_res: -0.4,
          t_core: 38.0,
          t_skin: 37.7,
          m_bl: 80.0,
          m_rsw: 17.3,
          w: 0.6,
          w_max: 0.6,
          heat_strain: true,
          heat_strain_blood_flow: true,
          heat_strain_w: true,
          heat_strain_sweating: false,
        },
      ],
      [
        -5,
        {
          e_skin: 61.6,
          e_rsw: 43.3,
          e_max: 349.3,
          q_sensible: 0.7,
          q_skin: 62.3,
          q_res: 7.4,
          t_core: 37.0,
          t_skin: 35.1,
          m_bl: 24.4,
          m_rsw: 63.6,
          w: 0.2,
          w_max: 0.6,
          heat_strain: false,
          heat_strain_blood_flow: false,
          heat_strain_w: false,
          heat_strain_sweating: false,
        },
      ],
    ])("rh %p adds its row and masks nothing", (rh, expected) => {
      expect(use_fans_heatwaves({ ...base, rh })).toEqual({
        ...expected,
        warnings: [row("rh", rh)],
      });
    });

    test("rows come in upstream's order: tdb, tr, v, rh, met, clo", () => {
      expect(
        use_fans_heatwaves({ ...base, tdb: 60, rh: 110, clo: 1.5 }),
      ).toEqual({
        ...masked,
        warnings: [row("tdb", 60), row("rh", 110), row("clo", 1.5)],
      });
    });
  });

  // Upstream rounds the boolean flags with np.around, which raises
  // when limit_inputs has not cast them to floats (use_fans_heatwaves.py:195,
  // :197-198). ADR 0012: throw where upstream raises.
  describe("limit_inputs false", () => {
    test("with round_output true throws upstream's TypeError", () => {
      expect(() =>
        use_fans_heatwaves({ ...base, tdb: 60, limit_inputs: false }),
      ).toThrow(
        new TypeError(
          "Cannot cast ufunc 'multiply' output from dtype('float64') to dtype('bool') with casting rule 'same_kind'",
        ),
      );
      expect(() =>
        use_fans_heatwaves({ ...base, limit_inputs: false }),
      ).toThrow(TypeError);
    });

    test("with round_output false computes out of range, and the row stays", () => {
      expect(
        use_fans_heatwaves({
          ...base,
          tdb: 60,
          limit_inputs: false,
          round_output: false,
        }),
      ).toEqual(
        near({
          e_skin: 0.0,
          e_rsw: 0.0,
          e_max: -122.95444814336302,
          q_sensible: -66.88891197748265,
          q_skin: -66.88891197748265,
          q_res: -4.935428080273206,
          t_core: 40.62063403826196,
          t_skin: 41.2265203367958,
          m_bl: 80.0,
          m_rsw: 0.0,
          w: 0.59,
          w_max: 0.59,
          heat_strain: true,
          heat_strain_blood_flow: true,
          heat_strain_w: true,
          heat_strain_sweating: false,
          warnings: [row("tdb", 60)],
        }),
      );
    });

    test("with round_output false in range equals limit_inputs true", () => {
      expect(
        use_fans_heatwaves({
          ...base,
          limit_inputs: false,
          round_output: false,
        }),
      ).toEqual(near({ ...base_unrounded, warnings: [] }));
    });
  });

  // ADR 0007: validated in any case, compared exactly, so only the exact
  // "sitting" computes as sitting.
  describe("position", () => {
    test("sitting differs from standing", () => {
      expect(
        use_fans_heatwaves({
          ...base,
          position: "sitting",
          round_output: false,
        }),
      ).toEqual(
        near({
          e_skin: 63.05563657736457,
          e_rsw: 56.02620084210418,
          e_max: 173.18346309644397,
          q_sensible: 2.793268921192654,
          q_skin: 65.84890549855722,
          q_res: 3.6799093185532494,
          t_core: 37.00666990453406,
          t_skin: 35.41652973910737,
          m_bl: 31.100388544087185,
          m_rsw: 82.39147182662379,
          w: 0.3640973303683711,
          w_max: 0.59,
          heat_strain: false,
          heat_strain_blood_flow: false,
          heat_strain_w: false,
          heat_strain_sweating: false,
          warnings: [],
        }),
      );
    });

    test.each([
      "standing",
      "Standing",
      "Sitting",
      "SITTING",
      "standing, forced convection",
      null,
    ])("%p computes as standing", (position) => {
      const params = {
        ...base,
        position,
        round_output: false,
      } as unknown as UseFansHeatwavesParams;
      expect(use_fans_heatwaves(params)).toEqual(
        near({
          ...base_unrounded,
          warnings: [],
        }),
      );
    });

    // Upstream's ValueError is an Error here (ADR 0012).
    test("lying throws upstream's Error", () => {
      const params = {
        ...base,
        position: "lying",
      } as unknown as UseFansHeatwavesParams;
      expect(() => use_fans_heatwaves(params)).toThrow(
        "position must be one of ['sitting', 'standing', 'standing, forced convection']",
      );
    });
  });

  test("wme, body_surface_area and p_atm reach two_nodes_gagge", () => {
    expect(
      use_fans_heatwaves({
        ...base,
        wme: 0.1,
        body_surface_area: 2.0,
        p_atm: 90000,
      }),
    ).toEqual({
      e_skin: 58.0,
      e_rsw: 49.6,
      e_max: 188.4,
      q_sensible: 2.2,
      q_skin: 60.1,
      q_res: 3.7,
      t_core: 37.0,
      t_skin: 35.3,
      m_bl: 26.9,
      m_rsw: 73.0,
      w: 0.3,
      w_max: 0.6,
      heat_strain: false,
      heat_strain_blood_flow: false,
      heat_strain_w: false,
      heat_strain_sweating: false,
      warnings: [],
    });
  });

  // Upstream does not give round_output to UseFansHeatwavesInputs
  // (use_fans_heatwaves.py:95-108), so it is read for its truth value and not
  // validated.
  describe("round_output, read for its truth value as upstream", () => {
    test.each([
      { label: '"yes"', value: "yes" },
      { label: "1", value: 1 },
    ])("rounds for $label", ({ value }) => {
      const params = {
        ...base,
        round_output: value,
      } as unknown as UseFansHeatwavesParams;
      expect(use_fans_heatwaves(params)).toEqual({
        ...base_rounded,
        warnings: [],
      });
    });

    test.each([
      { label: "0", value: 0 },
      { label: "null", value: null },
    ])("does not round for $label", ({ value }) => {
      const params = {
        ...base,
        round_output: value,
      } as unknown as UseFansHeatwavesParams;
      expect(use_fans_heatwaves(params)).toEqual(
        near({
          ...base_unrounded,
          warnings: [],
        }),
      );
    });
  });

  test("writes nothing to the console", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    try {
      use_fans_heatwaves({ ...base, tdb: 60 });
      use_fans_heatwaves({ ...base, rh: 110 });
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  describe("errors", () => {
    // Upstream raises a TypeError: "limit_inputs must be a boolean (True or
    // False)." (classes_input.py:123-129).
    test.each([null, "yes", 1])(
      "limit_inputs %p throws a TypeError",
      (value) => {
        const params = {
          ...base,
          limit_inputs: value,
        } as unknown as UseFansHeatwavesParams;
        expect(() => use_fans_heatwaves(params)).toThrow(TypeError);
      },
    );

    test.each(["max_sweating", "max_skin_blood_flow", "wme"])(
      "a string %s throws a TypeError",
      (key) => {
        const params = {
          ...base,
          [key]: "x",
        } as unknown as UseFansHeatwavesParams;
        expect(() => use_fans_heatwaves(params)).toThrow(TypeError);
      },
    );

    // ADR 0008: upstream raises a TypeError for an unexpected keyword. units
    // was removed upstream in 64be52a and here in v2 (ADR 0001 as amended).
    test("the key 'units' throws a TypeError naming it", () => {
      const params = {
        ...base,
        units: "IP",
      } as unknown as UseFansHeatwavesParams;
      expect(() => use_fans_heatwaves(params)).toThrow(
        new TypeError("use_fans_heatwaves got an unexpected key: 'units'"),
      );
    });

    // ADR 0002: a positional call fails instead of running as defaults.
    test("a positional call throws a TypeError", () => {
      const call = use_fans_heatwaves as unknown as (
        ...args: unknown[]
      ) => unknown;
      expect(() => call(35, 35, 1.0, 50, 1.2, 0.5)).toThrow(TypeError);
    });

    const quantities = ["tdb", "tr", "v", "rh", "met", "clo"];

    test.each(quantities)("a string %s throws a TypeError", (key) => {
      const params = {
        ...base,
        [key]: "40",
      } as unknown as UseFansHeatwavesParams;
      expect(() => use_fans_heatwaves(params)).toThrow(TypeError);
    });

    // ADR 0001: a public model throws a TypeError for a non-finite number.
    // Upstream raises StopIteration for these, except for a NaN or -inf v,
    // which it masks to NaN.
    test.each(
      quantities.flatMap((key) =>
        [NaN, Infinity, -Infinity].map((value) => [key, value] as const),
      ),
    )("%s %p throws a TypeError", (key, value) => {
      const params = {
        ...base,
        [key]: value,
      } as unknown as UseFansHeatwavesParams;
      expect(() => use_fans_heatwaves(params)).toThrow(TypeError);
    });

    // ADR 0005 as amended: upstream reads True and False as 1 and 0.
    test.each(quantities)("a boolean %s throws a TypeError", (key) => {
      const params = {
        ...base,
        [key]: true,
      } as unknown as UseFansHeatwavesParams;
      expect(() => use_fans_heatwaves(params)).toThrow(TypeError);
    });

    // ADR 0005: quantities are numbers; upstream broadcasts the list.
    test("an array throws a TypeError", () => {
      const params = {
        ...base,
        tdb: [41, 60],
      } as unknown as UseFansHeatwavesParams;
      expect(() => use_fans_heatwaves(params)).toThrow(TypeError);
    });
  });
});
