import { describe } from "@jest/globals";
import { discomfort_index } from "../../src/models/discomfort_index";
import { testDataUrls } from "./comftest";
import { loadTestData, validateResult } from "./testUtils";

const returnArray = true;

let { testData, tolerances } = await loadTestData(
  testDataUrls.discomfortIndex,
  returnArray,
);

describe("discomfort_index", () => {
  test.each(testData.data)("test_discomfort_index [%#]", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { tdb, rh } = inputs;
    const modelResult = discomfort_index(tdb, rh);

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });
});

describe("discomfort_index input validation", () => {
  test.each([
    ["tdb", "25", 50],
    ["rh", 25, "50"],
  ])("throws TypeError if %s is not a number", (_, ...args) => {
    expect(() => discomfort_index(...args)).toThrow(TypeError);
  });
});

// Additional parity regressions beyond Python's shared reference table.
describe("discomfort_index Python parity", () => {
  test.each([
    [21, "Less than 50% feels discomfort"],
    [24, "More than 50% feels discomfort"],
    [27, "Most of the population feels discomfort"],
    [29, "Everyone feels severe stress"],
    [32, "State of medical emergency"],
    [99, NaN],
    [100, NaN],
    [NaN, NaN],
  ])("classifies unrounded DI at %s", (tdb, condition) => {
    expect(discomfort_index(tdb, 100).discomfort_condition).toEqual(condition);
  });

  test("classifies before rounding", () => {
    expect(discomfort_index(20.99, 100)).toEqual({
      di: 21,
      discomfort_condition: "No discomfort",
    });
  });

  test.each([
    [22.25, 22.2],
    [22.35, 22.4],
    [-0.25, -0.2],
  ])("rounds %s with NumPy half-to-even semantics", (tdb, expected) => {
    expect(discomfort_index(tdb, 100).di).toBe(expected);
  });

  test("broadcasts scalar temperature and singleton arrays", () => {
    const expected = {
      di: [24.9, 33.9],
      discomfort_condition: [
        "More than 50% feels discomfort",
        "State of medical emergency",
      ],
    };
    expect(discomfort_index(35, [10, 90])).toEqual(expected);
    expect(discomfort_index([35], [10, 90])).toEqual(expected);
    expect(discomfort_index([35, 35], [10])).toEqual(
      discomfort_index([35, 35], 10),
    );
  });

  test("preserves empty and one-element arrays", () => {
    expect(discomfort_index([], 50)).toEqual({
      di: [],
      discomfort_condition: [],
    });
    expect(discomfort_index(25, [])).toEqual({
      di: [],
      discomfort_condition: [],
    });
    expect(discomfort_index([25], [50])).toEqual({
      di: [22.1],
      discomfort_condition: ["Less than 50% feels discomfort"],
    });
  });

  test("rejects incompatible array lengths", () => {
    expect(() => discomfort_index([25, 30], [40, 50, 60])).toThrow(RangeError);
  });

  test.each([
    [null, 50],
    [25, undefined],
    [[25, "30"], 50],
    [25, ["50"]],
  ])("rejects invalid numeric inputs [%#]", (tdb, rh) => {
    expect(() => discomfort_index(tdb, rh)).toThrow(TypeError);
  });
});

// Expected outputs verified against pythermalcomfort 4.6.0.
describe("discomfort_index multidimensional and scalar parity", () => {
  test("broadcasts a column against a row", () => {
    expect(discomfort_index([[25], [30]], [50, 60])).toEqual({
      di: [
        [22.1, 22.7],
        [25.7, 26.6],
      ],
      discomfort_condition: [
        ["Less than 50% feels discomfort", "Less than 50% feels discomfort"],
        ["More than 50% feels discomfort", "More than 50% feels discomfort"],
      ],
    });
  });

  test("aligns three-dimensional shapes from the right", () => {
    expect(discomfort_index([[[25]], [[30]]], [[50, 60]])).toEqual({
      di: [[[22.1, 22.7]], [[25.7, 26.6]]],
      discomfort_condition: [
        [["Less than 50% feels discomfort", "Less than 50% feels discomfort"]],
        [["More than 50% feels discomfort", "More than 50% feels discomfort"]],
      ],
    });
  });

  test("preserves nested empty dimensions", () => {
    expect(discomfort_index([[], []], [50])).toEqual({
      di: [[], []],
      discomfort_condition: [[], []],
    });
  });

  test.each([
    [true, 50, 4.7],
    [25, false, 19.2],
  ])("accepts Python-compatible boolean scalars [%#]", (tdb, rh, di) => {
    expect(discomfort_index(tdb, rh)).toEqual({
      di,
      discomfort_condition: "No discomfort",
    });
  });

  test("accepts boolean arrays", () => {
    expect(discomfort_index([true, false], [false, true])).toEqual({
      di: [8.4, 7.9],
      discomfort_condition: ["No discomfort", "No discomfort"],
    });
  });

  test.each([-0.05, -0.01])("preserves negative zero for %s", (tdb) => {
    expect(discomfort_index(tdb, 100).di).toBe(-0);
  });

  test("matches Python when the formula cancels a negative zero", () => {
    expect(discomfort_index(-0, 100).di).toBe(0);
  });

  test.each([
    [[[25], [30, 35]], 50],
    [
      [
        [25, 30],
        [35, 40],
      ],
      [40, 50, 60],
    ],
    [[], [50, 60]],
  ])("rejects ragged or incompatible shapes [%#]", (tdb, rh) => {
    expect(() => discomfort_index(tdb, rh)).toThrow(RangeError);
  });

  test.each([NaN, Infinity, -Infinity])(
    "propagates non-finite temperature %s",
    (tdb) => {
      expect(discomfort_index(tdb, 50)).toEqual({
        di: NaN,
        discomfort_condition: NaN,
      });
    },
  );
});
