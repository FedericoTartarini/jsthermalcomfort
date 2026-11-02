import { describe, expect, test } from "vitest";
import { heat_index_lu } from "../../src/models/index.ts";
import { approx } from "./testUtils.ts";

// Mirrors pythermalcomfort v4.7.0 tests/test_heat_index_lu.py. Its
// np.isclose and np.allclose take the default rtol, 1e-5, beside the atol
// given, and its list call runs element-wise.
describe("test_heat_index_lu", () => {
  test("test_extended_heat_index", () => {
    let index = 0;
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
    for (let t = 200; t < 380; t += 10) {
      for (const rh of [0, 0.5, 1]) {
        const hi = heat_index_lu({ tdb: t - 273.15, rh: rh * 100 }).hi;
        expect(
          approx(hi + 273.15, hi_test_values[index] ?? NaN, {
            rel: 1e-5,
            abs: 1,
          }),
        ).toBe(true);
        index += 1;
      }
    }
  });

  test("test_extended_heat_index_array_input", () => {
    const hi = [20, 40].map((tdb) => heat_index_lu({ tdb, rh: 50 }).hi);
    [19.0, 63.4].forEach((expected, i) => {
      expect(approx(hi[i] ?? NaN, expected, { rel: 1e-5, abs: 0.1 })).toBe(
        true,
      );
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
    ] as const;
    for (const [tdb, rh, expected] of cases) {
      const hi = heat_index_lu({ tdb, rh, round_output: false }).hi;
      expect(
        approx(hi, expected, { rel: 1e-5, abs: 1e-6 }),
        `${tdb}, ${rh}`,
      ).toBe(true);
    }
  });
});
