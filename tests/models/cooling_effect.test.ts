import { afterEach, describe, expect, vi, test } from "vitest";
import { cooling_effect } from "../../src/models/index.ts";
import { testDataUrls } from "./comftest.ts";
import { approx, loadTestData, validateResult } from "./testUtils.ts";

type Inputs = Parameters<typeof cooling_effect>[0];

const { testData: reference_table, tolerances: tolerance } = await loadTestData(
  testDataUrls.coolingEffect,
);

// Mirrors pythermalcomfort v4.7.0 tests/test_cooling_effect.py.
describe("test_cooling_effect", () => {
  test.each([0.05, 0.3, 1.0])(
    "test_cooling_effect_ip_is_a_temperature_difference[%s]",
    (vr) => {
      const si = cooling_effect({
        tdb: 30,
        tr: 30,
        vr,
        rh: 50,
        met: 1.2,
        clo: 0.5,
      }).ce;
      const ip = cooling_effect({
        tdb: 86,
        tr: 86,
        vr: vr * 3.281,
        rh: 50,
        met: 1.2,
        clo: 0.5,
        units: "IP",
      }).ce;

      // Both public results are rounded to two decimals independently.
      expect(approx(ip, si * 1.8, { rel: 0, abs: 0.014 })).toBe(true);
    },
  );

  test("test_cooling_effect_ip_array_temperature_differences", () => {
    const tdb = [25.0, 30.0, 35.0];
    const si = tdb.map(
      (t) =>
        cooling_effect({ tdb: t, tr: t, vr: 1.0, rh: 50, met: 1.2, clo: 0.5 })
          .ce,
    );
    const ip = tdb.map(
      (t) =>
        cooling_effect({
          tdb: t * 1.8 + 32,
          tr: t * 1.8 + 32,
          vr: 3.281,
          rh: 50,
          met: 1.2,
          clo: 0.5,
          units: "IP",
        }).ce,
    );

    ip.forEach((value, i) => {
      expect(approx(value, (si[i] ?? NaN) * 1.8, { rel: 0, abs: 0.014 })).toBe(
        true,
      );
    });
  });

  test.each([
    [25, 25, 0.05, 50, 1.2, 0.5, 0.0], // vr <= 0.1 -> 0
    [25, 25, 0.1, 50, 1.2, 0.5, 0.0], // boundary
    [25, 25, 0.3, 50, 1.2, 0.5, 1.68],
    [35, 35, 1.5, 90, 2.5, 0.2, 5.11], // 5.14 before #489
    [15, 15, 0.5, 10, 1.0, 1.2, 2.61],
  ])(
    "test_cooling_effect_regression_values[%s, %s, %s, %s, %s, %s]",
    (tdb, tr, vr, rh, met, clo, expected) => {
      const { ce } = cooling_effect({ tdb, tr, vr, rh, met, clo });
      expect(approx(ce, expected, { rel: 1e-5, abs: 0.01 })).toBe(true);
    },
  );

  test.each(reference_table.data)(
    "test_cooling_effect: fixture case %#",
    (entry) => {
      const { inputs, outputs } = entry;
      const result = cooling_effect(inputs as unknown as Inputs);

      validateResult(result, outputs, tolerance, inputs);
    },
  );
});

describe("cooling_effect (JS-only)", () => {
  const still = { tdb: 25, tr: 25, vr: 0.3, rh: 50, met: 1.2, clo: 0.5 };
  // At 45 °C and 90 % RH the still-air SET root is not bracketed; upstream
  // 4.7.0 returns 0 and warns.
  const unbracketed = { tdb: 45, tr: 45, vr: 0.5, rh: 90, met: 1.2, clo: 0.5 };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Records console.warn calls without printing them; afterEach restores it.
  const silenceConsoleWarn = () =>
    vi.spyOn(console, "warn").mockImplementation(() => {});

  // Expected value from pythermalcomfort 4.7.0, cooling_effect(..., wme=0.1).
  test("wme reaches the SET calculation", () => {
    expect(cooling_effect({ ...still, wme: 0.1 }).ce).toBe(1.47);
  });

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
        } as unknown as Inputs;
        expect(() => cooling_effect(params)).toThrow(TypeError);
      },
    );

    // A missing quantity is a TypeError, as a missing keyword argument is in
    // Python.
    test.each(quantities)("throws TypeError if %s is missing", (key) => {
      const params: Partial<Inputs> = { ...still };
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
        // @ts-expect-error the Params type lacks ADR 0019's `?: T | undefined`; the runtime default is under test
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
