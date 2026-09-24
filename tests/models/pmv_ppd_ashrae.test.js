// Validation data loaded from the shared validation-data-comfort-models
// repository via the same URL-based mechanism as the original pmv_ppd.test.js.
import { afterEach, describe, expect, jest, test } from "@jest/globals";
import { pmv_ppd_ashrae } from "../../src/models/pmv_ppd_ashrae.js";
import { pmv_ppd_iso } from "../../src/models/pmv_ppd_iso.js";
import { classifyFromBins } from "../../src/models/classifierBins.ts";
import {
  PMV_THERMAL_SENSATION_VOTE_BINS_ISO,
  PMV_THERMAL_SENSATION_VOTE_BINS_ASHRAE,
} from "../../src/models/pmv_ppd.ts";
import { testDataUrls } from "./comftest";
import { Standard } from "../../src/utilities/utilities.js";
import {
  assertNonEmptyRows,
  loadTestData,
  validateResult,
} from "./testUtils.ts";

// Load test data from the shared repository (array rows run element-wise).
let { testData, tolerances } = await loadTestData(testDataUrls.pmvPpd, false);

// Keep the ASHRAE rows, SI and IP alike.
const ashraeData = assertNonEmptyRows(
  testData.data.filter(({ inputs }) => inputs.standard === "ASHRAE"),
  "pmv_ppd_ashrae ASHRAE rows",
);

describe("pmv_ppd_ashrae", () => {
  test.each(ashraeData)("ASHRAE test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    // The row's remaining keys (units, limit_inputs, airspeed_control) become
    // the options, as upstream's `pmv_ppd_ashrae(**inputs)`. Only the keys a
    // row carries: an explicit `limit_inputs: undefined` would override the
    // model's default.
    const { tdb, tr, vr, rh, met, clo, wme, standard, ...kwargs } = inputs;

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

  test("throws TypeError if kwargs.suppress_warnings is not a boolean", () => {
    expect(() =>
      pmv_ppd_ashrae(25, 25, 0.1, 50, 1.2, 0.5, 0, {
        suppress_warnings: "true",
      }),
    ).toThrow(TypeError);
  });
});

describe("pmv_ppd_ashrae suppress_warnings", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // At 45 °C and 90 % RH the cooling effect falls back to 0 with a warning.
  test("passes the switch through to the cooling effect", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    pmv_ppd_ashrae(45, 45, 0.5, 90, 1.2, 0.5, 0, { suppress_warnings: true });
    expect(warn).not.toHaveBeenCalled();
    pmv_ppd_ashrae(45, 45, 0.5, 90, 1.2, 0.5, 0);
    expect(warn).toHaveBeenCalledTimes(1);
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

  // This test used to assert the opposite: tsv from the unrounded pmv whatever
  // round_output was. Upstream classifies the pmv it returns, after rounding
  // (pmv_ppd_ashrae.py in 4.6.0), so the label never disagrees with the number
  // shown. Expected values from pythermalcomfort 4.6.0 at these inputs.
  test("tsv is classified from the pmv returned, rounded or not", () => {
    // pmv ≈ 0.5044, just above the 0.5 edge. ASHRAE is right-inclusive, so
    // the rounded 0.5 closes (-0.5, 0.5] = "Neutral", while the unrounded
    // value falls in (0.5, 1.5] = "Slightly Warm".
    const result_rounded = pmv_ppd_ashrae(26.4, 26.4, 0.1, 50, 1.2, 0.5, 0, {
      round_output: true,
      limit_inputs: false,
    });
    const result_unrounded = pmv_ppd_ashrae(26.4, 26.4, 0.1, 50, 1.2, 0.5, 0, {
      round_output: false,
      limit_inputs: false,
    });
    expect(result_rounded.pmv).toBe(0.5);
    expect(result_rounded.tsv).toBe("Neutral");
    expect(result_unrounded.pmv).toBeGreaterThan(0.5);
    expect(result_unrounded.tsv).toBe("Slightly Warm");
  });

  // Test specific TSV values
  test("neutral comfort (pmv ~0) -> Neutral", () => {
    const result = pmv_ppd_ashrae(25, 25, 0.1, 50, 1.2, 0.5);
    expect(result.tsv).toBe("Neutral");
  });

  test("warm comfort (pmv ~1) -> Slightly Warm", () => {
    // tdb=26.4 used to be asserted "Slightly Warm" here from its unrounded
    // pmv ≈ 0.5044; rounded by default to 0.5, it is "Neutral" (the test
    // above), as upstream classifies the rounded pmv. tdb=27 gives pmv ≈ 0.68,
    // inside the right-inclusive interval (0.5, 1.5] = "Slightly Warm" (ASHRAE).
    // This test verifies the exact classification, not a set of possibilities,
    // so that rounding errors or classification bugs are caught.
    const result = pmv_ppd_ashrae(27, 27, 0.1, 50, 1.2, 0.5, 0, {
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
    // Here the pmvs differ because ASHRAE's cooling effect (vr = 0.5) makes it
    // compute a DIFFERENT pmv from ISO -- not because of the interval convention.
    // Recorded so the two causes of divergence are not conflated. The labels
    // used to differ too, while ASHRAE classified its unrounded pmv (just above
    // -1.5); classified from the rounded -1.5, as upstream does, the
    // right-inclusive (-2.5, -1.5] bin makes it "Cool" like ISO's -1.52.
    const iso = pmv_ppd_iso(
      22.5,
      22.5,
      0.5,
      50,
      1.2,
      0.5,
      0,
      Standard.iso_7730_2025,
      {
        limit_inputs: false,
      },
    );
    const ashrae = pmv_ppd_ashrae(22.5, 22.5, 0.5, 50, 1.2, 0.5, 0, {
      limit_inputs: false,
    });
    expect(iso.pmv).toBe(-1.52);
    expect(iso.tsv).toBe("Cool");
    expect(ashrae.pmv).toBe(-1.5);
    expect(ashrae.tsv).toBe("Cool");
  });
});
