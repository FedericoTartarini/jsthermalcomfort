import { describe, expect, jest, test } from "@jest/globals";
import { wci } from "../../src/models/index.js";
import type { WciParams } from "../../src/models/wci.ts";
import { testDataUrls } from "./comftest.ts";
import {
  assertNonEmptyRows,
  loadTestData,
  validateResult,
} from "./testUtils.ts";

const { testData, tolerances } = await loadTestData(testDataUrls.wci);

// Every row of the fixture is scalar (no list inputs), so each runs as it is.
const rows = assertNonEmptyRows(testData.data, "wci fixture rows");

// Mirrors pythermalcomfort v4.6.2 tests/test_wind_chill_index.py.
describe("test_wind_chill_index", () => {
  test.each(rows)("test_calculates_wci: fixture case %#", (row) => {
    const result = wci(row.inputs as unknown as WciParams);
    validateResult(result, row.outputs, tolerances, row.inputs);
  });

  describe("TestWc", () => {
    test("test_raises_type_error_tdb_not_provided", () => {
      const params = { v: 0.1 } as unknown as WciParams;
      expect(() => wci(params)).toThrow(TypeError);
    });

    test("test_raises_type_error_v_not_provided", () => {
      const params = { tdb: 0 } as unknown as WciParams;
      expect(() => wci(params)).toThrow(TypeError);
    });

    test("test_raises_type_error_tdb_not_float", () => {
      const params = { tdb: "0", v: 0.1 } as unknown as WciParams;
      expect(() => wci(params)).toThrow(TypeError);
    });
  });
});

