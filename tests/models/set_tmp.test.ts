import { describe, expect, test } from "@jest/globals";
import { set_tmp } from "../../src/models/set_tmp.ts";
import type { SetTmpParams } from "../../src/models/set_tmp.ts";
import { ASHRAE_55_LIMITS } from "../../src/utilities/utilities.js";
import { testDataUrls } from "./comftest.ts";
import {
  assertNonEmptyRows,
  loadTestData,
  validateResult,
} from "./testUtils.ts";

const { testData, tolerances } = await loadTestData(testDataUrls.setTmp);

// Every row of the fixture is scalar (no list inputs), so each runs as it is.
const rows = assertNonEmptyRows(testData.data, "set_tmp fixture rows");

// Mirrors pythermalcomfort v4.6.2 tests/test_set.py.
describe("test_set", () => {
  // As upstream, the row's inputs with round_output=True and
  // limit_inputs=False.
  test.each(rows)("test_set_url: fixture case %#", ({ inputs, outputs }) => {
    const result = set_tmp({
      ...(inputs as unknown as SetTmpParams),
      round_output: true,
      limit_inputs: false,
    });
    validateResult(result, outputs, tolerances, inputs);
  });

  // Upstream passes the six cases as lists, with rh=50 shared; here one
  // scalar call per element (ADR 0005).
  test.each([
    [41, 20, 0.1, 1.1, 0.5],
    [20, 41, 0.1, 1.1, 0.5],
    [20, 20, 2.1, 1.1, 0.5],
    [20, 20, 0.1, 0.7, 0.5],
    [20, 20, 0.1, 1.1, 2.1],
    [39, 39, 0.1, 3.9, 1.9],
  ])(
    "test_set_npnan: tdb %p, tr %p, v %p, met %p, clo %p",
    (tdb, tr, v, met, clo) => {
      expect(set_tmp({ tdb, tr, v, rh: 50, met, clo }).set).toBeNaN();
    },
  );
});

