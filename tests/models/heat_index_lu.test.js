import { describe, expect, test } from "@jest/globals";
import { heat_index_lu } from "../../src/models/heat_index_lu.js";
import { heat_index_lu as heat_index_lu_from_models } from "../../src/models/index.js";
import jsthermalcomfort, {
  heat_index_lu as exported_heat_index_lu,
} from "../../src/index.js";

describe("heat_index_lu", () => {
  test("test_extended_heat_index", () => {
    const hi_test_values = [
      199.9994020652, 199.9997010342, 200.0000000021, 209.9975943902,
      209.9987971085, 209.9999998068, 219.9915822029, 219.9957912306,
      219.9999999912, 229.9739691979, 229.9869861009, 230.000000185,
      239.9253828022, 239.9626700074, 240.0000000003, 249.7676757244,
      249.8837049107, 250.0000000037, 259.3735990024, 259.6864068902,
      259.9999999944, 268.5453870455, 269.2745889562, 270.0000002224,
      277.2234200026, 278.6369451963, 280.0000000091, 285.751054537,
      288.28136601, 290.7860610129, 297.5737503539, 300.2922595865,
      305.394712759, 305.5549530893, 318.6225524695, 359.9063248191,
      313.0298872791, 359.0538750602, 407.5345212438, 320.5088548469,
      398.5759733823, 464.994935294, 328.0358006469, 445.8599463105,
      530.5524786708, 333.2806160592, 500.0421800191, 601.9518435268,
      343.6312984164, 559.6640227151, 677.2462089759, 354.1825692377,
      623.1960299857, 755.0832658147,
    ];
    let index = 0;
    for (let t = 200; t < 380; t += 10) {
      for (const rh of [0, 0.5, 1]) {
        const hi = heat_index_lu(t - 273.15, rh * 100).hi;
        expect(
          Math.abs(hi + 273.15 - hi_test_values[index]),
        ).toBeLessThanOrEqual(1);
        index += 1;
      }
    }
    expect(index).toBe(hi_test_values.length);
  });

  test("test_extended_heat_index_array_input", () => {
    // The Python array test is mirrored using Array.map because the JavaScript
    // model API remains scalar-only.
    const hi = [20, 40].map((tdb) => heat_index_lu(tdb, 50).hi);
    const expected = [19.0, 63.4];
    expect(hi).toHaveLength(expected.length);
    hi.forEach((value, i) => {
      expect(Math.abs(value - expected[i])).toBeLessThanOrEqual(0.1);
    });
  });

  test("test_heat_index_lu_regression_values", () => {
    const cases = [
      [-273.15, 50, -273.15],
      [-40, 0, -40.03628046540541],
      [-40, 100, -39.999999998230464],
      [0, 0, -1.835038354014955],
      [0, 100, -1.722924025671091e-9],
      [25, 50, 24.979891812568553],
      [50, 0, 42.232631716202036],
      [50, 100, 151.4841566476622],
      [100, 50, 370.6571594081703],
    ];
    for (const [tdb, rh, expected] of cases) {
      const hi = heat_index_lu(tdb, rh, false).hi;
      expect(Math.abs(hi - expected)).toBeLessThanOrEqual(1e-6);
    }
  });
});

describe("heat_index_lu rounding, validation and exports", () => {
  test("rounds to one decimal place by default", () => {
    expect(heat_index_lu(25, 50)).toEqual({ hi: 25.0, stress_category: null });
  });

  test("returns the unrounded value when round_output is false", () => {
    expect(heat_index_lu(25, 50, false)).toEqual({
      hi: 24.979891812568553,
      stress_category: null,
    });
  });

  test.each([
    ["a string", "25"],
    ["a null", null],
    ["a NaN", NaN],
    ["an array", [25]],
  ])("rejects %s tdb", (_, value) => {
    expect(() => heat_index_lu(value, 50)).toThrow(TypeError);
  });

  test.each([
    ["a string", "50"],
    ["a null", null],
    ["a NaN", NaN],
    ["an array", [50]],
  ])("rejects %s rh", (_, value) => {
    expect(() => heat_index_lu(25, value)).toThrow(TypeError);
  });

  test("rejects a non-boolean round_output", () => {
    expect(() => heat_index_lu(25, 50, "yes")).toThrow(TypeError);
  });

  test("throws when the root solver cannot find a solution", () => {
    // pythermalcomfort raises ValueError with the same message for tdb = 200 °C.
    expect(() => heat_index_lu(200, 50)).toThrow(
      "wrong initial interval in the root solver",
    );
  });

  test("is exported from models/index.js", () => {
    expect(heat_index_lu_from_models).toBe(heat_index_lu);
  });

  test("is available through named and default package exports", () => {
    expect(exported_heat_index_lu).toBe(heat_index_lu);
    expect(jsthermalcomfort.models.heat_index_lu).toBe(heat_index_lu);
  });
});