// Upstream has no test for these. Every expected value is what
// pythermalcomfort 4.6.2 returns for the same call.
describe("wci beyond upstream's tests", () => {
  // Upstream bounds nothing (wci.py:59-76 at v4.6.2), so a call reports no
  // row, in range or not.
  test.each([
    [-5, 5.5, 1255.2],
    [40, 5, -226.4],
    [-40, 25, 3009.7],
  ])("tdb %p, v %p gives %p and no warnings rows", (tdb, v, expected) => {
    expect(wci({ tdb, v })).toEqual({ wci: expected, warnings: [] });
  });

  // The docstring examples (wci.py:51-55); its list call runs one scalar call
  // per element (ADR 0005).
  test.each([
    [-5, 5.5, 1255.2],
    [-10, 10, 1603.9],
  ])("the docstring example tdb %p, v %p gives %p", (tdb, v, expected) => {
    expect(wci({ tdb, v, round_output: true }).wci).toBe(expected);
  });

  test("round_output false returns the unrounded value", () => {
    expect(wci({ tdb: 0, v: 0.1, round_output: false })).toEqual({
      wci: 518.5877043196023,
      warnings: [],
    });
  });

  test("round_output undefined keeps the default, true", () => {
    expect(wci({ tdb: 0, v: 0.1, round_output: undefined }).wci).toBe(518.6);
  });

  // np.around sends a tie to the even neighbour: the unrounded value is
  // -99.75 and upstream returns -99.8.
  test("a halfway value rounds half to even, as np.around", () => {
    const params = { tdb: 41.20761353865395, v: 0 };
    expect(wci({ ...params, round_output: false }).wci).toBe(-99.75);
    expect(wci(params).wci).toBe(-99.8);
  });

  test("tdb 33 gives 0, and -0 where the wind term is negative, as upstream", () => {
    expect(Object.is(wci({ tdb: 33, v: 1 }).wci, 0)).toBe(true);
    expect(Object.is(wci({ tdb: 33, v: 200 }).wci, -0)).toBe(true);
    expect(
      Object.is(wci({ tdb: 33, v: 200, round_output: false }).wci, -0),
    ).toBe(true);
  });

  test("v 0 and v -0 both give 401.1", () => {
    expect(wci({ tdb: 0, v: 0 }).wci).toBe(401.1);
    expect(wci({ tdb: 0, v: -0 }).wci).toBe(401.1);
  });

  // Upstream returns nan with numpy's RuntimeWarning "invalid value
  // encountered in power", which has no counterpart here (ADR 0001 as
  // amended): nothing is written to the console.
  test("a negative v returns NaN, as upstream, and writes nothing", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect(wci({ tdb: 0, v: -1 })).toEqual({ wci: NaN, warnings: [] });
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  // Upstream returns -inf, with numpy's RuntimeWarning "overflow encountered
  // in scalar multiply".
  test("a finite tdb that overflows gives -Infinity, as upstream", () => {
    expect(wci({ tdb: 1e308, v: 0.1 }).wci).toBe(-Infinity);
  });

  describe("errors", () => {
    // Upstream raises a TypeError: "round_output must be a boolean (True or
    // False)." (classes_input.py:123-129).
    test.each([null, "x", 1])("round_output %p throws a TypeError", (value) => {
      const params = {
        tdb: 0,
        v: 0.1,
        round_output: value,
      } as unknown as WciParams;
      expect(() => wci(params)).toThrow(TypeError);
    });

    // ADR 0008: upstream raises "wci() got an unexpected keyword argument".
    // round was wc's name for round_output.
    test.each(["round", "units", "limit_inputs"])(
      "the key '%s' throws a TypeError naming it",
      (key) => {
        const params = { tdb: 0, v: 0.1, [key]: true } as unknown as WciParams;
        expect(() => wci(params)).toThrow(
          new TypeError(`wci got an unexpected key: '${key}'`),
        );
      },
    );

    // ADR 0002: a positional call fails instead of running as defaults.
    test("a positional call throws a TypeError", () => {
      const call = wci as unknown as (...args: unknown[]) => unknown;
      expect(() => call(0, 0.1)).toThrow(TypeError);
    });

    test("a string v throws a TypeError, as upstream", () => {
      const params = { tdb: 0, v: "5" } as unknown as WciParams;
      expect(() => wci(params)).toThrow(TypeError);
    });

    // Upstream raises a TypeError from the arithmetic ("unsupported operand
    // type(s)"), as validate_type skips None (classes_input.py:138-139).
    test.each(["tdb", "v"])("a null %s throws a TypeError", (key) => {
      const params = { tdb: 0, v: 0.1, [key]: null } as unknown as WciParams;
      expect(() => wci(params)).toThrow(TypeError);
    });

    // ADR 0001: a public model throws a TypeError for a non-finite number.
    // Upstream returns nan or an infinity: wci(tdb=nan, v=0.1) is nan,
    // wci(tdb=-inf, v=0.1) is inf and wci(tdb=0, v=inf) is nan.
    test.each(
      ["tdb", "v"].flatMap((key) =>
        [NaN, Infinity, -Infinity].map((value) => [key, value] as const),
      ),
    )("%s %p throws a TypeError", (key, value) => {
      const params = { tdb: 0, v: 0.1, [key]: value } as unknown as WciParams;
      expect(() => wci(params)).toThrow(TypeError);
    });

    // ADR 0005 as amended: upstream reads True and False as 1 and 0
    // (wci(tdb=True, v=0.1) is 502.9).
    test.each(["tdb", "v"])("a boolean %s throws a TypeError", (key) => {
      const params = { tdb: 0, v: 0.1, [key]: true } as unknown as WciParams;
      expect(() => wci(params)).toThrow(TypeError);
    });

    // ADR 0005: quantities are numbers; upstream broadcasts a list
    // (wci(tdb=[0], v=0.1) is [518.6], wci(tdb=[], v=0.1) is []).
    test.each([[[0]], [[]]])("an array tdb %p throws a TypeError", (tdb) => {
      const params = { tdb, v: 0.1 } as unknown as WciParams;
      expect(() => wci(params)).toThrow(TypeError);
    });
  });
});
