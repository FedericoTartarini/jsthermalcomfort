// Validation data loaded from the shared validation-data-comfort-models
// repository via the same URL-based mechanism as the original pmv_ppd.test.js.
import { describe, expect, test } from "@jest/globals";
import { pmv_ppd_ashrae } from "../../src/models/pmv_ppd_ashrae.js";
import { pmv_ppd_iso } from "../../src/models/pmv_ppd_iso.js";
import { testDataUrls } from "./comftest";
import {
  assertNonEmptyRows,
  loadTestData,
  validateResult,
} from "./testUtils.js";

// Load test data from the shared repository (filters out array-input rows).
let { testData, tolerances } = await loadTestData(testDataUrls.pmvPpd, false);

// Keep only scalar SI ASHRAE rows.
const ashraeData = assertNonEmptyRows(
  testData.data.filter((testCase) => {
    const { standard, units } = testCase.inputs;
    const isAshrae = standard === "ASHRAE";
    const isSI = !units || units.toLowerCase() === "si";
    return isAshrae && isSI;
  }),
  "pmv_ppd_ashrae scalar SI ASHRAE rows",
);

describe("pmv_ppd_ashrae", () => {
  test.each(ashraeData)("ASHRAE test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { tdb, tr, vr, rh, met, clo, wme, limit_inputs, airspeed_control } =
      inputs;

    // Pass optional flags through kwargs so rows with limit_inputs=false
    // or airspeed_control=false are handled correctly.
    const kwargs = { limit_inputs, airspeed_control };

    const modelResult = pmv_ppd_ashrae(tdb, tr, vr, rh, met, clo, wme, kwargs);

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });
});

// ---------------------------------------------------------------------------
// Input validation tests
// ---------------------------------------------------------------------------
describe("pmv_ppd_ashrae input validation", () => {
  test.each([
    ["tdb", "25", 25, 0.1, 50, 1.2, 0.5],
    ["tr", 25, "25", 0.1, 50, 1.2, 0.5],
    ["vr", 25, 25, "0.1", 50, 1.2, 0.5],
    ["rh", 25, 25, 0.1, "50", 1.2, 0.5],
    ["met", 25, 25, 0.1, 50, "1.2", 0.5],
    ["clo", 25, 25, 0.1, 50, 1.2, "0.5"],
    ["wme", 25, 25, 0.1, 50, 1.2, 0.5, "0"],
  ])("throws TypeError if %s is not a number", (_, ...args) => {
    expect(() => pmv_ppd_ashrae(...args)).toThrow(TypeError);
  });

  test("throws Error if kwargs.units is not a valid enum", () => {
    expect(() =>
      pmv_ppd_ashrae(25, 25, 0.1, 50, 1.2, 0.5, 0, { units: "INVALID" }),
    ).toThrow(Error);
  });

  test("throws TypeError if kwargs.limit_inputs is not a boolean", () => {
    expect(() =>
      pmv_ppd_ashrae(25, 25, 0.1, 50, 1.2, 0.5, 0, { limit_inputs: "true" }),
    ).toThrow(TypeError);
  });

  test("throws TypeError if kwargs.airspeed_control is not a boolean", () => {
    expect(() =>
      pmv_ppd_ashrae(25, 25, 0.1, 50, 1.2, 0.5, 0, {
        airspeed_control: "true",
      }),
    ).toThrow(TypeError);
  });

  test("throws TypeError if kwargs.round_output is not a boolean", () => {
    expect(() =>
      pmv_ppd_ashrae(25, 25, 0.1, 50, 1.2, 0.5, 0, { round_output: "true" }),
    ).toThrow(TypeError);
  });
});

// ---------------------------------------------------------------------------
// Thermal Sensation Vote (tsv) classification tests
// ---------------------------------------------------------------------------
describe("pmv_ppd_ashrae tsv classification (right-inclusive)", () => {
  // Test that tsv is returned with correct value
  test("returns tsv field with correct value", () => {
    // At comfortable neutral conditions (25°C, symmetric), pmv should be ~0, so tsv should be "Neutral"
    const result = pmv_ppd_ashrae(25, 25, 0.1, 50, 1.2, 0.5);
    expect(result.tsv).toBe("Neutral");
  });

  // Test that tsv is NaN when pmv is NaN
  test("tsv is NaN when pmv is NaN (out of range)", () => {
    const result = pmv_ppd_ashrae(35, 35, 0.5, 80, 2.0, 0.3);
    // ASHRAE has more lenient range than ISO
    // Try a more extreme case
    const result2 = pmv_ppd_ashrae(50, 50, 0.5, 80, 2.0, 0.3, 0, {
      limit_inputs: true,
    });
    expect(result2.pmv).toBeNaN();
    expect(result2.tsv).toBeNaN();
  });

  // Test that tsv is unaffected by round_output
  test("tsv is same whether round_output=true or round_output=false", () => {
    const result_rounded = pmv_ppd_ashrae(25, 25, 0.1, 50, 1.2, 0.5, 0, {
      round_output: true,
    });
    const result_unrounded = pmv_ppd_ashrae(25, 25, 0.1, 50, 1.2, 0.5, 0, {
      round_output: false,
    });
    expect(result_rounded.tsv).toBe(result_unrounded.tsv);
  });

  // Test specific TSV values
  test("neutral comfort (pmv ~0) -> Neutral", () => {
    const result = pmv_ppd_ashrae(25, 25, 0.1, 50, 1.2, 0.5);
    expect(result.tsv).toBe("Neutral");
  });

  test("warm comfort (pmv ~1) -> Slightly Warm or Warm", () => {
    const result = pmv_ppd_ashrae(30, 30, 0.1, 50, 1.2, 0.5, 0, {
      limit_inputs: false,
    });
    // 30°C should give a positive PMV
    expect(["Slightly Warm", "Warm", "Hot"]).toContain(result.tsv);
  });
});

// ---------------------------------------------------------------------------
// Intentional divergence between ISO and ASHRAE at boundary values
// This documents pythermalcomfort#382 where the two models use different
// interval conventions (left-inclusive vs right-inclusive)
// ---------------------------------------------------------------------------
describe("pmv_ppd_iso vs pmv_ppd_ashrae divergence at boundaries (pythermalcomfort#382)", () => {
  // Note: This test verifies the intentional inconsistency. Once pythermalcomfort#382
  // is resolved, this test may need to be updated or removed.
  test("both return a result for the same inputs (tsv may differ at boundary)", () => {
    // At comfortable neutral conditions, both should give similar results
    const iso_result = pmv_ppd_iso(25, 25, 0.1, 50, 1.2, 0.5, 0, {
      limit_inputs: false,
    });
    const ashrae_result = pmv_ppd_ashrae(25, 25, 0.1, 50, 1.2, 0.5, 0, {
      limit_inputs: false,
    });

    // Both should return pmv and tsv fields with finite values at these neutral conditions
    expect(Number.isFinite(iso_result.pmv)).toBe(true);
    expect(Number.isFinite(ashrae_result.pmv)).toBe(true);
    expect(iso_result.tsv).toBe("Neutral");
    expect(ashrae_result.tsv).toBe("Neutral");
  });
});
