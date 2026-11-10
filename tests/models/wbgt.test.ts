import { describe, expect, test } from "vitest";
import { wbgt, WBGT_INFO } from "../../src/models/index.ts";
import { wbgt as wbgt_from_root } from "../../src/index.ts";
import { test_data_urls } from "./comftest.ts";
import { describeModelContract } from "./modelContract.ts";
import { approx, loadTestData, validateResult } from "./testUtils.ts";

type Inputs = Parameters<typeof wbgt>[0];

const call = (inputs: unknown) => wbgt(inputs as Inputs);

const { testData: reference_table, tolerances: tolerance } = await loadTestData(
  test_data_urls.wbgt,
);

// Mirrors pythermalcomfort v4.8.0 tests/test_wbgt.py.
describe("test_wbgt", () => {
  test.each(reference_table.data)(
    "test_wbgt_with_url_cases: fixture case %#",
    (entry) => {
      const { inputs, outputs } = entry;
      const result = wbgt(inputs as unknown as Inputs);

      validateResult(result, outputs, tolerance, inputs);
    },
  );

  // Test wbgt value error
  // Upstream's ValueError is a TypeError (deviation wbgt-3).
  test("test_wbgt", () => {
    expect(() => wbgt({ twb: 25, tg: 32, with_solar_load: true })).toThrow(
      TypeError,
    );
  });

  //  Calculate WBGT with twb and tg set to None
  test("test_calculate_wbgt_with_twb_and_tg_set_to_none", () => {
    expect(() =>
      wbgt({ twb: null, tg: null } as unknown as Parameters<typeof wbgt>[0]),
    ).toThrow(TypeError);
  });
});

describeModelContract(wbgt, WBGT_INFO, { twb: 25, tg: 32 });

const tdb_message = "Please enter the dry bulb air temperature";

// What upstream's tests leave out, measured on pythermalcomfort 4.7.0 in the
// parity image.
describe("wbgt (JS-only)", () => {
  test.each([
    [{ twb: 25, tg: 32 }, 27.1, 27.1],
    [{ twb: 25, tg: 32, tdb: 20, with_solar_load: true }, 25.9, 25.9],
    [{ twb: 17.3, tg: 40 }, 24.11, 24.1],
    [{ twb: 21.1, tg: 55 }, 31.27, 31.3],
    [{ twb: 0, tg: 0 }, 0.0, 0.0],
    [{ twb: -20, tg: -10 }, -17.0, -17.0],
    [{ twb: 30, tg: 60, tdb: 40, with_solar_load: true }, 37.0, 37.0],
    [
      { twb: 17.3, tg: 40, tdb: 33.3, with_solar_load: true },
      23.439999999999998,
      23.4,
    ],
    [{ twb: 25, tg: 32, tdb: -0.0, with_solar_load: true }, 23.9, 23.9],
    [{ twb: 26.05, tg: 26.05 }, 26.049999999999997, 26.0],
    [{ twb: 12.25, tg: 12.25 }, 12.25, 12.2],
  ] as const)("%o gives %s, rounded %s", (inputs, expected, rounded) => {
    const result = wbgt({ ...inputs, round_output: false });
    expect(approx(result.wbgt, expected, { rel: 1e-12, abs: 0 })).toBe(true);
    expect(wbgt(inputs).wbgt).toBe(rounded);
  });

  // models/wbgt.py:85-88.
  test("ignores tdb without solar load", () => {
    expect(wbgt({ twb: 25, tg: 32, tdb: 20 }).wbgt).toBe(27.1);
  });

  // Deviation wbgt-3.
  test.each([{}, { tdb: null }])(
    "with_solar_load and %o throw upstream's message as a TypeError",
    (tdb) => {
      expect(() =>
        call({ twb: 25, tg: 32, with_solar_load: true, ...tdb }),
      ).toThrow(new TypeError(tdb_message));
    },
  );

  // classes_input.py:1031-1037.
  test("checks tdb's type without solar load", () => {
    expect(() => call({ twb: 25, tg: 32, tdb: "20" })).toThrow(
      new TypeError("tdb must be a finite number."),
    );
  });

  // models/wbgt.py:70-83.
  test("checks the inputs before tdb's presence, as WBGTInputs runs first", () => {
    expect(() => call({ twb: "25", tg: 32, with_solar_load: true })).toThrow(
      new TypeError("twb must be a finite number."),
    );
  });

  // Deviation wbgt-2.
  test("returns no rows", () => {
    for (const inputs of [
      { twb: -20, tg: -10 },
      { twb: 25, tg: 32 },
      { twb: 30, tg: 60, tdb: 40, with_solar_load: true },
    ]) {
      expect(wbgt(inputs).warnings).toEqual([]);
    }
  });

  test("is exported from the package root as from its subpath", () => {
    expect(wbgt_from_root).toBe(wbgt);
  });
});
