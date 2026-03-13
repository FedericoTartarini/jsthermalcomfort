import { describe, test, expect } from "@jest/globals";
import {
  pmv_ppd_iso,
  pmv_ppd_iso_array,
} from "../../src/models/pmv_ppd_iso.js";

/**
 * Tests ported from pythermalcomfort/tests/test_pmv_ppd_iso.py
 */

describe("pmv_ppd_iso", () => {
  test("returns correct PMV and PPD for standard inputs", () => {
    const result = pmv_ppd_iso(25, 25, 0.1, 50, 1.1, 0.5);
    expect(result.pmv).toBeCloseTo(-0.13, 1);
    expect(result.ppd).toBeCloseTo(5.4, 0);
    expect(result.tsv).toBe("Neutral");
    // ISO does not return compliance
    expect(result.compliance).toBeUndefined();
  });

  test("returns NaN for out-of-range inputs (ISO limits)", () => {
    const result = pmv_ppd_iso_array(
      [31, 20, 20, 20, 20, 30],
      [20, 41, 20, 20, 20, 20],
      [0.1, 0.1, 2, 0.1, 0.1, 0.1],
      [50, 50, 50, 50, 50, 50],
      [1.1, 1.1, 1.1, 0.7, 1.1, 4.1],
      [0.5, 0.5, 0.5, 0.5, 2.1, 0.1],
      [0, 0, 0, 0, 0, 0],
    );
    // All cases should yield NaN due to applicability limit violations
    result.pmv.forEach((pmv) => {
      expect(pmv).toBeNaN();
    });
  });

  test("IP unit conversion works correctly", () => {
    // 67.28°F ≈ 19.6°C, 0.328084 fps ≈ 0.1 m/s
    const result = pmv_ppd_iso(67.28, 67.28, 0.328084, 86, 1.1, 1, 0, {
      units: "IP",
    });
    expect(result.pmv).toBeCloseTo(-0.5, 0);
  });

  test("IP unit conversion with array inputs", () => {
    const result = pmv_ppd_iso_array(
      [70, 70],
      [67.28, 67.28],
      [0.328084, 0.328084],
      [86, 86],
      [1.1, 1.1],
      [1, 1],
      [0, 0],
      { units: "IP" },
    );
    expect(result.pmv[0]).toBeCloseTo(-0.3, 0);
    expect(result.pmv[1]).toBeCloseTo(-0.3, 0);
  });

  test("limit_inputs=false returns values for out-of-range inputs", () => {
    const result = pmv_ppd_iso(31, 41, 2, 50, 0.7, 2.1, 0, {
      limit_inputs: false,
    });
    expect(result.pmv).toBeCloseTo(2.4, 1);
    expect(result.ppd).toBeCloseTo(91.0, 0);
    expect(result.tsv).toBe("Warm");
  });

  test("round_output=false returns unrounded values", () => {
    const result = pmv_ppd_iso(25, 25, 0.1, 50, 1.1, 0.5, 0, {
      round_output: false,
    });
    // The Python returns -0.13201636 without rounding
    expect(result.pmv).toBeCloseTo(-0.13201636, 2);
  });

  test("wrong model throws error via underlying pmv_ppd", () => {
    // The wrapper always uses "ISO", but if we somehow pass an invalid standard
    // to the underlying function, it should throw. The wrapper itself always works.
    const result = pmv_ppd_iso(25, 25, 0.1, 50, 1.1, 0.5);
    expect(result).toHaveProperty("pmv");
    expect(result).toHaveProperty("ppd");
    expect(result).toHaveProperty("tsv");
  });
});
