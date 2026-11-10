import { describe, expect, test } from "vitest";
import { humidex, HUMIDEX_INFO } from "../../src/models/index.ts";
import { humidex as humidex_from_root } from "../../src/index.ts";
import { test_data_urls } from "./comftest.ts";
import { describeModelContract } from "./modelContract.ts";
import { approx, loadTestData, validateResult } from "./testUtils.ts";

type Inputs = Parameters<typeof humidex>[0];

const { testData: reference_table, tolerances: tolerance } = await loadTestData(
  test_data_urls.humidex,
);

// Mirrors pythermalcomfort v4.8.0 tests/test_humidex.py. Its math.isclose
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

describeModelContract(humidex, HUMIDEX_INFO, { tdb: 25, rh: 50 });

// What upstream's tests leave out, measured on pythermalcomfort 4.7.0 in the
// parity image.
describe("humidex (JS-only)", () => {
  // A call with inputs the type rejects, to test the runtime.
  const call = (inputs: unknown) => () => humidex(inputs as Inputs);

  const RH_MESSAGE = "Relative humidity must be between 0 and 100%";
  const MODEL_MESSAGE =
    "Invalid model. The model must be either 'rana' or 'masterson'";

  test.each([
    ["rana", 25, 50, 28.227037412839586, "Little or no discomfort"],
    ["rana", 30, 60, 38.55535958479931, "Evident discomfort"],
    ["rana", 43, 20, 47.013173707025985, "Dangerous discomfort"],
    ["rana", -10, 80, -14.283166094453149, "Little or no discomfort"],
    ["masterson", 25, 50, 28.285508197956847, "Little or no discomfort"],
    ["masterson", 30, 60, 38.773059860573426, "Evident discomfort"],
    ["masterson", 43, 20, 47.11929773954795, "Dangerous discomfort"],
    ["masterson", -10, 80, -14.275067472793507, "Little or no discomfort"],
  ] as const)(
    "%s at tdb %s, rh %s gives %s, %s",
    (model, tdb, rh, expected, discomfort) => {
      const result = humidex({ tdb, rh, model, round_output: false });
      expect(approx(result.humidex, expected, { rel: 1e-12, abs: 0 })).toBe(
        true,
      );
      expect(result.discomfort).toBe(discomfort);
    },
  );

  // models/humidex.py:88-96 classifies the rounded value under round_output.
  test("the category is the rounded value's", () => {
    const unrounded = humidex({ tdb: 21.5, rh: 99, round_output: false });
    expect(approx(unrounded.humidex, 30.026061074618617, { rel: 1e-12 })).toBe(
      true,
    );
    expect(unrounded.discomfort).toBe("Noticeable discomfort");
    const rounded = humidex({ tdb: 21.5, rh: 99 });
    expect(rounded.humidex).toBe(30);
    expect(rounded.discomfort).toBe("Little or no discomfort");
  });

  // As upstream's: dew_point_tmp takes log(0), and a NaN falls in no mask.
  test("masterson at rh 0 gives null and 'Heat stroke probable'", () => {
    const result = humidex({ tdb: 35, rh: 0, model: "masterson" });
    expect(result.humidex).toBe(null);
    expect(result.discomfort).toBe("Heat stroke probable");
    expect(humidex({ tdb: 35, rh: 0 }).humidex).toBe(29.4);
  });

  // Deviation humidex-4.
  test("an rh outside [0, 100] throws upstream's message as a RangeError", () => {
    for (const rh of [-0.1, 100.1, -10, 110]) {
      expect(call({ tdb: 25, rh })).toThrow(new RangeError(RH_MESSAGE));
    }
    expect(Number.isFinite(humidex({ tdb: 25, rh: 0 }).humidex)).toBe(true);
    expect(Number.isFinite(humidex({ tdb: 25, rh: 100 }).humidex)).toBe(true);
  });

  // Deviation humidex-4: upstream compares model case-sensitively.
  test("a model other than 'rana' or 'masterson' throws upstream's message", () => {
    for (const model of ["x", "Masterson", "RANA", ""]) {
      expect(call({ tdb: 25, rh: 50, model })).toThrow(
        new RangeError(MODEL_MESSAGE),
      );
    }
    for (const model of [5, true, null, ["rana"]]) {
      expect(call({ tdb: 25, rh: 50, model })).toThrow(
        new TypeError(MODEL_MESSAGE),
      );
    }
  });

  // Deviation humidex-3.
  test("model is checked before round_output and the rh range", () => {
    expect(call({ tdb: 25, rh: 110, model: "x" })).toThrow(
      new RangeError(MODEL_MESSAGE),
    );
    expect(call({ tdb: 25, rh: 50, model: "x", round_output: "y" })).toThrow(
      new RangeError(MODEL_MESSAGE),
    );
    expect(call({ tdb: 25, rh: 110, model: "Masterson" })).toThrow(
      new RangeError(RH_MESSAGE),
    );
  });

  // Deviation humidex-2.
  test("returns no rows", () => {
    for (const model of ["rana", "masterson"] as const)
      for (const [tdb, rh] of [
        [-20, 0],
        [25, 50],
        [50, 100],
      ] as const) {
        expect(humidex({ tdb, rh, model }).warnings).toEqual([]);
      }
  });

  test("is exported from the package root as from its subpath", () => {
    expect(humidex_from_root).toBe(humidex);
  });
});
