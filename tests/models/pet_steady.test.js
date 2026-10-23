import { readFileSync } from "node:fs";
import { describe, expect, test } from "@jest/globals";
import { pet_steady } from "../../src/models/pet_steady";
import { testDataUrls } from "./comftest";
import { loadTestData, validateResult } from "./testUtils"; // Import shared utilities

let returnArray = true;

// use top-level await to load test data before tests are defined.
let { testData, tolerances } = await loadTestData(
  testDataUrls.petSteady,
  returnArray,
);

describe("pet_steady", () => {
  test.each(testData.data)("test_pet_steady #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const modelResult = callPet(inputs);

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });
});

// ---------------------------------------------------------------------------
// Input validation tests
// ---------------------------------------------------------------------------
describe("pet_steady input validation", () => {
  test.each([
    ["tdb", "20", 20, 0.15, 50, 1.37, 0.5],
    ["tr", 20, "20", 0.15, 50, 1.37, 0.5],
    ["v", 20, 20, "0.15", 50, 1.37, 0.5],
    ["rh", 20, 20, 0.15, "50", 1.37, 0.5],
    ["met", 20, 20, 0.15, 50, "1.37", 0.5],
    ["clo", 20, 20, 0.15, 50, 1.37, "0.5"],
  ])("throws TypeError if %s is not a number", (_, ...args) => {
    expect(() => pet_steady(...args)).toThrow(TypeError);
  });
});

// Mirror tests/test_pet_steady.py at Python commit
// 720ccec59521e358991ba6fc3ef2db622e794681, including all three array shapes.
const PET_TEST_MATRIX = [
  [20, 20, 50, 0.15, 1.37, 0.5, 18.85],
  [30, 30, 50, 0.15, 1.37, 0.5, 30.6],
  [20, 20, 50, 0.5, 1.37, 0.5, 17.16],
  [21, 21, 50, 0.1, 1.37, 0.9, 21.08],
  [20, 20, 50, 0.1, 1.37, 0.9, 19.92],
  [-5, 40, 2, 0.5, 1.37, 0.9, 7.82],
  [-5, -5, 50, 5, 1.37, 0.9, -13.38],
  [30, 60, 80, 1, 1.37, 0.9, 44.63],
  [30, 30, 80, 1, 1.37, 0.9, 32.21],
];
function full(shape, value) {
  return shape.length
    ? Array.from({ length: shape[0] }, () => full(shape.slice(1), value))
    : value;
}
for (const shape of [[10, 10], [10], [3, 3, 3]]) {
  test.each(PET_TEST_MATRIX)(
    `test_pet_array shape=${shape} #%#`,
    (tdb, tr, rh, v, met, clo, exp) => {
      expect(
        pet_steady(
          full(shape, tdb),
          full(shape, tr),
          full(shape, v),
          full(shape, rh),
          met,
          clo,
        ).pet,
      ).toEqual(full(shape, exp));
    },
  );
}
function callPet(inputs) {
  return pet_steady(
    ...[
      "tdb",
      "tr",
      "v",
      "rh",
      "met",
      "clo",
      "p_atm",
      "position",
      "age",
      "sex",
      "weight",
      "height",
      "wme",
    ].map((name) => inputs[name]),
  );
}

// Values evaluated with the pinned Python implementation above, not JS outputs.
const pythonCases = JSON.parse(
  readFileSync(new URL("../fixtures/pet_steady_python.json", import.meta.url)),
);
test.each(pythonCases)(
  "Python parameter regression #%#",
  ({ inputs, outputs }) => {
    expect(callPet(inputs)).toEqual(outputs);
  },
);
test("broadcasts singleton axes and personal parameters", () => {
  const result = pet_steady(
    [[25], [30]],
    25,
    0.1,
    50,
    1.2,
    0.5,
    1013.25,
    ["sitting", "standing"],
    23,
    ["male", "female"],
  );
  expect(result.pet).toEqual([
    [24.67, 24.7],
    [28.15, 28.18],
  ]);
});
test.each([[[]], [[[25], [25, 30]]]])(
  "rejects empty or ragged arrays %#",
  (tdb) => {
    expect(() => pet_steady(tdb, 25, 0.1, 50, 1.2, 0.5)).toThrow(RangeError);
  },
);
test("rejects incompatible shapes", () => {
  expect(() => pet_steady([25, 30], [25, 30, 35], 0.1, 50, 1.2, 0.5)).toThrow(
    RangeError,
  );
});
test.each([
  ["position", 1],
  ["position", "lying"],
  ["sex", 1],
  ["sex", "other"],
  ["age", "23"],
  ["p_atm", "1013.25"],
  ["weight", null],
  ["height", {}],
  ["wme", "0"],
])("rejects invalid %s=%p", (name, value) => {
  expect(() =>
    callPet({
      tdb: 25,
      tr: 25,
      v: 0.1,
      rh: 50,
      met: 1.2,
      clo: 0.5,
      [name]: value,
    }),
  ).toThrow();
});
