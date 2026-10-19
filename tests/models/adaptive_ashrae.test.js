import { describe, expect, test } from "@jest/globals";
import { adaptive_ashrae } from "../../src/models/adaptive_ashrae";
import { testDataUrls } from "./comftest";
import { loadTestData, validateResult } from "./testUtils";

const returnArray = false;

const { testData, tolerances } = await loadTestData(
  testDataUrls.adaptiveAshrae,
  returnArray,
);

describe("adaptive_ashrae", () => {
  test.each(testData.data)("test_adaptive_ashrae case %#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { tdb, tr, t_running_mean, v, units = "SI" } = inputs;
    const modelResult = adaptive_ashrae(tdb, tr, t_running_mean, v, units);

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });

  test("test_ashrae_inputs_invalid_units", () => {
    expect(() => adaptive_ashrae(25, 25, 20, 0.1, "INVALID")).toThrow(Error);
  });

  test("test_ashrae_inputs_invalid_tdb_type", () => {
    expect(() => adaptive_ashrae("invalid", 25, 20, 0.1)).toThrow(TypeError);
  });

  test("test_ashrae_inputs_invalid_tr_type", () => {
    expect(() => adaptive_ashrae(25, "invalid", 20, 0.1)).toThrow(TypeError);
  });

  test("test_ashrae_inputs_invalid_t_running_mean_type", () => {
    expect(() => adaptive_ashrae(25, 25, "invalid", 0.1)).toThrow(TypeError);
  });

  test("test_ashrae_inputs_invalid_v_type", () => {
    expect(() => adaptive_ashrae(25, 25, 20, "invalid")).toThrow(TypeError);
  });

  test("test_nan_values_for_invalid_inputs", () => {
    const result = adaptive_ashrae(5.0, 5.0, 5.0, 3.0, "SI", true);

    expect(result.tmp_cmf).toBeNaN();
    expect(result.acceptability_80).toBe(false);
    expect(result.acceptability_90).toBe(false);
  });

  test("test_round_output_default_preserves_behaviour", () => {
    const defaultResult = adaptive_ashrae(25, 25, 21.5, 0.1);
    const explicitResult = adaptive_ashrae(25, 25, 21.5, 0.1, "SI", true, true);

    expect(defaultResult.tmp_cmf).toBe(explicitResult.tmp_cmf);
    expect(defaultResult.tmp_cmf_80_low).toBe(explicitResult.tmp_cmf_80_low);
    expect(defaultResult.tmp_cmf_80_up).toBe(explicitResult.tmp_cmf_80_up);
    expect(defaultResult.tmp_cmf_90_low).toBe(explicitResult.tmp_cmf_90_low);
    expect(defaultResult.tmp_cmf_90_up).toBe(explicitResult.tmp_cmf_90_up);
  });

  test("test_round_output_false_returns_unrounded", () => {
    const unrounded = adaptive_ashrae(25, 25, 21.5, 0.1, "SI", true, false);
    const rounded = adaptive_ashrae(25, 25, 21.5, 0.1, "SI", true, true);

    expect(unrounded.tmp_cmf).toBeCloseTo(24.465);
    expect(rounded.tmp_cmf).toBeCloseTo(24.5);
    expect(unrounded.tmp_cmf).not.toBe(rounded.tmp_cmf);
  });

  test("test_round_output_false_propagates_to_bounds", () => {
    const unrounded = adaptive_ashrae(25, 25, 21.5, 0.1, "SI", true, false);

    expect(unrounded.tmp_cmf_80_low).toBeCloseTo(24.465 - 3.5);
    expect(unrounded.tmp_cmf_90_low).toBeCloseTo(24.465 - 2.5);
    expect(unrounded.tmp_cmf_80_up).toBeCloseTo(24.465 + 3.5);
    expect(unrounded.tmp_cmf_90_up).toBeCloseTo(24.465 + 2.5);
  });

  test("test_round_output_invalid_type_raises", () => {
    expect(() => adaptive_ashrae(25, 25, 20, 0.1, "SI", true, "yes")).toThrow(
      TypeError,
    );
  });
});

