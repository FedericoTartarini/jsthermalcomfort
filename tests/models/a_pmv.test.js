import { describe, test } from "@jest/globals";
import { pmv_a, a_pmv } from "../../src/models/a_pmv.js";
import {
  pmv_a as pmv_a_from_models,
  a_pmv as a_pmv_from_models,
} from "../../src/models/index.js";
import {
  pmv_a as pmv_a_from_root,
  a_pmv as a_pmv_from_root,
} from "../../src/index.js";
import { testDataUrls } from "./comftest";
import { loadTestData, validateResult } from "./testUtils"; // Use the utils

let returnArray = false;

// use top-level await to load test data before tests are defined.
let { testData, tolerances } = await loadTestData(
  testDataUrls.aPmv,
  returnArray,
);

describe("pmv_a", () => {
  // automatically number each test case
  test.each(testData.data)("test_a_pmv - reference case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { tdb, tr, vr, rh, met, clo, a_coefficient, wme } = inputs;

    const modelResult = pmv_a(tdb, tr, vr, rh, met, clo, a_coefficient, wme);

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });
});

// ---------------------------------------------------------------------------
// Input validation tests
// ---------------------------------------------------------------------------
describe("pmv_a input validation", () => {
  test.each([
    ["tdb", "25", 25, 0.1, 50, 1.2, 0.5, 0.293],
    ["tr", 25, "25", 0.1, 50, 1.2, 0.5, 0.293],
    ["vr", 25, 25, "0.1", 50, 1.2, 0.5, 0.293],
    ["rh", 25, 25, 0.1, "50", 1.2, 0.5, 0.293],
    ["met", 25, 25, 0.1, 50, "1.2", 0.5, 0.293],
    ["clo", 25, 25, 0.1, 50, 1.2, "0.5", 0.293],
    ["a_coefficient", 25, 25, 0.1, 50, 1.2, 0.5, "0.293"],
    ["wme", 25, 25, 0.1, 50, 1.2, 0.5, 0.293, "0"],
  ])("throws TypeError if %s is not a number", (_, ...args) => {
    expect(() => pmv_a(...args)).toThrow(TypeError);
  });

  // Mirrors pythermalcomfort test_a_pmv_wrong_input_type. pythermalcomfort
  // raises ValueError for invalid units; validateInputs throws Error.
  test("test_a_pmv_wrong_input_type", () => {
    expect(() => pmv_a("25", 25, 0.1, 50, 1.2, 0.5, 7)).toThrow(TypeError);
    expect(() =>
      pmv_a(25, 25, 0.1, 50, 1.2, 0.5, 7, undefined, { units: "celsius" }),
    ).toThrow(Error);
  });

  // Mirrors pythermalcomfort test_not_valid_units.
  test("test_not_valid_units", () => {
    expect(() =>
      pmv_a(25, 25, 0.1, 50, 1.2, 0.5, 7, undefined, { units: "wrong" }),
    ).toThrow(Error);
  });

  test("throws TypeError if limit_inputs is not a boolean", () => {
    expect(() =>
      pmv_a(25, 25, 0.1, 50, 1.2, 0.5, 0.293, 0, { limit_inputs: "true" }),
    ).toThrow(TypeError);
  });
});

// ---------------------------------------------------------------------------
// Applicability limits tests
// ---------------------------------------------------------------------------
describe("pmv_a applicability limits", () => {
  test("returns NaN by default when inputs are outside the ISO 7730 limits", () => {
    // tdb = 5 °C is below the ISO 7730 lower limit of 10 °C. Without kwargs,
    // limit_inputs must default to true rather than being passed as undefined.
    expect(pmv_a(5, 25, 0.1, 50, 1.2, 0.5, 0.293).a_pmv).toBeNaN();
    expect(
      Number.isFinite(
        pmv_a(5, 25, 0.1, 50, 1.2, 0.5, 0.293, 0, { limit_inputs: false })
          .a_pmv,
      ),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests for the renamed function and backwards-compatible alias
// ---------------------------------------------------------------------------
describe("pmv_a (renamed function)", () => {
  test("pmv_a and a_pmv are the same function", () => {
    expect(pmv_a).toBe(a_pmv);
  });

  test("pmv_a is exported from models/index.js", () => {
    expect(pmv_a_from_models).toBe(pmv_a);
  });

  test("a_pmv alias is exported from models/index.js", () => {
    expect(a_pmv_from_models).toBe(a_pmv);
  });

  test("both names are exported from package root (src/index.js)", () => {
    expect(pmv_a_from_root).toBe(pmv_a);
    expect(a_pmv_from_root).toBe(a_pmv);
  });
});
