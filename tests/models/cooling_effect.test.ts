import { afterEach, describe, expect, jest, test } from "@jest/globals";
import { cooling_effect } from "../../src/models/index.js";
import type { CoolingEffectParams } from "../../src/models/cooling_effect.ts";
import { testDataUrls } from "./comftest.ts";
import { loadTestData, validateResult } from "./testUtils.ts";

let { testData, tolerances } = await loadTestData(testDataUrls.coolingEffect);

// Mirrors pythermalcomfort v4.6.2 tests/test_cooling_effect.py.
describe("test_cooling_effect", () => {
  test("test_cooling_effect_regression_values", () => {
    const cases: [number, number, number, number, number, number, number][] = [
      [25, 25, 0.05, 50, 1.2, 0.5, 0.0], // vr <= 0.1 -> 0
      [25, 25, 0.1, 50, 1.2, 0.5, 0.0], // boundary
      [25, 25, 0.3, 50, 1.2, 0.5, 1.68],
      [35, 35, 1.5, 90, 2.5, 0.2, 5.14],
      [15, 15, 0.5, 10, 1.0, 1.2, 2.61],
    ];
    for (const [tdb, tr, vr, rh, met, clo, expected] of cases) {
      const { ce } = cooling_effect({ tdb, tr, vr, rh, met, clo });
      expect(Math.abs(ce - expected)).toBeLessThanOrEqual(0.01);
    }
  });

  test.each(testData.data)("test_cooling_effect: fixture case %#", (row) => {
    const { inputs, outputs } = row;
    // The row goes in unchanged, as upstream's cooling_effect(**inputs); a
    // row without units runs on the "SI" default.
    const result = cooling_effect(inputs as unknown as CoolingEffectParams);

    validateResult(result, outputs, tolerances, inputs);
  });
});

