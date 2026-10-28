import { describe, expect, test } from "vitest";
import { wci } from "../../src/models/index.ts";
import { testDataUrls } from "./comftest.ts";
import { loadTestData, validateResult } from "./testUtils.ts";

type Inputs = Parameters<typeof wci>[0];

const { testData: reference_table, tolerances: tolerance } = await loadTestData(
  testDataUrls.windChill,
);

// Mirrors pythermalcomfort v4.7.0 tests/test_wind_chill_index.py.
describe("test_wind_chill_index", () => {
  test.each(reference_table.data)("test_calculates_wci: case %#", (entry) => {
    const { inputs, outputs } = entry;
    const result = wci(inputs as unknown as Inputs);

    validateResult(result, outputs, tolerance, inputs);
  });

  describe("TestWc", () => {
    //  Raises TypeError if tdb parameter is not provided
    test("test_raises_type_error_tdb_not_provided", () => {
      expect(() => wci({ v: 0.1 } as unknown as Inputs)).toThrow(TypeError);
    });

    //  Raises TypeError if v parameter is not provided
    test("test_raises_type_error_v_not_provided", () => {
      expect(() => wci({ tdb: 0 } as unknown as Inputs)).toThrow(TypeError);
    });

    //  Raises TypeError if tdb parameter is not a float
    test("test_raises_type_error_tdb_not_float", () => {
      expect(() => wci({ tdb: "0", v: 0.1 } as unknown as Inputs)).toThrow(
        TypeError,
      );
    });
  });
});
