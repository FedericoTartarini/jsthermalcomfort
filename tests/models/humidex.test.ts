import { describe, expect, test } from "vitest";
import {
  classifyFromBins,
  humidex,
  HUMIDEX_INFO,
} from "../../src/models/index.ts";
import { humidex as humidex_from_root } from "../../src/index.ts";
import { test_data_urls } from "./comftest.ts";
import { describeModelContract } from "./modelContract.ts";
import { approx, loadTestData, validateResult } from "./testUtils.ts";

type Inputs = Parameters<typeof humidex>[0];

const { testData: reference_table, tolerances: tolerance } = await loadTestData(
  test_data_urls.humidex,
);

// Mirrors pythermalcomfort v4.8.1 tests/test_humidex.py. Its math.isclose
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
    expect(approx(result.humidex, 29.3, { abs: 0.1 })).toBe(true);
    expect(result.discomfort).toBe("Little or no discomfort");

    result = humidex({ tdb: 34, rh: 100, model: "masterson" });
    expect(approx(result.humidex, 58.9, { abs: 0.01 })).toBe(true);

    result = humidex({ tdb: 43, rh: 20, model: "masterson" });
    expect(approx(result.humidex, 47.1, { abs: 0.01 })).toBe(true);

    result = humidex({ tdb: 30, rh: 30, model: "masterson" });
    expect(approx(result.humidex, 31.5, { abs: 0.01 })).toBe(true);

    result = humidex({ tdb: 31, rh: 55, model: "masterson" });
    expect(approx(result.humidex, 39.3, { abs: 0.01 })).toBe(true);
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

  // As upstream's: dew_point_tmp takes log(0), and a NaN falls in no bin, so
  // it takes upstream's default (deviation humidex-9).
  test("masterson at rh 0 gives null and 'Heat stroke probable'", () => {
    const result = humidex({ tdb: 35, rh: 0, model: "masterson" });
    expect(result.humidex).toBe(null);
    expect(result.discomfort).toBe("Heat stroke probable");
    expect(humidex({ tdb: 35, rh: 0 }).humidex).toBe(29.4);
  });

  // Deviation humidex-1: the masks' thresholds, models/humidex.py:91-96, with
  // 1000 closing the last.
  test("the info holds discomfort's classifier", () => {
    expect(HUMIDEX_INFO.outputs.discomfort).toEqual({
      kind: "label",
      unit: null,
      classifier: {
        edges: [30, 35, 40, 45, 54, 1000],
        labels: [
          "Little or no discomfort",
          "Noticeable discomfort",
          "Evident discomfort",
          "Intense discomfort; avoid exertion",
          "Dangerous discomfort",
          "Heat stroke probable",
        ],
        right: true,
      },
    });
  });

  // Each pair of rh values gives an edge and the next double past it, and the
  // masks' <= puts the edge in the lower category, as measured on 4.8.1.
  test.each([
    [25, 60.09361696221471, 30, "Little or no discomfort"],
    [25, 60.09361696221472, 30.000000000000004, "Noticeable discomfort"],
    [25, 88.55901447063219, 35, "Noticeable discomfort"],
    [25, 88.5590144706322, 35.00000000000001, "Evident discomfort"],
    [30, 66.14265085218716, 40, "Evident discomfort"],
    [
      30,
      66.14265085218717,
      40.00000000000001,
      "Intense discomfort; avoid exertion",
    ],
    [30, 87.40278862610445, 45, "Intense discomfort; avoid exertion"],
    [30, 87.40278862610447, 45.00000000000001, "Dangerous discomfort"],
    [35, 78.82113134737145, 54, "Dangerous discomfort"],
    [35, 78.82113134737146, 54.00000000000001, "Heat stroke probable"],
    [200, 8.875234952122655, 1000, "Heat stroke probable"],
    [200, 8.875234952122657, 1000.0000000000001, "Heat stroke probable"],
  ] as const)(
    "unrounded: tdb %s, rh %s gives %s, %s",
    (tdb, rh, expected, discomfort) => {
      const result = humidex({ tdb, rh, round_output: false });
      expect(result.humidex).toBe(expected);
      expect(result.discomfort).toBe(discomfort);
    },
  );

  // Each pair of rh values gives an edge and the next 0.1 past it after
  // rounding, as measured on 4.8.1.
  test.each([
    [25, 60, 30, "Little or no discomfort"],
    [25, 60.5, 30.1, "Noticeable discomfort"],
    [25, 88.5, 35, "Noticeable discomfort"],
    [25, 89, 35.1, "Evident discomfort"],
    [30, 66, 40, "Evident discomfort"],
    [30, 66.5, 40.1, "Intense discomfort; avoid exertion"],
    [30, 87.5, 45, "Intense discomfort; avoid exertion"],
    [30, 88, 45.1, "Dangerous discomfort"],
    [35, 78.67, 54, "Dangerous discomfort"],
    [35, 78.99, 54.1, "Heat stroke probable"],
    [200, 8.875, 1000, "Heat stroke probable"],
    [200, 8.876, 1000.1, "Heat stroke probable"],
  ] as const)(
    "rounded: tdb %s, rh %s gives %s, %s",
    (tdb, rh, expected, discomfort) => {
      const result = humidex({ tdb, rh });
      expect(result.humidex).toBe(expected);
      expect(result.discomfort).toBe(discomfort);
    },
  );

  // Deviation humidex-9: past the last bin, upstream's default.
  test("a humidex above 1000 or +Infinity gives 'Heat stroke probable'", () => {
    expect(humidex({ tdb: 300, rh: 50 })).toMatchObject({
      humidex: 26258.4,
      discomfort: "Heat stroke probable",
    });
    // 7.5 * tdb / (237.7 + tdb) is 17835 here, and 10 ** 17835 is Infinity.
    expect(humidex({ tdb: -237.8, rh: 50 })).toMatchObject({
      humidex: Infinity,
      discomfort: "Heat stroke probable",
    });
  });

  // Where the classifier gives no label, the model returns upstream's default.
  test("classifyFromBins of the returned humidex gives the returned discomfort", () => {
    const { classifier } = HUMIDEX_INFO.outputs.discomfort;
    for (const model of ["rana", "masterson"] as const)
      for (const round_output of [true, false])
        for (let tdb = -20; tdb <= 60; tdb += 2.5)
          for (let rh = 0; rh <= 100; rh += 5) {
            const result = humidex({ tdb, rh, model, round_output });
            const label =
              result.humidex === null
                ? NaN
                : classifyFromBins(result.humidex, classifier);
            expect(result.discomfort).toBe(
              typeof label === "string" ? label : "Heat stroke probable",
            );
          }
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
