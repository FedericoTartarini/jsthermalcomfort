import { describe, expect, test } from "vitest";
import { units_converter, Units } from "../../src/utilities/index.ts";
import { units_converter as units_converter_from_root } from "../../src/index.ts";

/** numpy's `allclose(actual, expected, atol=atol)`, with its default rtol. */
function allclose(
  actual: Readonly<Record<string, number>>,
  expected: readonly (readonly [string, number])[],
  atol: number,
): boolean {
  const entries = Object.entries(actual);
  return (
    entries.length === expected.length &&
    expected.every(([key, b], i) => {
      const [actual_key, a] = entries[i] ?? [];
      return (
        actual_key === key &&
        a !== undefined &&
        Math.abs(a - b) <= atol + 1e-5 * Math.abs(b)
      );
    })
  );
}

// Mirrors the units_converter cases of pythermalcomfort v4.8.0
// tests/test_utilities.py. Upstream returns a list in the keyword arguments'
// order; the library returns an object with the same keys in the same order
// (ADR 0019, whitelist item 9), so a list comparison compares the entries.
describe("test_utilities", () => {
  test("test_ip_units_converter", () => {
    expect(
      Object.entries(units_converter(Units.IP, { tdb: 77, tr: 77, v: 3.2 })),
    ).toEqual([
      ["tdb", 25.0],
      ["tr", 25.0],
      ["v", 0.975312404754648],
    ]);
    expect(
      Object.entries(
        units_converter(Units.IP, { pressure: 1, area: 1 / 0.09 }),
      ),
    ).toEqual([
      ["pressure", 101325],
      ["area", 1.0322474090590033],
    ]);

    const expected_result = [
      ["tdb", 25.0],
      ["v", 3.047],
    ] as const;
    expect(
      allclose(
        units_converter(Units.IP, { tdb: 77, v: 10 }),
        expected_result,
        0.01,
      ),
    ).toBe(true);

    // Test case 2: Conversion from SI to IP for temperature and velocity
    expect(
      allclose(
        units_converter(Units.SI, { tdb: 20, v: 2 }),
        [
          ["tdb", 68],
          ["v", 6.562],
        ],
        0.01,
      ),
    ).toBe(true);

    // Test case 3: Conversion from IP to SI for area and pressure
    expect(
      allclose(
        units_converter(Units.IP, { area: 100, pressure: 14.7 }),
        [
          ["area", 9.29],
          ["pressure", 1489477.5],
        ],
        0.01,
      ),
    ).toBe(true);

    // Test case 4: Conversion from SI to IP for area and pressure
    expect(
      allclose(
        units_converter(Units.SI, { area: 50, pressure: 101325 }),
        [
          ["area", 538.199],
          ["pressure", 1],
        ],
        0.01,
      ),
    ).toBe(true);
  });
});

// What upstream's tests leave out, measured on pythermalcomfort 4.6.2, and
// what only the library adds (ADR 0022).
describe("units_converter (JS-only)", () => {
  // A call with arguments the type rejects, to test the runtime.
  const call =
    (...args: unknown[]) =>
    () =>
      (units_converter as (...a: unknown[]) => unknown)(...args);

  describe("as upstream", () => {
    // units_converter() and units_converter("IP") return [].
    test("converts nothing when given no values", () => {
      expect(units_converter()).toEqual({});
      expect(units_converter("IP")).toEqual({});
    });

    test("defaults to IP, and an explicit undefined takes the default", () => {
      expect(units_converter(undefined, { tdb: 77 })).toEqual({ tdb: 25 });
    });

    // from_units.upper() (utilities.py:133).
    test("reads from_units in any case", () => {
      expect(call("ip", { tmp: 50 })()).toEqual({ tmp: 10 });
      expect(call("sI", { tmp: 10 })()).toEqual({ tmp: 50 });
    });

    // units_converter("XX", tmp=50) returns [].
    test("converts nothing for another system", () => {
      expect(call("XX", { tmp: 50 })()).toEqual({});
    });

    // A key no branch matches is not appended (utilities.py:135-143), and its
    // value is never read.
    test("leaves out a key it does not convert, whatever its value", () => {
      expect(units_converter("IP", { foo: 1, tdb: 50 })).toEqual({ tdb: 10 });
      expect(call("IP", { foo: "x", tdb: 50 })()).toEqual({ tdb: 10 });
    });

    test("converts every key with tmp in its name as a temperature", () => {
      expect(
        units_converter("IP", { tmp_x: 50, t_running_mean: 50, tdb: 50 }),
      ).toEqual({ tmp_x: 10, tdb: 10 });
    });

    // An undefined value is an omitted keyword (ADR 0019, whitelist item 6).
    test("leaves out a key whose value is undefined", () => {
      expect(call("SI", { tdb: 20, v: undefined })()).toEqual({ tdb: 68 });
    });

    // As upstream, and as Math does (ADR 0022).
    test("propagates NaN and ±Infinity", () => {
      expect(units_converter("IP", { tdb: NaN }).tdb).toBeNaN();
      expect(units_converter("SI", { v: Infinity }).v).toBe(Infinity);
    });
  });

  // Python raises TypeError for a call that does not bind (ADR 0019,
  // whitelist item 14).
  test("ignores a surplus argument, as a JavaScript function does", () => {
    expect(call("IP", { tdb: 77 }, 1)()).toEqual({ tdb: 25 });
  });

  // Python raises with its interpreter's text, or reads a boolean as 1 or 0
  // (deviation _shared-23).
  describe("types", () => {
    test("from_units that is not a string throws TypeError", () => {
      for (const bad of [null, 5, true, ["IP"]])
        expect(call(bad, { tdb: 77 })).toThrow(
          new TypeError("from_units must be a string."),
        );
    });

    test("values that are not an object throw TypeError", () => {
      for (const bad of [null, 5, "tdb", [77]])
        expect(call("IP", bad)).toThrow(
          new TypeError("values must be an object."),
        );
    });

    test("a value it converts that is not a number throws TypeError", () => {
      for (const bad of ["77", true, null, [77]])
        expect(call("SI", { tdb: 20, v: bad })).toThrow(
          new TypeError("v must be a number."),
        );
    });
  });

  test("is exported from the package root as from its subpath", () => {
    expect(units_converter_from_root).toBe(units_converter);
  });
});
