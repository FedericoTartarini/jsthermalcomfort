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
    // ASHRAE has more lenient range than ISO, so try an extreme case
    const result = pmv_ppd_ashrae(50, 50, 0.5, 80, 2.0, 0.3, 0, {
      limit_inputs: true,
    });
    expect(result.pmv).toBeNaN();
    expect(result.tsv).toBeNaN();
  });

  // Test that tsv is unaffected by round_output
  test("tsv is same whether round_output=true or round_output=false", () => {
    // Using tdb=26.4, rh=50 produces pmv ≈ 0.5044 (just above the 0.5 bin edge).
    // ASHRAE is right-inclusive: (0.5, 1.5] = "Slightly Warm"
    // This tests that TSV is computed from the unrounded PMV, not the rounded one.
    // If a broken implementation rounded PMV to 0.50 before classifying, it would
    // place pmv=0.50 into the (-0.5, 0.5] bin as "Neutral" instead of the
    // correct (0.5, 1.5] bin as "Slightly Warm". This input verifies the
    // implementation uses the true unrounded value for classification.
    const result_rounded = pmv_ppd_ashrae(26.4, 26.4, 0.1, 50, 1.2, 0.5, 0, {
      round_output: true,
      limit_inputs: false,
    });
    const result_unrounded = pmv_ppd_ashrae(26.4, 26.4, 0.1, 50, 1.2, 0.5, 0, {
      round_output: false,
      limit_inputs: false,
    });
    expect(result_rounded.tsv).toBe(result_unrounded.tsv);
    // Both should classify in the "Slightly Warm" bin
    expect(result_rounded.tsv).toBe("Slightly Warm");
  });

  // Test specific TSV values
  test("neutral comfort (pmv ~0) -> Neutral", () => {
    const result = pmv_ppd_ashrae(25, 25, 0.1, 50, 1.2, 0.5);
    expect(result.tsv).toBe("Neutral");
  });

  test("warm comfort (pmv ~1) -> Slightly Warm", () => {
    // Using tdb=26.4, rh=50 produces pmv ≈ 0.5044, classifying into
    // the right-inclusive interval (0.5, 1.5] = "Slightly Warm" (ASHRAE).
    // This test verifies the exact classification, not a set of possibilities,
    // so that rounding errors or classification bugs are caught.
    const result = pmv_ppd_ashrae(26.4, 26.4, 0.1, 50, 1.2, 0.5, 0, {
      limit_inputs: false,
    });
    // Must be exactly "Slightly Warm", not one of three options
    expect(result.tsv).toBe("Slightly Warm");
  });
});

// ---------------------------------------------------------------------------
// Intentional divergence between ISO and ASHRAE at boundary values
// This documents pythermalcomfort#382 where the two models use different
// interval conventions (left-inclusive vs right-inclusive) and cooling effects
// ---------------------------------------------------------------------------
describe("pmv_ppd_iso vs pmv_ppd_ashrae divergence at boundaries (pythermalcomfort#382)", () => {
  // Note: This test documents genuine TSV divergence between ISO and ASHRAE.
  // The divergence occurs due to:
  // 1. Different bin interval conventions (ISO left-inclusive, ASHRAE right-inclusive)
  // 2. ASHRAE's cooling_effect adjustment (when vr > 0.1) that changes tdb/tr before PMV computation
  // At tdb=22.5, tr=22.5, vr=0.5, the cooling_effect causes ASHRAE to compute a different PMV
  // that lands in a different TSV category than ISO.
  test("ISO and ASHRAE return different TSV labels at boundary conditions", () => {
    // This input triggers ASHRAE's cooling_effect (vr=0.5 > 0.1):
    // - ISO computes PMV=-1.52, classifying as "Cool" (left-inclusive: -1.5 <= pmv < -0.5)
    // - ASHRAE computes PMV=-1.50, classifying as "Slightly Cool" (right-inclusive: -1.5 < pmv <= -0.5)
    // The different PMV values stem from ASHRAE's temperature adjustment via cooling_effect.
    const iso_result = pmv_ppd_iso(22.5, 22.5, 0.5, 50, 1.2, 0.5, 0, {
      limit_inputs: false,
    });
    const ashrae_result = pmv_ppd_ashrae(22.5, 22.5, 0.5, 50, 1.2, 0.5, 0, {
      limit_inputs: false,
    });

    expect(iso_result.pmv).toBe(-1.52);
    expect(iso_result.tsv).toBe("Cool");
    expect(ashrae_result.pmv).toBe(-1.5);
    expect(ashrae_result.tsv).toBe("Slightly Cool");
  });
});
