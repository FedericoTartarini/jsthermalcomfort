import { describe, expect, test } from "@jest/globals";
import { humidex } from "../../src/models/index.js";
import {
  HUMIDEX_DISCOMFORT_BINS,
  HUMIDEX_INFO,
} from "../../src/models/humidex.ts";
import type { HumidexParams } from "../../src/models/humidex.ts";
import { classifyFromBins } from "../../src/models/classifierBins.ts";
import { testDataUrls } from "./comftest.ts";
import { loadTestData, validateResult } from "./testUtils.ts";

const { testData, tolerances } = await loadTestData(testDataUrls.humidex);

const near = (actual: number, expected: number, abs: number) =>
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(abs);

// Mirrors pythermalcomfort v4.6.2 tests/test_humidex.py.
describe("test_humidex", () => {
  test.each(testData.data)("test_humidex: fixture case %#", (row) => {
    const { inputs, outputs } = row;
    const result = humidex(inputs as unknown as HumidexParams);
    validateResult(result, outputs, tolerances, inputs);
  });

  test.each([
    ["tdb", { tdb: "25", rh: 50 }],
    ["rh", { tdb: 25, rh: "50" }],
  ])("test_humidex: a string %s throws a TypeError", (_, params) => {
    expect(() => humidex(params as unknown as HumidexParams)).toThrow(
      TypeError,
    );
  });

  // Upstream's ValueError for a value out of range is a RangeError here
  // (ADR 0012).
  test.each([110, -10])("test_humidex: rh %p throws a RangeError", (rh) => {
    expect(() => humidex({ tdb: 25, rh })).toThrow(RangeError);
  });

  // Upstream compares with math.isclose and the tolerance each assertion
  // gives (test_humidex.py:43-57).
  test("test_humidex_masterson", () => {
    let result = humidex({ tdb: 21, rh: 100, model: "masterson" });
    near(result.humidex, 29.3, 0.1);
    expect(result.discomfort).toBe("Little or no discomfort");

    result = humidex({ tdb: 34, rh: 100, model: "masterson" });
    near(result.humidex, 58.9, 0.01);

    result = humidex({ tdb: 43, rh: 20, model: "masterson" });
    near(result.humidex, 47.1, 0.01);

    result = humidex({ tdb: 30, rh: 30, model: "masterson" });
    near(result.humidex, 31.5, 0.01);

    result = humidex({ tdb: 31, rh: 55, model: "masterson" });
    near(result.humidex, 39.3, 0.01);
  });
});

