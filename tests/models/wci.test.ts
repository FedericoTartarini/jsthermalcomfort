import { describe, expect, test } from "vitest";
import { wci, WCI_INFO } from "../../src/models/index.ts";
import { wci as wci_from_root } from "../../src/index.ts";
import { test_data_urls } from "./comftest.ts";
import { describeModelContract } from "./modelContract.ts";
import { approx, loadTestData, validateResult } from "./testUtils.ts";

type Inputs = Parameters<typeof wci>[0];

const { testData: reference_table, tolerances: tolerance } = await loadTestData(
  test_data_urls.windChill,
);

// Mirrors pythermalcomfort v4.8.0 tests/test_wind_chill_index.py.
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

describeModelContract(wci, WCI_INFO, { tdb: -5, v: 5.5 });

// What upstream's tests leave out, measured on pythermalcomfort 4.7.0 in the
// parity image.
describe("wci (JS-only)", () => {
  test.each([
    [-5, 5.5, 1255.2014704481833, 1255.2],
    [-10, 10, 1603.927485073605, 1603.9],
    [0, 0.1, 518.5877043196023, 518.6],
    [-20, 0, 644.1275499999999, 644.1],
    [-20, 25, 2185.10255, 2185.1],
    [-20, 40, 2076.9602039023753, 2077.0],
    [33, 5, 0.0, 0.0],
    [40, 5, -226.40674404825788, -226.4],
  ] as const)(
    "tdb %s, v %s gives %s, rounded %s",
    (tdb, v, expected, rounded) => {
      const result = wci({ tdb, v, round_output: false });
      expect(approx(result.wci, expected)).toBe(true);
      expect(wci({ tdb, v }).wci).toBe(rounded);
    },
  );

  // As upstream's: v**0.5 of a negative v is NaN (models/wci.py:68).
  test("a negative v gives null", () => {
    expect(wci({ tdb: 0, v: -1 }).wci).toBe(null);
    expect(wci({ tdb: 0, v: -1, round_output: false }).wci).toBe(null);
  });

  // Deviation wci-2.
  test("returns no rows", () => {
    for (const [tdb, v] of [
      [-50, 0],
      [-5, 5.5],
      [40, 40],
      [0, -1],
    ] as const) {
      expect(wci({ tdb, v }).warnings).toEqual([]);
    }
  });

  test("is exported from the package root as from its subpath", () => {
    expect(wci_from_root).toBe(wci);
  });
});