describe("adaptive_ashrae scalar regression tests", () => {
  test("neutral conditions are acceptable", () => {
    const result = adaptive_ashrae(25, 25, 20, 0.1);

    validateResult(result, { tmp_cmf: 24.0 }, tolerances, {});
    expect(result.acceptability_80).toBe(true);
    expect(result.acceptability_90).toBe(true);
  });

  test("warm indoor conditions exceed both comfort zones", () => {
    const result = adaptive_ashrae(32, 32, 20, 0.1);

    validateResult(result, { tmp_cmf: 24.0 }, tolerances, {});
    expect(result.acceptability_80).toBe(false);
    expect(result.acceptability_90).toBe(false);
  });

  test("cool indoor conditions fall below both comfort zones", () => {
    const result = adaptive_ashrae(15, 15, 12, 0.1);

    validateResult(result, { tmp_cmf: 21.5 }, tolerances, {});
    expect(result.acceptability_80).toBe(false);
    expect(result.acceptability_90).toBe(false);
  });

  test("out-of-range running mean returns NaN and false acceptability", () => {
    const result = adaptive_ashrae(25, 25, 5, 0.1, "SI", true);

    expect(result.tmp_cmf).toBeNaN();
    expect(result.acceptability_80).toBe(false);
    expect(result.acceptability_90).toBe(false);
  });

  test("IP inputs preserve the reference comfort result", () => {
    const result = adaptive_ashrae(77, 77, 68, 0.3, "IP");

    validateResult(result, { tmp_cmf: 75.2 }, tolerances, {});
    expect(result.acceptability_80).toBe(true);
    expect(result.acceptability_90).toBe(true);
  });
});

describe("adaptive_ashrae cooling-effect regression", () => {
  test("v=0.6 widens 90% acceptability at operative temperature 28", () => {
    const wide = adaptive_ashrae(28, 28, 22, 0.6);
    const narrow = adaptive_ashrae(28, 28, 22, 0.1);

    expect(wide.acceptability_90).toBe(true);
    expect(narrow.acceptability_90).toBe(false);
  });
});

describe("adaptive_ashrae Python-compatible rounding regression", () => {
  test("round_output affects acceptability when rounding moves an SI boundary", () => {
    const rounded = adaptive_ashrae(25.12, 25.12, 12.4, 0.1);
    const unrounded = adaptive_ashrae(
      25.12,
      25.12,
      12.4,
      0.1,
      "SI",
      true,
      false,
    );

    // Python rounds t_cmf from 21.644 to 21.6 before deriving the bounds.
    // The rounded 80% upper bound is 25.1, while the unrounded one is 25.144.
    expect(rounded.acceptability_80).toBe(false);
    expect(unrounded.acceptability_80).toBe(true);
    expect(rounded.acceptability_90).toBe(false);
    expect(unrounded.acceptability_90).toBe(false);
  });

  test("round_output affects acceptability when rounding moves an IP boundary", () => {
    const rounded = adaptive_ashrae(
      77.216,
      77.216,
      54.32,
      0.328,
      "IP",
      true,
      true,
    );
    const unrounded = adaptive_ashrae(
      77.216,
      77.216,
      54.32,
      0.328,
      "IP",
      true,
      false,
    );

    expect(rounded.acceptability_80).toBe(false);
    expect(unrounded.acceptability_80).toBe(true);
    expect(rounded.acceptability_90).toBe(false);
    expect(unrounded.acceptability_90).toBe(false);
  });

  test("round_output preserves acceptability away from rounding boundaries", () => {
    const testCases = [
      { tdb: 20, tr: 20, tRunningMean: 15, v: 0.1 },
      { tdb: 24, tr: 24, tRunningMean: 20, v: 0.2 },
      { tdb: 26, tr: 26, tRunningMean: 22, v: 0.3 },
      { tdb: 28, tr: 28, tRunningMean: 24, v: 0.4 },
    ];

    testCases.forEach(({ tdb, tr, tRunningMean, v }) => {
      const rounded = adaptive_ashrae(tdb, tr, tRunningMean, v);
      const unrounded = adaptive_ashrae(
        tdb,
        tr,
        tRunningMean,
        v,
        "SI",
        true,
        false,
      );

      expect(rounded.acceptability_80).toBe(unrounded.acceptability_80);
      expect(rounded.acceptability_90).toBe(unrounded.acceptability_90);
    });
  });

  test("IP outputs convert the values rounded in SI", () => {
    const result = adaptive_ashrae(77, 77, 54.32, 0.328, "IP", true, true);

    expect(result.tmp_cmf).toBeCloseTo(70.88);
    expect(result.tmp_cmf_80_low).toBeCloseTo(64.58);
    expect(result.tmp_cmf_80_up).toBeCloseTo(77.18);
    expect(result.tmp_cmf_90_low).toBeCloseTo(66.38);
    expect(result.tmp_cmf_90_up).toBeCloseTo(75.38);
  });
});

describe("adaptive_ashrae additional input validation", () => {
  test("limit_inputs must be a boolean", () => {
    expect(() => adaptive_ashrae(25, 25, 20, 0.1, "SI", "true")).toThrow(
      TypeError,
    );
  });
});
