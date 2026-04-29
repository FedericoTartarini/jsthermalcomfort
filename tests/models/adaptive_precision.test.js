import { describe, test, expect } from "@jest/globals";
import { adaptive_ashrae } from "../../src/models/adaptive_ashrae";
import { adaptive_en } from "../../src/models/adaptive_en";

describe("Adaptive High-Precision Contract Tests (CBE Tool Parity)", () => {
  /**
   * ASHRAE 55 Case: 15.1 prevailing mean, 25.1 operative, 0.6 air speed
   *
   * - Base 90% Limit = 0.31 * 15.1 + 17.8 + 2.5 = 24.981
   * - Trigger: Base 90% Limit > 25.0
   * - Result: 24.981 <= 25.0, so NO boost applied.
   * - Status: Too Warm (25.1 > 24.981)
   */
  test("ASHRAE 55: 15.1/25.1/0.6 should be Too Warm (Parity with CBE Tool)", () => {
    const result = adaptive_ashrae(25.1, 25.1, 15.1, 0.6, "SI", true, {
      round_output: false,
    });

    // Logic check: acceptability should be false
    expect(result.acceptability_90).toBe(false);

    // Value check: limit should NOT be rounded here
    expect(result.tmp_cmf_90_up).toBeLessThan(25.0);
  });

  test("ASHRAE 55: 15.2/25.1/0.6 should be Comfortable (Parity with CBE Tool)", () => {
    const result = adaptive_ashrae(25.1, 25.1, 15.2, 0.6, "SI", true, {
      round_output: false,
    });

    // Base limit = 0.31 * 15.2 + 17.8 + 2.5 = 25.012 > 25.0
    expect(result.acceptability_90).toBe(true);
    expect(result.tmp_cmf_90_up).toBeGreaterThan(26.2);
  });

  /**
   * EN 16798 Case: 12.7 running mean, 25.1 operative, 0.6 air speed
   *
   * - Base Cat I Limit = 0.33 * 12.7 + 18.8 + 2.0 = 24.991
   * - Trigger: Base Limit > 25.0
   * - Result: 24.991 <= 25.0, so NO boost applied.
   * - Status: Too Warm (25.1 > 24.991)
   */
  test("EN 16798: 12.7/25.1/0.6 should be Too Warm (Parity with CBE Tool)", () => {
    const result = adaptive_en(25.1, 25.1, 12.7, 0.6, "SI", true, {
      round_output: false,
    });

    expect(result.acceptability_cat_i).toBe(false);
    expect(result.tmp_cmf_cat_i_up).toBeLessThan(25.0);
  });

  test("EN 16798: 12.8/25.1/0.6 should be Comfortable (Parity with CBE Tool)", () => {
    const result = adaptive_en(25.1, 25.1, 12.8, 0.6, "SI", true, {
      round_output: false,
    });

    // Base limit = 0.33 * 12.8 + 18.8 + 2.0 = 25.024 > 25.0
    expect(result.acceptability_cat_i).toBe(true);
    expect(result.tmp_cmf_cat_i_up).toBeGreaterThan(26.2);
  });
});
