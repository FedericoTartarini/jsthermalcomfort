// Validation data loaded from the shared validation-data-comfort-models
// repository via the same URL-based mechanism as the original pmv_ppd.test.js.
import { describe, expect, test } from "@jest/globals";
import { pmv_ppd_ashrae } from "../../src/models/pmv_ppd_ashrae.js";
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

describe("pmv_ppd_ashrae tsv and compliance", () => {
  test.each([
    [-2.5, "Cold"],
    [-1.5, "Cool"],
    [-0.5, "Slightly Cool"],
    [0.5, "Neutral"],
    [1.5, "Slightly Warm"],
    [2.5, "Warm"],
    [10, "Hot"],
    [-0.499, "Neutral"],
    [0.501, "Slightly Warm"],
  ])("ASHRAE tsv(%p) is %p (right-closed)", (pmv, expected) => {
    expect(pmv_ppd_ashrae.tsv(pmv)).toBe(expected);
  });

  test.each([
    [-0.5, false],
    [0.5, false],
    [0, true],
    [-0.499, true],
    [0.499, true],
  ])("ASHRAE compliance(%p) is %p (open interval)", (pmv, expected) => {
    expect(pmv_ppd_ashrae.compliance(pmv)).toBe(expected);
  });

  test.each([[NaN], [Infinity], [-Infinity]])(
    "non-finite PMV %p yields NaN tsv and compliance",
    (pmv) => {
      expect(pmv_ppd_ashrae.tsv(pmv)).toBeNaN();
      expect(pmv_ppd_ashrae.compliance(pmv)).toBeNaN();
    },
  );

  test("result uses Python field names tsv and compliance", () => {
    const result = pmv_ppd_ashrae(25, 25, 0.1, 50, 1.2, 0.5);
    expect(result).toHaveProperty("tsv");
    expect(result).toHaveProperty("compliance");
    expect(result).not.toHaveProperty("acceptability");
    expect(result.tsv).toBe("Neutral");
    expect(result.compliance).toBe(true);
  });

  test("ASHRAE tsv is NaN above Python's last thermal_sensation key", () => {
    expect(pmv_ppd_ashrae.tsv(10.001)).toBeNaN();
  });

  test("compliance uses unrounded PMV; tsv uses returned (rounded) PMV", () => {
    // Unrounded PMV is 0.497..., which is inside (-0.5, 0.5); rounding to 2
    // decimals yields 0.50, which would fail the open interval.
    const args = [25.9, 25.9, 0.1, 50, 1.1, 0.7];
    const raw = pmv_ppd_ashrae(...args, 0, { round_output: false });
    const rounded = pmv_ppd_ashrae(...args);

    expect(raw.pmv).toBeGreaterThan(0.495);
    expect(raw.pmv).toBeLessThan(0.5);
    expect(rounded.pmv).toBe(0.5);
    expect(rounded.compliance).toBe(true);
    expect(pmv_ppd_ashrae.compliance(rounded.pmv)).toBe(false);
    expect(rounded.compliance).toBe(pmv_ppd_ashrae.compliance(raw.pmv));
    expect(rounded.tsv).toBe(pmv_ppd_ashrae.tsv(rounded.pmv));
  });
});