// Upstream has no test for these. Every expected value is what
// pythermalcomfort 4.6.2 returns for the same call.
describe("set_tmp beyond upstream's tests", () => {
  const base = { tdb: 25, tr: 25, v: 0.1, rh: 50, met: 1.2, clo: 0.5 };

  test("the docstring example returns 24.3", () => {
    expect(set_tmp(base)).toEqual({ set: 24.3, warnings: [] });
  });

  test.each([
    [{}, 24.314907736364308],
    [{ wme: 0.5 }, 24.472077589242023],
    [{ body_surface_area: 2.0 }, 24.314768047617715],
    [{ p_atm: 90000 }, 24.31474709960865],
  ])("unrounded set with %p", (input, set) => {
    const result = set_tmp({ ...base, ...input, round_output: false });
    expect(result.set).toBeCloseTo(set, 12);
  });

  // ADR 0007: position is validated without regard to case and accepts
  // "standing, forced convection"; only the exact "sitting" computes as
  // sitting.
  describe("position", () => {
    const hot = { tdb: 32, tr: 38, v: 0.3, rh: 50, met: 1.2, clo: 0.5 };

    test.each([
      ["sitting", 32.68034075145618],
      ["standing", 32.82659255792087],
      ["Sitting", 32.82659255792087],
      ["STANDING", 32.82659255792087],
      ["standing, forced convection", 32.82659255792087],
    ])("position %p computes set %p", (position, set) => {
      const params = {
        ...hot,
        position,
        round_output: false,
      } as unknown as SetTmpParams;
      expect(set_tmp(params).set).toBeCloseTo(set, 12);
    });

    test("position null computes as standing, as upstream's None", () => {
      const params = {
        ...hot,
        position: null,
        round_output: false,
      } as unknown as SetTmpParams;
      expect(set_tmp(params).set).toBeCloseTo(32.82659255792087, 12);
    });

    test("position 'lying' throws upstream's ValueError", () => {
      const params = { ...base, position: "lying" } as unknown as SetTmpParams;
      expect(() => set_tmp(params)).toThrow(
        new Error(
          "position must be one of ['sitting', 'standing', 'standing, forced convection']",
        ),
      );
    });

    // ADR 0005 as amended: position takes one string.
    test("an array position throws a TypeError", () => {
      const params = {
        ...base,
        position: ["sitting"],
      } as unknown as SetTmpParams;
      expect(() => set_tmp(params)).toThrow(TypeError);
    });
  });

  describe("calculate_ce", () => {
    const fan = { tdb: 30, tr: 30, v: 0.8, rh: 50, met: 1.2, clo: 0.5 };

    // Upstream computes the cooling-effect SET standing whatever position
    // is, as its cooling_effect states (cooling_effect.py:20-22).
    test.each(["sitting", "standing"] as const)(
      "position %p computes as standing",
      (position) => {
        const result = set_tmp({
          ...fan,
          position,
          calculate_ce: true,
          round_output: false,
        });
        expect(result.set).toBeCloseTo(26.062581187498324, 12);
      },
    );

    test("rounds to 1 decimal under round_output", () => {
      const result = set_tmp({
        ...fan,
        position: "sitting",
        calculate_ce: true,
      });
      expect(result.set).toBe(26.1);
    });

    test("caps regulatory sweating at the kernel's 500", () => {
      const result = set_tmp({
        tdb: 45,
        tr: 45,
        v: 4,
        rh: 5,
        met: 6,
        clo: 0,
        calculate_ce: true,
        limit_inputs: false,
        round_output: false,
      });
      expect(result.set).toBeCloseTo(13.57951327222299, 11);
    });
  });

  // Upstream's SETInputs is not given round_output or calculate_ce, so both
  // are read for their truth value and not validated.
  describe("switches read for their truth value", () => {
    test.each([
      ["yes", 24.3],
      [0, 24.314907736364308],
      ["", 24.314907736364308],
    ])("round_output %p", (round_output, set) => {
      const params = { ...base, round_output } as unknown as SetTmpParams;
      expect(set_tmp(params).set).toBeCloseTo(set, 12);
    });

    test.each([
      ["yes", 24.662342565066787],
      [0, 24.314907736364308],
    ])("calculate_ce %p", (calculate_ce, set) => {
      const params = {
        ...base,
        calculate_ce,
        round_output: false,
      } as unknown as SetTmpParams;
      expect(set_tmp(params).set).toBeCloseTo(set, 12);
    });
  });

  // Each limit upstream warns about is a row (ADR 0001), built whatever
  // limit_inputs is; the gate reads the rows.
  describe("warnings rows", () => {
    const too_hot = { tdb: 41, tr: 20, v: 0.1, rh: 50, met: 1.1, clo: 0.5 };

    test("a tdb above 40 gives one row and NaN", () => {
      const result = set_tmp(too_hot);
      expect(result.set).toBeNaN();
      expect(result.warnings).toEqual([
        { key: "tdb", role: "input", value: 41, bound: ASHRAE_55_LIMITS.tdb },
      ]);
      expect(result.warnings[0].bound).toBe(ASHRAE_55_LIMITS.tdb);
    });

    test("with limit_inputs false the same row comes beside the set", () => {
      const result = set_tmp({
        ...too_hot,
        limit_inputs: false,
        round_output: false,
      });
      expect(result.set).toBeCloseTo(33.75653381690876, 12);
      expect(result.warnings).toEqual(set_tmp(too_hot).warnings);
    });

    test("rows come in upstream's order: tdb, tr, v, met, clo", () => {
      const result = set_tmp({
        tdb: 5,
        tr: 45,
        v: 3,
        rh: 50,
        met: 0.5,
        clo: 2,
      });
      expect(result.set).toBeNaN();
      expect(result.warnings.map((row) => row.key)).toEqual([
        "tdb",
        "tr",
        "v",
        "met",
        "clo",
      ]);
      expect(result.warnings.map((row) => row.bound)).toEqual([
        ASHRAE_55_LIMITS.tdb,
        ASHRAE_55_LIMITS.tr,
        ASHRAE_55_LIMITS.vr,
        ASHRAE_55_LIMITS.met,
        ASHRAE_55_LIMITS.clo,
      ]);
    });

    test.each([
      [{ tdb: 40, tr: 10, v: 2, rh: 50, met: 4, clo: 1.5 }, 43.4],
      [{ tdb: 10, tr: 40, v: 0, rh: 50, met: 1, clo: 0 }, 23.5],
    ])("the limits are inclusive: %p", (input, set) => {
      expect(set_tmp(input)).toEqual({ set, warnings: [] });
    });
  });

  describe("errors", () => {
    test("limit_inputs that is not a boolean throws upstream's TypeError", () => {
      const params = {
        ...base,
        limit_inputs: "true",
      } as unknown as SetTmpParams;
      expect(() => set_tmp(params)).toThrow(TypeError);
    });

    // ADR 0008: upstream raises a TypeError for an unexpected keyword. units
    // is removed (ADR 0001 as amended), and body_position and round are the
    // old names of position and round_output (ADR 0010).
    test.each(["units", "body_position", "round"])(
      "the key %p throws a TypeError naming it",
      (key) => {
        const params = { ...base, [key]: "x" } as unknown as SetTmpParams;
        expect(() => set_tmp(params)).toThrow(
          new TypeError(`set_tmp got an unexpected key: '${key}'`),
        );
      },
    );

    // ADR 0002: a positional call fails instead of running as defaults.
    test("a positional call throws a TypeError", () => {
      const call = set_tmp as unknown as (...args: number[]) => unknown;
      expect(() => call(25, 25, 0.1, 50, 1.2, 0.5)).toThrow(TypeError);
    });

    // ADR 0001: a public model throws a TypeError for a non-finite number.
    // Upstream raises StopIteration for each of these but v, and returns NaN
    // for a NaN v.
    test.each([
      "tdb",
      "tr",
      "v",
      "rh",
      "met",
      "clo",
      "wme",
      "body_surface_area",
      "p_atm",
    ])("a non-finite %s throws a TypeError", (key) => {
      const params = { ...base, [key]: NaN } as unknown as SetTmpParams;
      expect(() => set_tmp(params)).toThrow(TypeError);
    });

    // ADR 0005: quantities are numbers; upstream would broadcast the list.
    test("an array throws a TypeError", () => {
      const params = { ...base, tdb: [25, 30] } as unknown as SetTmpParams;
      expect(() => set_tmp(params)).toThrow(TypeError);
    });
  });
});
