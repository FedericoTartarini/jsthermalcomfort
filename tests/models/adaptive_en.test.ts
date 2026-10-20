import { describe, expect, jest, test } from "@jest/globals";
import { adaptive_en } from "../../src/models/index.js";
import {
  ADAPTIVE_EN_LIMITS,
  type AdaptiveEnParams,
} from "../../src/models/adaptive_en.ts";
import { testDataUrls } from "./comftest.ts";
import {
  assertNonEmptyRows,
  loadTestData,
  validateResult,
} from "./testUtils.ts";

const { testData, tolerances } = await loadTestData(testDataUrls.adaptiveEn);

// The fixture's list row runs one scalar case per element (ADR 0005).
const rows = assertNonEmptyRows(testData.data, "adaptive_en fixture rows");

const close = (actual: number, expected: number) =>
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(1e-6);

// Mirrors pythermalcomfort v4.6.2 tests/test_adaptive_en.py, under its names,
// which call the input tests test_ashrae_inputs_* (:30-57).
describe("test_adaptive_en", () => {
  test.each(rows)(
    "test_adaptive_en: fixture case %#",
    ({ inputs, outputs }) => {
      // Upstream passes the four quantities only, so units is the default.
      const { tdb, tr, t_running_mean, v } =
        inputs as unknown as AdaptiveEnParams;
      const result = adaptive_en({ tdb, tr, t_running_mean, v });
      validateResult(result, outputs, tolerances, inputs);
    },
  );

  // Upstream's ValueError is an Error here (ADR 0012).
  test("test_ashrae_inputs_invalid_units", () => {
    expect(() =>
      adaptive_en({
        tdb: 25,
        tr: 25,
        t_running_mean: 20,
        v: 0.1,
        // @ts-expect-error units is "SI" or "IP"; the runtime check is under test
        units: "INVALID",
      }),
    ).toThrow(Error);
  });

  test.each(["tdb", "tr", "t_running_mean", "v"])(
    "test_ashrae_inputs_invalid_%s_type",
    (key) => {
      const params = {
        tdb: 25,
        tr: 25,
        t_running_mean: 20,
        v: 0.1,
        [key]: "invalid",
      } as unknown as AdaptiveEnParams;
      expect(() => adaptive_en(params)).toThrow(TypeError);
    },
  );

  test("test_round_output_default_preserves_behaviour", () => {
    const inputs = { tdb: 25, tr: 25, t_running_mean: 20.5, v: 0.1 };
    const default_result = adaptive_en(inputs);
    const explicit_result = adaptive_en({ ...inputs, round_output: true });
    expect(default_result.tmp_cmf).toBe(explicit_result.tmp_cmf);
    expect(default_result.tmp_cmf_cat_i_up).toBe(
      explicit_result.tmp_cmf_cat_i_up,
    );
    expect(default_result.tmp_cmf_cat_i_low).toBe(
      explicit_result.tmp_cmf_cat_i_low,
    );
    expect(default_result.tmp_cmf_cat_ii_up).toBe(
      explicit_result.tmp_cmf_cat_ii_up,
    );
    expect(default_result.tmp_cmf_cat_iii_low).toBe(
      explicit_result.tmp_cmf_cat_iii_low,
    );
  });

  test("test_round_output_false_returns_unrounded", () => {
    // 0.33 * 20.5 + 18.8 = 25.565; rounded to 1 dp this is 25.6.
    const inputs = { tdb: 25, tr: 25, t_running_mean: 20.5, v: 0.1 };
    const unrounded = adaptive_en({ ...inputs, round_output: false });
    const rounded = adaptive_en({ ...inputs, round_output: true });

    close(unrounded.tmp_cmf, 25.565);
    close(rounded.tmp_cmf, 25.6);
    expect(unrounded.tmp_cmf).not.toBe(rounded.tmp_cmf);

    // Bounds derive from the unrounded value when round_output=False.
    close(unrounded.tmp_cmf_cat_i_low, 25.565 - 3.0);
    close(unrounded.tmp_cmf_cat_ii_up, 25.565 + 3.0);
  });

  test("test_round_output_invalid_type_raises", () => {
    expect(() =>
      adaptive_en({
        tdb: 25,
        tr: 25,
        t_running_mean: 20,
        v: 0.1,
        // @ts-expect-error round_output is a boolean; the runtime check is under test
        round_output: "yes",
      }),
    ).toThrow(TypeError);
  });
});

