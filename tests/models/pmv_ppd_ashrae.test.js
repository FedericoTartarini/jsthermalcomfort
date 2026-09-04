// Validation data loaded from the shared validation-data-comfort-models
// repository via the same URL-based mechanism as the original pmv_ppd.test.js.
import { describe, expect, test } from "@jest/globals";
import { pmv_ppd_ashrae } from "../../src/models/pmv_ppd_ashrae.js";
import { pmv_ppd_iso } from "../../src/models/pmv_ppd_iso.js";
import { classifyFromBins } from "../../src/models/classifierBins.js";
import {
  PMV_THERMAL_SENSATION_VOTE_BINS_ISO,
  PMV_THERMAL_SENSATION_VOTE_BINS_ASHRAE,
} from "../../src/models/pmv_ppd.js";
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
// Intentional divergence between ISO and ASHRAE (pythermalcomfort#382)
// ---------------------------------------------------------------------------
describe("ISO vs ASHRAE TSV interval convention (pythermalcomfort#382)", () => {
  // The two models share identical bin edges and labels but opposite interval
  // conventions: ISO is left-inclusive, ASHRAE is right-inclusive. Classify the
  // SAME value under both bin sets so the convention is the only variable —
  // going through the models instead would confound this with the fact that
  // ASHRAE applies a cooling effect and therefore computes a different PMV.
  test.each([-2.5, -1.5, -0.5, 0.5, 1.5, 2.5])(
    "pmv = %s is labelled differently by the two conventions",
    (pmv) => {
      const iso = classifyFromBins(pmv, PMV_THERMAL_SENSATION_VOTE_BINS_ISO);
      const ashrae = classifyFromBins(
        pmv,
        PMV_THERMAL_SENSATION_VOTE_BINS_ASHRAE,
      );
      expect(iso).not.toBe(ashrae);
    },
  );

  test("at pmv = -1.5 exactly, ISO says Slightly Cool and ASHRAE says Cool", () => {
    // ISO is left-inclusive, so -1.5 opens the [-1.5, -0.5) bin -> "Slightly Cool".
    // ASHRAE is right-inclusive, so -1.5 closes the (-2.5, -1.5] bin -> "Cool".
    expect(classifyFromBins(-1.5, PMV_THERMAL_SENSATION_VOTE_BINS_ISO)).toBe(
      "Slightly Cool",
    );
    expect(classifyFromBins(-1.5, PMV_THERMAL_SENSATION_VOTE_BINS_ASHRAE)).toBe(
      "Cool",
    );
  });

  test("the two models can also disagree end-to-end, for a separate reason", () => {
    // Here the labels differ because ASHRAE's cooling effect (vr = 0.5) makes it
    // compute a DIFFERENT pmv from ISO -- not because of the interval convention.
    // Recorded so the two causes of divergence are not conflated.
    const iso = pmv_ppd_iso(22.5, 22.5, 0.5, 50, 1.2, 0.5, 0, {
      limit_inputs: false,
    });
    const ashrae = pmv_ppd_ashrae(22.5, 22.5, 0.5, 50, 1.2, 0.5, 0, {
      limit_inputs: false,
    });
    expect(iso.pmv).toBe(-1.52);
    expect(iso.tsv).toBe("Cool");
    expect(ashrae.pmv).toBe(-1.5);
    expect(ashrae.tsv).toBe("Slightly Cool");
  });
});
