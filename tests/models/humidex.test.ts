import { describe, expect, test } from "vitest";
import { humidex } from "../../src/models/index.ts";
import { testDataUrls } from "./comftest.ts";
import { approx, loadTestData, validateResult } from "./testUtils.ts";

type Inputs = Parameters<typeof humidex>[0];

const { testData: reference_table, tolerances: tolerance } = await loadTestData(
  testDataUrls.humidex,
);

// Mirrors pythermalcomfort v4.7.0 tests/test_humidex.py. Its math.isclose
// keeps its default rel_tol, 1e-9.
describe("test_humidex", () => {
  test.each(reference_table.data)("test_humidex: fixture case %#", (entry) => {
    const { inputs, outputs } = entry;
    const result = humidex(inputs as unknown as Inputs);

    validateResult(result, outputs, tolerance, inputs);
  });

  test("test_humidex: invalid inputs", () => {
    expect(() => humidex({ tdb: "25", rh: 50 } as unknown as Inputs)).toThrow(
      TypeError,
    );

    expect(() => humidex({ tdb: 25, rh: "50" } as unknown as Inputs)).toThrow(
      TypeError,
    );

    expect(() => humidex({ tdb: 25, rh: 110 })).toThrow(RangeError);

    expect(() => humidex({ tdb: 25, rh: -10 })).toThrow(RangeError);
  });

  test("test_humidex_masterson", () => {
    // TODO move this to shared test
    // I got these values from
    // https://publications.gc.ca/collections/collection_2018/eccc/En57-23-1-79-eng.pdf
    let result = humidex({ tdb: 21, rh: 100, model: "masterson" });
    expect(approx(result.humidex, 29.3, { rel: 1e-9, abs: 0.1 })).toBe(true);
    expect(result.discomfort).toBe("Little or no discomfort");

    result = humidex({ tdb: 34, rh: 100, model: "masterson" });
    expect(approx(result.humidex, 58.9, { rel: 1e-9, abs: 0.01 })).toBe(true);

    result = humidex({ tdb: 43, rh: 20, model: "masterson" });
    expect(approx(result.humidex, 47.1, { rel: 1e-9, abs: 0.01 })).toBe(true);

    result = humidex({ tdb: 30, rh: 30, model: "masterson" });
    expect(approx(result.humidex, 31.5, { rel: 1e-9, abs: 0.01 })).toBe(true);

    result = humidex({ tdb: 31, rh: 55, model: "masterson" });
    expect(approx(result.humidex, 39.3, { rel: 1e-9, abs: 0.01 })).toBe(true);
  });
});
