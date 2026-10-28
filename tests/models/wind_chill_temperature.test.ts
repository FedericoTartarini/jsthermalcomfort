import { describe, expect, test } from "vitest";
import { wind_chill_temperature } from "../../src/models/index.ts";
import { round } from "../../src/_internal/round.ts";
import { testDataUrls } from "./comftest.ts";
import { approx, loadTestData, validateResult } from "./testUtils.ts";

type Inputs = Parameters<typeof wind_chill_temperature>[0];

const { testData: reference_table, tolerances: tolerance } = await loadTestData(
  testDataUrls.windChillTemperature,
);

// Mirrors pythermalcomfort v4.7.0 tests/test_wind_chill_temperature.py.
describe("test_wind_chill_temperature", () => {
  test.each(reference_table.data)(
    "test_wind_chill_temperature: case %#",
    (entry) => {
      const { inputs, outputs } = entry;
      const result = wind_chill_temperature(inputs as unknown as Inputs);

      validateResult(result, outputs, tolerance, inputs);
    },
  );

  describe("TestWct", () => {
    test("test_wct_single_float_inputs", () => {
      const result = wind_chill_temperature({ tdb: -5.0, v: 5.5 });

      expect(typeof result.wct).toBe("number");
      expect(round(result.wct, 1)).toBe(-7.5);
    });

    // Upstream's empty lists, element-wise.
    test("test_wct_empty_lists", () => {
      const pairs: [number, number][] = [];
      expect(
        pairs.map(([tdb, v]) => wind_chill_temperature({ tdb, v }).wct),
      ).toEqual([]);
    });

    // Upstream's lists, element-wise.
    test("test_wct_list_inputs", () => {
      const results = (
        [
          [-5.0, 5.5, -7.5],
          [-10.0, 10.0, -15.3],
        ] as const
      ).map(([tdb, v, expected]) => ({
        wct: wind_chill_temperature({ tdb, v, round_output: true }).wct,
        expected,
      }));

      expect(Array.isArray(results)).toBe(true);
      for (const { wct, expected } of results) {
        expect(approx(wct, expected, { rel: 1e-5, abs: 0.1 })).toBe(true);
      }
    });

    test("test_wct_round_output_false_returns_unrounded", () => {
      const result = wind_chill_temperature({
        tdb: -5.0,
        v: 5.5,
        round_output: false,
      });

      const expected =
        13.12 +
        0.6215 * -5.0 -
        11.37 * 5.5 ** 0.16 +
        0.3965 * -5.0 * 5.5 ** 0.16;
      expect(approx(result.wct, expected, { abs: 1e-9 })).toBe(true);
      expect(result.wct).not.toBe(-7.5);
    });

    test("test_wct_non_numeric_inputs", () => {
      expect(() =>
        wind_chill_temperature({ tdb: "invalid", v: 5.5 } as unknown as Inputs),
      ).toThrow(TypeError);

      expect(() =>
        wind_chill_temperature({
          tdb: -5.0,
          v: "invalid",
        } as unknown as Inputs),
      ).toThrow(TypeError);

      expect(() =>
        wind_chill_temperature({
          tdb: "invalid",
          v: "invalid",
        } as unknown as Inputs),
      ).toThrow(TypeError);
    });
  });
});
