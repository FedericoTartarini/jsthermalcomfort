import { describe, expect, test } from "vitest";
import {
  wind_chill_temperature,
  WIND_CHILL_TEMPERATURE_INFO,
} from "../../src/models/index.ts";
import { wind_chill_temperature as wind_chill_temperature_from_root } from "../../src/index.ts";
import { round } from "../../src/_internal/round.ts";
import { test_data_urls } from "./comftest.ts";
import { describeModelContract } from "./modelContract.ts";
import { approx, loadTestData, validateResult } from "./testUtils.ts";

type Inputs = Parameters<typeof wind_chill_temperature>[0];

const { testData: reference_table, tolerances: tolerance } = await loadTestData(
  test_data_urls.windChillTemperature,
);

// Mirrors pythermalcomfort v4.8.0 tests/test_wind_chill_temperature.py.
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
      expect(round(result.wct ?? NaN, 1)).toBe(-7.5);
    });

    // Upstream's empty lists, element-wise.
    test("test_wct_empty_lists", () => {
      const pairs: [number, number][] = [];
      expect(
        pairs.map(([tdb, v]) => wind_chill_temperature({ tdb, v }).wct),
      ).toEqual([]);
    });

    // Upstream's lists, element-wise. Upstream also asserts an ndarray; the
    // element-wise results have no array of their own.
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

describeModelContract(wind_chill_temperature, WIND_CHILL_TEMPERATURE_INFO, {
  tdb: -5,
  v: 5.5,
});

// What upstream's tests leave out, measured on pythermalcomfort 4.7.0 in the
// parity image.
describe("wind_chill_temperature (JS-only)", () => {
  test.each([
    [-5, 5.5, -7.527137645688018, -7.5],
    [-10, 10, -15.2608188843888, -15.3],
    [-40, 30, -58.663137362187676, -58.7],
    [-20, 60, -36.468785330827345, -36.5],
    [0, 0, 13.12, 13.1],
    [0, 0.1, 5.253881860651691, 5.3],
    [10, 120, 3.4057964379880303, 3.4],
    [20, 1, 22.110000000000003, 22.1],
  ] as const)(
    "tdb %s, v %s gives %s, rounded %s",
    (tdb, v, expected, rounded) => {
      const result = wind_chill_temperature({ tdb, v, round_output: false });
      expect(approx(result.wct, expected)).toBe(true);
      expect(wind_chill_temperature({ tdb, v }).wct).toBe(rounded);
    },
  );

  // As upstream's: v**0.16 of a negative v is NaN (models/wind_chill_temperature.py:59).
  test("a negative v gives null", () => {
    expect(wind_chill_temperature({ tdb: 0, v: -1 }).wct).toBe(null);
    expect(
      wind_chill_temperature({ tdb: 0, v: -1, round_output: false }).wct,
    ).toBe(null);
  });

  // Deviation wind_chill_temperature-2.
  test("returns no rows", () => {
    for (const [tdb, v] of [
      [-50, 0],
      [-5, 5.5],
      [20, 120],
      [0, -1],
    ] as const) {
      expect(wind_chill_temperature({ tdb, v }).warnings).toEqual([]);
    }
  });

  test("is exported from the package root as from its subpath", () => {
    expect(wind_chill_temperature_from_root).toBe(wind_chill_temperature);
  });
});
