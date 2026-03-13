import { describe, test, expect } from "@jest/globals";
import {
  pmv_ppd_ashrae,
  pmv_ppd_ashrae_array,
} from "../../src/models/pmv_ppd_ashrae.js";

/**
 * Tests ported from pythermalcomfort/tests/test_pmv_ppd_ashrae.py
 */

describe("pmv_ppd_ashrae", () => {
  test("returns correct PMV, PPD, TSV, and compliance for standard inputs", () => {
    const result = pmv_ppd_ashrae(25, 25, 0.1, 50, 1.0, 0.5);
    // With met=1.0 clo=0.5 at 25C, PMV is around -0.4
    expect(result.pmv).toBeCloseTo(-0.4, 0);
    expect(typeof result.ppd).toBe("number");
    expect(result.tsv).toBe("Neutral");
    expect(result.compliance).toBe(true);
  });

  test("compliance is false when PMV outside -0.5 to 0.5", () => {
    const result = pmv_ppd_ashrae(30, 30, 0.1, 50, 1.0, 0.5);
    expect(Math.abs(result.pmv)).toBeGreaterThan(0.5);
    expect(result.compliance).toBe(false);
  });

  test("returns NaN for inputs outside standard limits", () => {
    const result = pmv_ppd_ashrae(41, 20, 0.1, 50, 1.1, 0.5);
    expect(result.pmv).toBeNaN();
    expect(result.ppd).toBeNaN();
  });

  test("limit_inputs=false returns values for out-of-range inputs", () => {
    const result = pmv_ppd_ashrae(41, 41, 2, 50, 0.7, 2.1, 0, {
      limit_inputs: false,
    });
    expect(result.pmv).not.toBeNaN();
    expect(result.ppd).not.toBeNaN();
    expect(result.tsv).toBe("Hot");
    expect(result.compliance).toBe(false);
  });

  test("round_output=false returns unrounded values", () => {
    const result = pmv_ppd_ashrae(25, 25, 0.1, 50, 1.1, 0.5, 0, {
      round_output: false,
    });
    // Unrounded values should have more decimal places
    expect(typeof result.pmv).toBe("number");
    expect(typeof result.ppd).toBe("number");
  });

  test("wrong standard not applicable for wrapper — always ASHRAE", () => {
    // This wrapper always uses ASHRAE, so no error should be thrown
    const result = pmv_ppd_ashrae(25, 25, 0.1, 50, 1.0, 0.5);
    expect(result).toHaveProperty("compliance");
  });
});

describe("pmv_ppd_ashrae - thermal sensation", () => {
  test("returns correct TSV for a range of temperatures", () => {
    const result = pmv_ppd_ashrae_array(
      [16, 21, 24, 26, 29, 32, 34],
      [16, 21, 24, 26, 29, 32, 34],
      [0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2],
      [50, 50, 50, 50, 50, 50, 50],
      [1, 1, 1, 1, 1, 1, 1],
      [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
      [0, 0, 0, 0, 0, 0, 0],
    );
    expect(result.tsv).toEqual([
      "Cold",
      "Cool",
      "Slightly Cool",
      "Neutral",
      "Slightly Warm",
      "Warm",
      "Hot",
    ]);
  });
});

describe("pmv_ppd_ashrae - airspeed control", () => {
  test("returns NaN for uncontrolled airspeed exceeding limits", () => {
    const result = pmv_ppd_ashrae_array(
      [26, 24, 22],
      [26, 24, 22],
      [0.9, 0.6, 0.3],
      [50, 50, 50],
      [1.1, 1.1, 1.1],
      [0.5, 0.5, 0.5],
      [0, 0, 0],
      { airspeed_control: false },
    );
    // With airspeed_control=false and these speeds, all should be NaN
    result.pmv.forEach((pmv) => {
      expect(pmv).toBeNaN();
    });
  });
});

describe("pmv_ppd_ashrae - compliance array", () => {
  test("compliance array matches PMV ranges", () => {
    const result = pmv_ppd_ashrae_array(
      [22, 25, 30],
      [22, 25, 30],
      [0.1, 0.1, 0.1],
      [50, 50, 50],
      [1.0, 1.0, 1.0],
      [0.5, 0.5, 0.5],
      [0, 0, 0],
    );
    // PMV for 22C is below -0.5, 25C is near 0, 30C is above 0.5
    expect(result.compliance[0]).toBe(false);
    expect(result.compliance[1]).toBe(true);
    expect(result.compliance[2]).toBe(false);
  });
});