// Upstream has no test for these. Every expected value is what
// pythermalcomfort 4.6.2 returns for the same call.
describe("adaptive_en beyond upstream's tests", () => {
  const base = { tdb: 25, tr: 25, t_running_mean: 20, v: 0.1 };
  const trm_row = (value: number) => ({
    key: "t_running_mean",
    role: "input",
    value,
    bound: ADAPTIVE_EN_LIMITS.t_running_mean,
  });
  const masked = {
    tmp_cmf: NaN,
    acceptability_cat_i: false,
    acceptability_cat_ii: false,
    acceptability_cat_iii: false,
    tmp_cmf_cat_i_up: NaN,
    tmp_cmf_cat_ii_up: NaN,
    tmp_cmf_cat_iii_up: NaN,
    tmp_cmf_cat_i_low: NaN,
    tmp_cmf_cat_ii_low: NaN,
    tmp_cmf_cat_iii_low: NaN,
  };
  // t_running_mean 9 °C, computed despite the bound.
  const trm_9 = {
    tmp_cmf: 21.8,
    acceptability_cat_i: false,
    acceptability_cat_ii: false,
    acceptability_cat_iii: true,
    tmp_cmf_cat_i_up: 23.8,
    tmp_cmf_cat_ii_up: 24.8,
    tmp_cmf_cat_iii_up: 25.8,
    tmp_cmf_cat_i_low: 18.8,
    tmp_cmf_cat_ii_low: 17.8,
    tmp_cmf_cat_iii_low: 16.8,
  };

  describe("the docstring examples", () => {
    test("tdb 25, tr 25, t_running_mean 20, v 0.1 complies with category I", () => {
      expect(adaptive_en(base)).toEqual({
        tmp_cmf: 25.4,
        acceptability_cat_i: true,
        acceptability_cat_ii: true,
        acceptability_cat_iii: true,
        tmp_cmf_cat_i_up: 27.4,
        tmp_cmf_cat_ii_up: 28.4,
        tmp_cmf_cat_iii_up: 29.4,
        tmp_cmf_cat_i_low: 22.4,
        tmp_cmf_cat_ii_low: 21.4,
        tmp_cmf_cat_iii_low: 20.4,
        warnings: [],
      });
    });

    // Upstream's docstring says the model can only be used for a running
    // mean between 10 °C and 30 °C (adaptive_en.py:88-89); its code gates on
    // 10 to 33.5 (:122).
    test("t_running_mean 9 is masked: NaN temperatures, nothing acceptable", () => {
      expect(adaptive_en({ ...base, t_running_mean: 9 })).toEqual({
        ...masked,
        warnings: [trm_row(9)],
      });
    });
  });

  // Upstream converts tdb, tr, t_running_mean and v from IP after validating
  // them and before it computes or checks t_running_mean's range
  // (adaptive_en.py:92-122), accepts units in any case, and converts the
  // results back to °F before rounding them (:137-159).
  describe("units", () => {
    const ip = { tdb: 77, tr: 77, t_running_mean: 68, v: 0.3 };

    test.each(["IP", "ip"])(
      "units %p is the docstring's IP example",
      (units) => {
        expect(adaptive_en({ ...ip, units: units as "IP" })).toEqual({
          tmp_cmf: 77.7,
          acceptability_cat_i: true,
          acceptability_cat_ii: true,
          acceptability_cat_iii: true,
          tmp_cmf_cat_i_up: 81.3,
          tmp_cmf_cat_ii_up: 83.1,
          tmp_cmf_cat_iii_up: 84.9,
          tmp_cmf_cat_i_low: 72.3,
          tmp_cmf_cat_ii_low: 70.5,
          tmp_cmf_cat_iii_low: 68.7,
          warnings: [],
        });
      },
    );

    test("round_output false returns the °F values unrounded", () => {
      expect(adaptive_en({ ...ip, units: "IP", round_output: false })).toEqual({
        tmp_cmf: 77.72,
        acceptability_cat_i: true,
        acceptability_cat_ii: true,
        acceptability_cat_iii: true,
        tmp_cmf_cat_i_up: 81.32000000000001,
        tmp_cmf_cat_ii_up: 83.12,
        tmp_cmf_cat_iii_up: 84.92,
        tmp_cmf_cat_i_low: 72.32000000000001,
        tmp_cmf_cat_ii_low: 70.52000000000001,
        tmp_cmf_cat_iii_low: 68.72,
        warnings: [],
      });
    });

    // Rounded after the conversion to °F, so ties go to even in °F.
    test("tdb 62 °F, t_running_mean 69 °F rounds in °F", () => {
      expect(
        adaptive_en({ tdb: 62, tr: 62, t_running_mean: 69, v: 0, units: "IP" }),
      ).toMatchObject({
        tmp_cmf: 78.1,
        tmp_cmf_cat_i_up: 81.6,
        tmp_cmf_cat_ii_up: 83.4,
        tmp_cmf_cat_iii_up: 85.2,
        tmp_cmf_cat_i_low: 72.6,
        tmp_cmf_cat_ii_low: 70.9,
        tmp_cmf_cat_iii_low: 69.1,
      });
    });

    test("an IP row carries the value in SI", () => {
      expect(adaptive_en({ ...ip, t_running_mean: 49, units: "IP" })).toEqual({
        ...masked,
        warnings: [trm_row(9.444444444444445)],
      });
    });

    test("50 °F is 10 °C, inside the inclusive bound", () => {
      expect(
        adaptive_en({ ...ip, t_running_mean: 50, units: "IP" }),
      ).toMatchObject({ tmp_cmf: 71.8, acceptability_cat_ii: true });
    });
  });

  // Upstream checks only t_running_mean, and only under limit_inputs, with a
  // UserWarning; here the row is built whatever limit_inputs is (ADR 0001).
  describe("t_running_mean's bound", () => {
    test("is ADAPTIVE_EN_LIMITS.t_running_mean, 10 to 33.5 °C", () => {
      expect(ADAPTIVE_EN_LIMITS).toEqual({
        t_running_mean: { min: 10, max: 33.5 },
      });
      expect(Object.isFrozen(ADAPTIVE_EN_LIMITS)).toBe(true);
      expect(Object.isFrozen(ADAPTIVE_EN_LIMITS.t_running_mean)).toBe(true);
    });

    test.each([
      [10, 22.1],
      [33.5, 29.9],
    ])("is inclusive: t_running_mean %p gives tmp_cmf %p", (trm, tmp_cmf) => {
      const result = adaptive_en({ ...base, t_running_mean: trm });
      expect(result.tmp_cmf).toBe(tmp_cmf);
      expect(result.warnings).toEqual([]);
    });

    test.each([9.99, 33.51, 34])(
      "t_running_mean %p is masked, with its row",
      (trm) => {
        expect(adaptive_en({ ...base, t_running_mean: trm })).toEqual({
          ...masked,
          warnings: [trm_row(trm)],
        });
      },
    );

    test("with limit_inputs false the result is computed, and the row stays", () => {
      expect(
        adaptive_en({ ...base, t_running_mean: 9, limit_inputs: false }),
      ).toEqual({ ...trm_9, warnings: [trm_row(9)] });
    });

    // ADR 0006: upstream compares the operative temperature against NaN
    // bounds, which gives False.
    test("a masked acceptability is false, not NaN", () => {
      const result = adaptive_en({ ...base, t_running_mean: 34 });
      expect(result.acceptability_cat_iii).toBe(false);
    });

    // Upstream bounds neither tdb, tr nor v.
    test("tdb, tr and v far out of any range add no row", () => {
      const result = adaptive_en({
        tdb: 60,
        tr: -20,
        t_running_mean: 20,
        v: 9,
      });
      expect(result.warnings).toEqual([]);
      expect(result.tmp_cmf).toBe(25.4);
    });
  });

  // Upstream does not give limit_inputs to ENInputs (adaptive_en.py:92-99),
  // so it is read for its truth value and not validated.
  describe("limit_inputs, read for its truth value as upstream", () => {
    const at = (limit_inputs: unknown) =>
      adaptive_en({
        ...base,
        t_running_mean: 9,
        limit_inputs: limit_inputs as boolean,
      });

    test.each([
      { label: "1", value: 1 },
      { label: '"yes"', value: "yes" },
      { label: '"0"', value: "0" },
      { label: "[0]", value: [0] },
    ])("masks for $label, which is true in Python and JS", ({ value }) => {
      expect(at(value)).toEqual({ ...masked, warnings: [trm_row(9)] });
    });

    test.each([
      { label: "0", value: 0 },
      { label: "-0", value: -0 },
      { label: '""', value: "" },
      { label: "null", value: null },
    ])(
      "does not mask for $label, which is false in Python and JS",
      ({ value }) => {
        expect(at(value)).toEqual({ ...trm_9, warnings: [trm_row(9)] });
      },
    );

    // ADR 0001, amended 2026-10-20 (pmv_ppd_ashrae D2): limit_inputs is read
    // for JavaScript's truth value, which differs from Python's on these
    // three. Upstream 4.6.2 masks for nan and computes for [] and {}.
    test("NaN, [] and {} follow JavaScript's truth value, not Python's", () => {
      expect(at(NaN)).toEqual({ ...trm_9, warnings: [trm_row(9)] });
      expect(at([])).toEqual({ ...masked, warnings: [trm_row(9)] });
      expect(at({})).toEqual({ ...masked, warnings: [trm_row(9)] });
    });
  });

  // The upper bounds rise by 1.2, 1.8 or 2.2 °C from v 0.6, 0.9 or 1.2 m/s,
  // where the operative temperature is 25 °C or more; both edges inclusive.
  describe("the cooling effect", () => {
    const warm = { tdb: 29, tr: 29, t_running_mean: 22 };

    test.each([
      [0.59, 28.1, false],
      [0.6, 29.3, true],
      [0.9, 29.9, true],
      [1.2, 30.3, true],
    ])("v %p: tmp_cmf_cat_i_up %p, category I %p", (v, up, cat_i) => {
      const result = adaptive_en({ ...warm, v });
      expect(result.tmp_cmf).toBe(26.1);
      expect(result.tmp_cmf_cat_i_up).toBe(up);
      expect(result.tmp_cmf_cat_i_low).toBe(23.1);
      expect(result.acceptability_cat_i).toBe(cat_i);
    });

    test.each([
      [24.9, 24.9, 28.1],
      [25, 25, 30.3],
      [26, 24, 30.3],
    ])("tdb %p, tr %p at v 1.2: tmp_cmf_cat_i_up %p", (tdb, tr, up) => {
      const result = adaptive_en({ tdb, tr, t_running_mean: 22, v: 1.2 });
      expect(result.tmp_cmf_cat_i_up).toBe(up);
    });

    test("round_output false keeps the acceptabilities", () => {
      const rounded = adaptive_en({ ...warm, v: 0.6 });
      const unrounded = adaptive_en({ ...warm, v: 0.6, round_output: false });
      expect(unrounded.acceptability_cat_i).toBe(rounded.acceptability_cat_i);
      expect(unrounded.acceptability_cat_ii).toBe(rounded.acceptability_cat_ii);
      expect(unrounded.acceptability_cat_iii).toBe(
        rounded.acceptability_cat_iii,
      );
    });
  });

  test.each([
    [{ tdb: 30, tr: 30, t_running_mean: 20, v: 0.1 }, 25.4, false],
    [{ tdb: 17, tr: 17, t_running_mean: 12, v: 0.1 }, 22.8, false],
    [{ tdb: 17, tr: 17, t_running_mean: 25, v: 0 }, 27, false],
    [{ tdb: 27, tr: 27, t_running_mean: 22, v: 0.6 }, 26.1, true],
  ])("%p: tmp_cmf %p, category III %p", (input, tmp_cmf, cat_iii) => {
    const result = adaptive_en(input);
    expect(result.tmp_cmf).toBe(tmp_cmf);
    expect(result.acceptability_cat_iii).toBe(cat_iii);
  });

  // 0.33 * 25 + 18.8 is 27.0500000000000007105… in binary, and ten times it
  // is exactly 270.5, a tie that upstream's np.around sends to the even 270.
  test("tdb 17, t_running_mean 25, v 0 rounds 27.05 to 27.0, as np.around", () => {
    expect(
      adaptive_en({ tdb: 17, tr: 17, t_running_mean: 25, v: 0 }),
    ).toMatchObject({
      tmp_cmf: 27,
      tmp_cmf_cat_i_up: 29,
      tmp_cmf_cat_ii_up: 30,
      tmp_cmf_cat_iii_up: 31,
      tmp_cmf_cat_i_low: 24,
      tmp_cmf_cat_ii_low: 23,
      tmp_cmf_cat_iii_low: 22,
    });
  });

  // Upstream's operative temperature takes the square root of 10 v, which is
  // NaN for a negative v, so nothing is acceptable; no limit applies to v.
  describe("a negative v", () => {
    test("computes the comfort temperatures, with nothing acceptable", () => {
      expect(adaptive_en({ ...base, v: -0.1 })).toEqual({
        tmp_cmf: 25.4,
        acceptability_cat_i: false,
        acceptability_cat_ii: false,
        acceptability_cat_iii: false,
        tmp_cmf_cat_i_up: 27.4,
        tmp_cmf_cat_ii_up: 28.4,
        tmp_cmf_cat_iii_up: 29.4,
        tmp_cmf_cat_i_low: 22.4,
        tmp_cmf_cat_ii_low: 21.4,
        tmp_cmf_cat_iii_low: 20.4,
        warnings: [],
      });
    });

    test("with limit_inputs false and t_running_mean 9", () => {
      expect(
        adaptive_en({
          ...base,
          t_running_mean: 9,
          v: -0.1,
          limit_inputs: false,
        }),
      ).toEqual({
        ...trm_9,
        acceptability_cat_iii: false,
        warnings: [trm_row(9)],
      });
    });
  });

  test("writes nothing to the console", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    try {
      adaptive_en({ ...base, t_running_mean: 9 });
      adaptive_en({ ...base, t_running_mean: 9, limit_inputs: false });
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  describe("errors", () => {
    test("round_output 1 throws upstream's TypeError", () => {
      const params = {
        ...base,
        round_output: 1,
      } as unknown as AdaptiveEnParams;
      expect(() => adaptive_en(params)).toThrow(TypeError);
    });

    // Upstream raises a ValueError (ADR 0012: Error), for a non-string too,
    // as it upper-cases str(units).
    test.each(["XX", 5])("units %p throws an Error", (units) => {
      const params = { ...base, units } as unknown as AdaptiveEnParams;
      expect(() => adaptive_en(params)).toThrow('"units" must be one of');
    });

    // ADR 0008: upstream raises a TypeError for an unexpected keyword.
    test("the key 'standard' throws a TypeError naming it", () => {
      const params = {
        ...base,
        standard: "7730-2025",
      } as unknown as AdaptiveEnParams;
      expect(() => adaptive_en(params)).toThrow(
        new TypeError("adaptive_en got an unexpected key: 'standard'"),
      );
    });

    // ADR 0002: a positional call fails instead of running as defaults.
    test("a positional call throws a TypeError", () => {
      const call = adaptive_en as unknown as (...args: unknown[]) => unknown;
      expect(() => call(25, 25, 20, 0.1)).toThrow(TypeError);
    });

    const quantities = ["tdb", "tr", "t_running_mean", "v"];

    // ADR 0001: a public model throws a TypeError for a non-finite number,
    // where upstream returns a result.
    test.each(
      quantities.flatMap((key) =>
        [NaN, Infinity, -Infinity].map((value) => [key, value] as const),
      ),
    )("%s %p throws a TypeError", (key, value) => {
      const params = { ...base, [key]: value } as unknown as AdaptiveEnParams;
      expect(() => adaptive_en(params)).toThrow(TypeError);
    });

    // ADR 0005 as amended: upstream reads True and False as 1 and 0.
    test.each(quantities)("a boolean %s throws a TypeError", (key) => {
      const params = { ...base, [key]: true } as unknown as AdaptiveEnParams;
      expect(() => adaptive_en(params)).toThrow(TypeError);
    });

    // ADR 0005: quantities are numbers; upstream would broadcast the list.
    test("an array throws a TypeError", () => {
      const params = { ...base, tdb: [25, 30] } as unknown as AdaptiveEnParams;
      expect(() => adaptive_en(params)).toThrow(TypeError);
    });
  });
});