describe("cooling_effect (JS-only)", () => {
  const still = { tdb: 25, tr: 25, vr: 0.3, rh: 50, met: 1.2, clo: 0.5 };
  // At 45 °C and 90 % RH the still-air SET root is not bracketed; upstream
  // 4.6.2 returns 0 and warns.
  const unbracketed = { tdb: 45, tr: 45, vr: 0.5, rh: 90, met: 1.2, clo: 0.5 };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Records console.warn calls without printing them; afterEach restores it.
  const silenceConsoleWarn = () =>
    jest.spyOn(console, "warn").mockImplementation(() => {});

  // Expected value from pythermalcomfort 4.6.2, cooling_effect(..., wme=0.1).
  test("wme reaches the SET calculation", () => {
    expect(cooling_effect({ ...still, wme: 0.1 }).ce).toBe(1.47);
  });

  // Expected values from pythermalcomfort 4.6.2. On these inputs the
  // hand-written Brent that v2 had before returned 7.14, 6.83, 1.3 and 12.54:
  // it reached another root of SET(still air) - SET(vr) than scipy's brentq.
  test.each([
    [
      {
        tdb: 23.310609482487934,
        tr: 19.073713056862758,
        vr: 1.5315371207800863,
        rh: 59.43669613886923,
        met: 2.4782527208511347,
        clo: 1.4557849826535576,
      },
      5.98,
    ],
    [
      {
        tdb: 29.764193943955412,
        tr: 37.507804582253726,
        vr: 0.4370804433771812,
        rh: 20.711678391940836,
        met: 3.3688160013863997,
        clo: 0.5062650825939594,
      },
      6.88,
    ],
    [
      { tdb: 26.56, tr: 28.56, vr: 0.128, rh: 37.7, met: 2.79, clo: 0.59 },
      0.02,
    ],
    [
      {
        tdb: 78.6646357322912,
        tr: 90.16431035454401,
        vr: 2.208904841141366,
        rh: 37.23799757318771,
        met: 2.4680849254686654,
        clo: 1.4901795093466434,
        wme: 0.33402707731742964,
        units: "IP",
      },
      11.44,
    ],
  ] as [CoolingEffectParams, number][])(
    "finds the root upstream's brentq finds, case %#",
    (params, expected) => {
      expect(cooling_effect(params).ce).toBe(expected);
    },
  );

  describe("solver fallback", () => {
    test("an unbracketed root returns 0 with upstream's warning", () => {
      const warn = silenceConsoleWarn();
      expect(cooling_effect(unbracketed).ce).toBe(0);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith(
        "Cooling effect could not be calculated. Returning 0.",
      );
    });

    test("suppress_warnings silences the warning, not the fallback", () => {
      const warn = silenceConsoleWarn();
      expect(
        cooling_effect({ ...unbracketed, suppress_warnings: true }).ce,
      ).toBe(0);
      expect(warn).not.toHaveBeenCalled();
    });

    // Upstream returns before solving when vr <= 0.1, so it does not warn.
    test("still air returns 0 without a warning", () => {
      const warn = silenceConsoleWarn();
      expect(cooling_effect({ ...still, vr: 0.1 }).ce).toBe(0);
      expect(warn).not.toHaveBeenCalled();
    });
  });

  describe("input validation", () => {
    const quantities = ["tdb", "tr", "vr", "rh", "met", "clo"] as const;

    // A numeric string is not coerced, unlike in arithmetic.
    test.each([...quantities, "wme"] as const)(
      "throws TypeError if %s is not a number",
      (key) => {
        // Cast: deliberately passing a string to test the runtime TypeError.
        const params = {
          ...still,
          [key]: "25",
        } as unknown as CoolingEffectParams;
        expect(() => cooling_effect(params)).toThrow(TypeError);
      },
    );

    // A missing quantity is a TypeError, as a missing keyword argument is in
    // Python.
    test.each(quantities)("throws TypeError if %s is missing", (key) => {
      const params: Partial<CoolingEffectParams> = { ...still };
      delete params[key];
      // @ts-expect-error deliberately omitting a quantity to test the runtime TypeError
      expect(() => cooling_effect(params)).toThrow(TypeError);
    });

    // ADR 0001: a non-finite number throws rather than propagating as NaN.
    test.each([...quantities, "wme"] as const)(
      "throws TypeError if %s is not finite",
      (key) => {
        for (const bad of [NaN, Infinity, -Infinity]) {
          expect(() => cooling_effect({ ...still, [key]: bad })).toThrow(
            TypeError,
          );
        }
      },
    );

    // Every argument was positional before v2 (ADR 0002). A call still
    // written that way throws rather than running on anything else.
    test("throws TypeError if called positionally", () => {
      // @ts-expect-error the model takes one params object
      expect(() => cooling_effect(25, 25, 0.3, 50, 1.2, 0.5)).toThrow(
        TypeError,
      );
      // @ts-expect-error null is not a params object
      expect(() => cooling_effect(null)).toThrow(TypeError);
      // @ts-expect-error the params object is required
      expect(() => cooling_effect()).toThrow(TypeError);
    });

    // ADR 0008: an unknown key throws, as an unexpected keyword argument does
    // in Python.
    test("throws TypeError naming an unknown key", () => {
      // Cast: deliberately passing a misspelt key to test the TypeError.
      const params = { ...still, unit: "IP" } as unknown as CoolingEffectParams;
      expect(() => cooling_effect(params)).toThrow(TypeError);
      expect(() => cooling_effect(params)).toThrow("unexpected key: 'unit'");
    });

    // Upstream upper-cases str(units) before its SI/IP check, so a non-string
    // fails that check with a ValueError (ADR 0012: Error).
    test("throws Error if units is not a string", () => {
      // Cast: deliberately passing a number to test the runtime Error.
      const params = { ...still, units: 5 } as unknown as CoolingEffectParams;
      expect(() => cooling_effect(params)).toThrow('"units" must be one of');
    });

    test("throws Error if units is not a valid enum", () => {
      expect(() =>
        cooling_effect({
          ...still,
          // @ts-expect-error units is "SI" or "IP"; the runtime check is under test
          units: "INVALID",
        }),
      ).toThrow(Error);
    });

    test("throws TypeError if suppress_warnings is not a boolean", () => {
      expect(() =>
        cooling_effect({
          ...still,
          // @ts-expect-error suppress_warnings is a boolean; the runtime check is under test
          suppress_warnings: "true",
        }),
      ).toThrow(TypeError);
    });

    test("a switch passed as undefined takes its default", () => {
      expect(
        cooling_effect({
          ...still,
          wme: undefined,
          units: undefined,
          suppress_warnings: undefined,
        }).ce,
      ).toBe(cooling_effect(still).ce);
    });
  });
});