// Upstream has no test for these. Every expected value is what
// pythermalcomfort 4.6.2 returns for the same call.
describe("humidex beyond upstream's tests", () => {
  describe("the docstring examples", () => {
    test("tdb 25, rh 50 is 28.2, little or no discomfort", () => {
      expect(humidex({ tdb: 25, rh: 50 })).toEqual({
        humidex: 28.2,
        discomfort: "Little or no discomfort",
        warnings: [],
      });
    });

    // Upstream's docstring prints 39.1 for this point (humidex.py:55-56).
    test("tdb 30, rh 60 unrounded is 38.55535958479931, evident discomfort", () => {
      expect(humidex({ tdb: 30, rh: 60, round_output: false })).toEqual({
        humidex: 38.55535958479931,
        discomfort: "Evident discomfort",
        warnings: [],
      });
    });
  });

  describe("the masterson model", () => {
    test.each([
      [21, 100, 29.4, 29.43184570071731, "Little or no discomfort"],
      [34, 100, 58.9, 58.94380102860506, "Heat stroke probable"],
      [43, 20, 47.1, 47.11929773954795, "Dangerous discomfort"],
      [30, 30, 31.5, 31.532011099337133, "Noticeable discomfort"],
      [31, 55, 39.3, 39.34426556297849, "Evident discomfort"],
    ])(
      "tdb %p, rh %p: %p, unrounded %p, %p",
      (tdb, rh, rounded, unrounded, discomfort) => {
        expect(humidex({ tdb, rh, model: "masterson" })).toEqual({
          humidex: rounded,
          discomfort,
          warnings: [],
        });
        expect(
          humidex({ tdb, rh, model: "masterson", round_output: false }),
        ).toEqual({ humidex: unrounded, discomfort, warnings: [] });
      },
    );

    test("differs from rana at tdb 30, rh 100: 48.6 against 48.0", () => {
      expect(humidex({ tdb: 30, rh: 100, model: "masterson" }).humidex).toBe(
        48.6,
      );
      expect(humidex({ tdb: 30, rh: 100, model: "rana" }).humidex).toBe(48);
    });
  });

  // Decision D1 (ADR 0004 as amended): the dew point at rh 0 is NaN, and
  // upstream returns a NaN humidex classified "Heat stroke probable".
  describe("rh 0", () => {
    test.each([
      [30, true],
      [30, false],
      [-20, true],
    ])(
      "masterson at tdb %p, round_output %p: NaN, heat stroke probable",
      (tdb, round_output) => {
        const result = humidex({
          tdb,
          rh: 0,
          model: "masterson",
          round_output,
        });
        expect(result.humidex).toBeNaN();
        expect(result.discomfort).toBe("Heat stroke probable");
        expect(result.warnings).toEqual([]);
      },
    );

    test("rana at tdb 30: 24.4, unrounded 24.444444444444443", () => {
      expect(humidex({ tdb: 30, rh: 0 })).toEqual({
        humidex: 24.4,
        discomfort: "Little or no discomfort",
        warnings: [],
      });
      expect(humidex({ tdb: 30, rh: 0, round_output: false }).humidex).toBe(
        24.444444444444443,
      );
    });
  });

  describe("round_output", () => {
    // In v1 an options object without `round` turned rounding off.
    test.each([
      ["omitted", {}],
      ["undefined", { round_output: undefined }],
      ["true", { round_output: true }],
    ])("%s rounds to 0.1", (_, extra) => {
      expect(humidex({ tdb: 25, rh: 50, ...extra }).humidex).toBe(28.2);
    });

    test("false returns 28.227037412839586", () => {
      expect(humidex({ tdb: 25, rh: 50, round_output: false }).humidex).toBe(
        28.227037412839586,
      );
    });

    // Ten times 0.25 and 30.049999999999997 are exactly 2.5 and 300.5,
    // ties that np.around sends to the even 0.2 and 30.0.
    test.each([
      [5.805555555555555, 0, 0.25, 0.2],
      [26.18471325078344, 50, 30.049999999999997, 30],
    ])(
      "tdb %p, rh %p: %p rounds half to even, to %p",
      (tdb, rh, unrounded, rounded) => {
        expect(humidex({ tdb, rh, round_output: false }).humidex).toBe(
          unrounded,
        );
        expect(humidex({ tdb, rh }).humidex).toBe(rounded);
      },
    );

    // Upstream classifies the rounded value (humidex.py:88-96).
    test("the category is the rounded value's: 30.0 is little or no discomfort, 30.049999999999997 noticeable", () => {
      const tdb = 26.18471325078344;
      expect(humidex({ tdb, rh: 50 }).discomfort).toBe(
        "Little or no discomfort",
      );
      expect(humidex({ tdb, rh: 50, round_output: false }).discomfort).toBe(
        "Noticeable discomfort",
      );
    });
  });

  // Upstream's bins are right-inclusive (humidex.py:92-96).
  describe("the discomfort categories", () => {
    test.each([
      [25, 50, 28.2, "Little or no discomfort"],
      [28, 50, 32.9, "Noticeable discomfort"],
      [30, 50, 36.2, "Evident discomfort"],
      [30, 80, 43.3, "Intense discomfort; avoid exertion"],
      [35, 50, 45, "Intense discomfort; avoid exertion"],
      [30, 100, 48, "Dangerous discomfort"],
      [40, 50, 54.9, "Heat stroke probable"],
    ])("tdb %p, rh %p: %p is %p", (tdb, rh, value, discomfort) => {
      expect(humidex({ tdb, rh })).toEqual({
        humidex: value,
        discomfort,
        warnings: [],
      });
    });

    // Below -237.7 °C the rana exponent's denominator is negative, so 10 to
    // it overflows; times rh 0 it is NaN. Either way upstream returns
    // "Heat stroke probable".
    test("an infinite or NaN humidex is heat stroke probable", () => {
      expect(humidex({ tdb: -237.70000001, rh: 50 })).toEqual({
        humidex: Infinity,
        discomfort: "Heat stroke probable",
        warnings: [],
      });
      const nan = humidex({ tdb: -237.70000001, rh: 0 });
      expect(nan.humidex).toBeNaN();
      expect(nan.discomfort).toBe("Heat stroke probable");
    });

    test("tdb -237.7, where the denominator is 0, is -243.3", () => {
      expect(humidex({ tdb: -237.7, rh: 50 })).toEqual({
        humidex: -243.3,
        discomfort: "Little or no discomfort",
        warnings: [],
      });
    });
  });

  // The model keeps upstream's masks (humidex.py:91-96); the bins give a
  // consumer the same categories as a classifier.
  describe("HUMIDEX_DISCOMFORT_BINS", () => {
    test("are upstream's five right-inclusive edges, a top edge of Infinity, and its six labels", () => {
      expect(HUMIDEX_DISCOMFORT_BINS).toEqual({
        edges: [30, 35, 40, 45, 54, Infinity],
        labels: [
          "Little or no discomfort",
          "Noticeable discomfort",
          "Evident discomfort",
          "Intense discomfort; avoid exertion",
          "Dangerous discomfort",
          "Heat stroke probable",
        ],
        right: true,
      });
    });

    test("HUMIDEX_INFO classifies discomfort with them", () => {
      expect(HUMIDEX_INFO.outputs.discomfort.classifier).toBe(
        HUMIDEX_DISCOMFORT_BINS,
      );
    });

    // Each rounded humidex at rh 50 lands on a category edge or 0.1 above
    // it; the discomfort is upstream's for the same call.
    test.each([
      [26.15898951357993, 30, "Little or no discomfort"],
      [26.22327611127268, 30.1, "Noticeable discomfort"],
      [29.28170994652131, 35, "Noticeable discomfort"],
      [29.34228599031696, 35.1, "Evident discomfort"],
      [32.22334206934383, 40, "Evident discomfort"],
      [32.280394784860306, 40.1, "Intense discomfort; avoid exertion"],
      [34.993975620226195, 45, "Intense discomfort; avoid exertion"],
      [35.047719144623464, 45.1, "Dangerous discomfort"],
      [39.585719074318774, 54, "Dangerous discomfort"],
      [39.6340774621599, 54.1, "Heat stroke probable"],
      [-237.7, -243.3, "Little or no discomfort"],
    ])(
      "tdb %p, rh 50: %p is %p, by the model and by the bins",
      (tdb, value, discomfort) => {
        const result = humidex({ tdb, rh: 50 });
        expect(result.humidex).toBe(value);
        expect(result.discomfort).toBe(discomfort);
        expect(classifyFromBins(value, HUMIDEX_DISCOMFORT_BINS)).toBe(
          discomfort,
        );
      },
    );

    test("a NaN or +Infinity humidex is heat stroke probable by the model and NaN by the bins", () => {
      const infinite = humidex({ tdb: -237.70000001, rh: 50 });
      const nan = humidex({ tdb: 30, rh: 0, model: "masterson" });
      for (const result of [infinite, nan]) {
        expect(result.discomfort).toBe("Heat stroke probable");
        expect(
          classifyFromBins(result.humidex, HUMIDEX_DISCOMFORT_BINS),
        ).toBeNaN();
      }
    });
  });

  describe("errors", () => {
    const base = { tdb: 25, rh: 50 };
    const call = (params: Record<string, unknown>) => () =>
      humidex(params as unknown as HumidexParams);

    // Upstream's message (humidex.py:70-71); its ValueError is a RangeError
    // (ADR 0012). The bounds are inclusive.
    test.each([100.0000001, -1e-9])("rh %p throws a RangeError", (rh) => {
      expect(call({ ...base, rh })).toThrow(
        new RangeError("Relative humidity must be between 0 and 100%"),
      );
    });

    test.each([0, 100])("rh %p is accepted", (rh) => {
      expect(Number.isFinite(humidex({ ...base, rh }).humidex)).toBe(true);
    });

    // Upstream's message (humidex.py:73-76); its ValueError is an Error
    // (ADR 0012). The values are compared exactly, as upstream does (ADR 0007).
    test.each(["invalid", "Rana", "MASTERSON", "", null, 1, true])(
      "model %p throws an Error",
      (model) => {
        expect(call({ ...base, model })).toThrow(
          new Error(
            "Invalid model. The model must be either 'rana' or 'masterson'",
          ),
        );
      },
    );

    // Upstream looks the model up in a dict, which raises a TypeError for an
    // unhashable list or dict.
    test.each([
      [["rana"], "list"],
      [{}, "dict"],
    ])("model %p throws upstream's TypeError", (model, type) => {
      expect(call({ ...base, model })).toThrow(
        new TypeError(`unhashable type: '${type}'`),
      );
    });

    // Upstream checks rh before model (humidex.py:70-76).
    test.each(["invalid", ["rana"]])(
      "rh 110 with model %p throws the rh RangeError",
      (model) => {
        expect(call({ ...base, rh: 110, model })).toThrow(RangeError);
      },
    );

    test.each(["true", 1, null])(
      "round_output %p throws upstream's TypeError",
      (round_output) => {
        expect(call({ ...base, round_output })).toThrow(TypeError);
      },
    );

    // Upstream validates round_output in HumidexInputs before the rh check.
    test('round_output "x" with rh 110 throws the TypeError', () => {
      expect(call({ ...base, rh: 110, round_output: "x" })).toThrow(TypeError);
    });

    // ADR 0008: upstream raises a TypeError for an unexpected keyword;
    // humidex has no limit_inputs or units.
    test.each(["limit_inputs", "units"])(
      "the key %p throws a TypeError naming it",
      (key) => {
        expect(call({ ...base, [key]: true })).toThrow(
          new TypeError(`humidex got an unexpected key: '${key}'`),
        );
      },
    );

    // ADR 0002: a positional call fails instead of running as defaults.
    test("a positional call throws a TypeError", () => {
      const positional = humidex as unknown as (...args: unknown[]) => unknown;
      expect(() => positional(25, 50)).toThrow(TypeError);
    });

    test("a missing rh throws a TypeError, as upstream", () => {
      expect(call({ tdb: 25 })).toThrow(TypeError);
    });

    // ADR 0001: a public model throws a TypeError for a non-finite number.
    // Upstream returns NaN, "Heat stroke probable" for a NaN or infinite tdb
    // and a NaN rh, and raises a ValueError for an infinite rh.
    test.each(
      ["tdb", "rh"].flatMap((key) =>
        [NaN, Infinity, -Infinity].map((value) => [key, value] as const),
      ),
    )("%s %p throws a TypeError", (key, value) => {
      expect(call({ ...base, [key]: value })).toThrow(TypeError);
    });

    // ADR 0005 as amended: upstream reads True as 1 (tdb True is -2.7,
    // rh True 19.6), and a None quantity raises a TypeError there too.
    test.each(["tdb", "rh"])(
      "a boolean or null %s throws a TypeError",
      (key) => {
        expect(call({ ...base, [key]: true })).toThrow(TypeError);
        expect(call({ ...base, [key]: null })).toThrow(TypeError);
      },
    );

    // ADR 0005: quantities are numbers; upstream would broadcast the list.
    test("an array throws a TypeError", () => {
      expect(call({ ...base, tdb: [25, 30] })).toThrow(TypeError);
    });
  });
});
