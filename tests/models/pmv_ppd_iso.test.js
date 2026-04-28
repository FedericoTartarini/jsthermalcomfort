// Validation data loaded from the shared validation-data-comfort-models
// repository via the same URL-based mechanism as the original pmv_ppd.test.js.
import { describe, expect, test } from "@jest/globals";
import { pmv_ppd_iso } from "../../src/models/pmv_ppd_iso.js";
import { testDataUrls } from "./comftest";
import { loadTestData, validateResult } from "./testUtils.js";

// Load test data from the shared repository (filters out array-input rows).
let { testData, tolerances } = await loadTestData(testDataUrls.pmvPpd, false);

// Keep only scalar SI ISO rows.
const isoData = testData.data.filter((testCase) => {
  const { standard, units } = testCase.inputs;
  const isISO = standard === "ISO";
  const isSI = !units || units.toLowerCase() === "si";
  return isISO && isSI;
});

describe("pmv_ppd_iso", () => {
  test.each(isoData)("ISO test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { tdb, tr, vr, rh, met, clo, wme, limit_inputs } = inputs;

    // Pass limit_inputs through kwargs so rows with limit_inputs=false
    // are handled correctly.
    const kwargs = { limit_inputs };

    const modelResult = pmv_ppd_iso(tdb, tr, vr, rh, met, clo, wme, kwargs);

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });

  // Supplementary boundary test — not present in the shared validation data.
  // tdb=35°C exceeds the ISO 7730 valid range (10–30°C), so NaN is expected.
  test("out-of-range inputs should return NaN under ISO standard", () => {
    const result = pmv_ppd_iso(35, 35, 0.5, 80, 2.0, 0.3);
    expect(result.pmv).toBeNaN();
    expect(result.ppd).toBeNaN();
  });
});

// ---------------------------------------------------------------------------
// Input validation tests
// ---------------------------------------------------------------------------
describe("pmv_ppd_iso input validation", () => {
  test.each([
    ["tdb", "25", 25, 0.1, 50, 1.2, 0.5],
    ["tr", 25, "25", 0.1, 50, 1.2, 0.5],
    ["vr", 25, 25, "0.1", 50, 1.2, 0.5],
    ["rh", 25, 25, 0.1, "50", 1.2, 0.5],
    ["met", 25, 25, 0.1, 50, "1.2", 0.5],
    ["clo", 25, 25, 0.1, 50, 1.2, "0.5"],
    ["wme", 25, 25, 0.1, 50, 1.2, 0.5, "0"],
  ])("throws TypeError if %s is not a number", (_, ...args) => {
    expect(() => pmv_ppd_iso(...args)).toThrow(TypeError);
  });

  test("throws Error if kwargs.units is not a valid enum", () => {
    expect(() =>
      pmv_ppd_iso(25, 25, 0.1, 50, 1.2, 0.5, 0, { units: "INVALID" }),
    ).toThrow(Error);
  });

  test("throws TypeError if kwargs.limit_inputs is not a boolean", () => {
    expect(() =>
      pmv_ppd_iso(25, 25, 0.1, 50, 1.2, 0.5, 0, { limit_inputs: "true" }),
    ).toThrow(TypeError);
  });

  test("throws TypeError if kwargs.round_output is not a boolean", () => {
    expect(() =>
      pmv_ppd_iso(25, 25, 0.1, 50, 1.2, 0.5, 0, { round_output: "true" }),
    ).toThrow(TypeError);
  });
});
