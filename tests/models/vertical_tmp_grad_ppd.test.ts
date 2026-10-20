import { describe, expect, jest, test } from "@jest/globals";
import { vertical_tmp_grad_ppd } from "../../src/models/vertical_tmp_grad_ppd.ts";
import type { VerticalTmpGradPpdParams } from "../../src/models/vertical_tmp_grad_ppd.ts";
import { ASHRAE_55_V_LIMITED } from "../../src/_internal/ashrae55.ts";
import { ASHRAE_55_LIMITS } from "../../src/utilities/utilities.js";
import { testDataUrls } from "./comftest.ts";
import {
  assertNonEmptyRows,
  loadTestData,
  validateResult,
} from "./testUtils.ts";

const { testData, tolerances } = await loadTestData(
  testDataUrls.verticalTmpGradPpd,
);

// Every row of the fixture is scalar (no list inputs), so each runs as it is.
const rows = assertNonEmptyRows(
  testData.data,
  "vertical_tmp_grad_ppd fixture rows",
);

// Mirrors pythermalcomfort v4.6.2 tests/test_vertical_tmp_grad_ppd.py.
describe("test_vertical_tmp_grad_ppd", () => {
  test.each(rows)(
    "test_vertical_tmp_grad_ppd: fixture case %#",
    ({ inputs, outputs }) => {
      const result = vertical_tmp_grad_ppd(
        inputs as unknown as VerticalTmpGradPpdParams,
      );
      validateResult(result, outputs, tolerances, inputs);
    },
  );

  // Upstream computes np.isclose(..., np.nan, equal_nan=True) without an
  // assert (test_vertical_tmp_grad_ppd.py:27-31 at v4.6.2), so its check
  // cannot fail; its code returns NaN, which is asserted here.
  test("test_vertical_tmp_grad_ppd: vr 0.3 returns NaN", () => {
    const result = vertical_tmp_grad_ppd({
      tdb: 25,
      tr: 25,
      vr: 0.3,
      rh: 50,
      met: 1.2,
      clo: 0.5,
      vertical_tmp_grad: 7,
    });
    expect(result.ppd_vg).toBeNaN();
  });

  // Upstream turns its UserWarnings into errors, and none is raised. A range
  // check is a row here, reported whatever limit_inputs is (ADR 0001), so
  // the tdb row comes beside the number and nothing reaches the console.
  test("test_vertical_tmp_grad_ppd_limit_inputs_false_suppresses_warning_and_nan", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const result = vertical_tmp_grad_ppd({
        tdb: 50,
        tr: 25,
        vr: 0.1,
        rh: 50,
        met: 1.2,
        clo: 0.5,
        vertical_tmp_grad: 7,
        limit_inputs: false,
      });
      expect(result.ppd_vg).not.toBeNaN();
      expect(result.warnings).toEqual([
        { key: "tdb", role: "input", value: 50, bound: ASHRAE_55_LIMITS.tdb },
      ]);
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  // Upstream's UserWarning is the row.
  test("test_vertical_tmp_grad_ppd_limit_inputs_true_still_warns_and_nans", () => {
    const result = vertical_tmp_grad_ppd({
      tdb: 50,
      tr: 25,
      vr: 0.1,
      rh: 50,
      met: 1.2,
      clo: 0.5,
      vertical_tmp_grad: 7,
    });
    expect(result.warnings).toEqual([
      { key: "tdb", role: "input", value: 50, bound: ASHRAE_55_LIMITS.tdb },
    ]);
    expect(result.ppd_vg).toBeNaN();
  });

  // Upstream passes tdb, tr and vertical_tmp_grad as lists; here one scalar
  // call per element (ADR 0005).
  test.each([
    [24, 1, 0.0, true],
    [24, 0, 0.0, true],
    [25, 7, 12.6, false],
  ])(
    "test_vertical_tmp_grad_ppd_is_never_negative: tdb = tr = %p, vertical_tmp_grad %p",
    (t, vertical_tmp_grad, ppd_vg, acceptability) => {
      const result = vertical_tmp_grad_ppd({
        tdb: t,
        tr: t,
        vr: 0.1,
        rh: 50,
        met: 1.2,
        clo: 0.5,
        vertical_tmp_grad,
      });
      expect(result).toEqual({ ppd_vg, acceptability, warnings: [] });
    },
  );
});

// Upstream has no test for these. Every expected value is what
// pythermalcomfort 4.6.2 returns for the same call.
describe("vertical_tmp_grad_ppd beyond upstream's tests", () => {
  // The docstring example (vertical_tmp_grad_ppd.py:90-94 at v4.6.2).
  const base = {
    tdb: 25,
    tr: 25,
    vr: 0.1,
    rh: 50,
    met: 1.2,
    clo: 0.5,
    vertical_tmp_grad: 7,
  };

  test("the docstring example returns 12.6, not acceptable", () => {
    expect(vertical_tmp_grad_ppd(base)).toEqual({
      ppd_vg: 12.6,
      acceptability: false,
      warnings: [],
    });
  });

  test("round_output false returns the unrounded value", () => {
    expect(vertical_tmp_grad_ppd({ ...base, round_output: false })).toEqual({
      ppd_vg: 12.637059952602048,
      acceptability: false,
      warnings: [],
    });
  });

  test("a negative vertical_tmp_grad gives 0, acceptable", () => {
    expect(vertical_tmp_grad_ppd({ ...base, vertical_tmp_grad: -5 })).toEqual({
      ppd_vg: 0,
      acceptability: true,
      warnings: [],
    });
  });

  // Upstream checks neither rh nor vertical_tmp_grad.
  test("rh 120 adds no row and computes", () => {
    expect(vertical_tmp_grad_ppd({ ...base, rh: 120 })).toEqual({
      ppd_vg: 7.6,
      acceptability: false,
      warnings: [],
    });
  });

  // ADR 0006: a boolean in range, upstream's NaN where limit_inputs masks.
  describe("acceptability", () => {
    // Upstream compares ppd_vg with 5 before it rounds it
    // (vertical_tmp_grad_ppd.py:128-131), so both of these round to 5.0.
    const above = {
      tdb: 23.05,
      tr: 38.93,
      vr: 0.047,
      rh: 26.1,
      met: 1.95,
      clo: 1.2,
      vertical_tmp_grad: 7.81,
    };
    const below = { ...base, vertical_tmp_grad: 4.92 };

    test.each([
      ["5.018347424611525", above, 5.018347424611525, false],
      ["4.99282364290789", below, 4.99282364290789, true],
    ])(
      "an unrounded %s rounds to 5.0, acceptable %p",
      (_, input, unrounded, ok) => {
        expect(vertical_tmp_grad_ppd(input)).toEqual({
          ppd_vg: 5,
          acceptability: ok,
          warnings: [],
        });
        expect(
          vertical_tmp_grad_ppd({ ...input, round_output: false }),
        ).toEqual({ ppd_vg: unrounded, acceptability: ok, warnings: [] });
      },
    );

    test("is NaN where limit_inputs masks", () => {
      const result = vertical_tmp_grad_ppd({ ...base, met: 0.8 });
      expect(result.ppd_vg).toBeNaN();
      expect(result.acceptability).toBeNaN();
    });

    test("is a boolean with limit_inputs false, in range or not", () => {
      const result = vertical_tmp_grad_ppd({
        ...base,
        met: 0.8,
        limit_inputs: false,
      });
      expect(result.ppd_vg).toBe(39.4);
      expect(result.acceptability).toBe(false);
    });
  });

  // Each limit upstream warns about is a row (ADR 0001), built whatever
  // limit_inputs is; the gate reads the rows.
  describe("warnings rows", () => {
    const out_of_range = {
      tdb: 5,
      tr: 45,
      vr: 2.5,
      rh: 50,
      met: 0.5,
      clo: 2,
      vertical_tmp_grad: 3,
    };

    // Upstream passes vr as v_limited only (vertical_tmp_grad_ppd.py:140-146
    // at v4.6.2), so vr has no row bound by ASHRAE_55_LIMITS.vr.
    test("rows come in upstream's order: tdb, tr, met, clo, then vr", () => {
      const result = vertical_tmp_grad_ppd({
        ...out_of_range,
        limit_inputs: false,
      });
      expect(result.ppd_vg).toBe(65.5);
      expect(result.acceptability).toBe(false);
      expect(result.warnings).toEqual([
        { key: "tdb", role: "input", value: 5, bound: ASHRAE_55_LIMITS.tdb },
        { key: "tr", role: "input", value: 45, bound: ASHRAE_55_LIMITS.tr },
        { key: "met", role: "input", value: 0.5, bound: ASHRAE_55_LIMITS.met },
        { key: "clo", role: "input", value: 2, bound: ASHRAE_55_LIMITS.clo },
        { key: "vr", role: "input", value: 2.5, bound: ASHRAE_55_V_LIMITED },
      ]);
    });

    test("the same rows under limit_inputs mask the result", () => {
      const result = vertical_tmp_grad_ppd(out_of_range);
      expect(result.ppd_vg).toBeNaN();
      expect(result.acceptability).toBeNaN();
      expect(result.warnings).toEqual(
        vertical_tmp_grad_ppd({ ...out_of_range, limit_inputs: false })
          .warnings,
      );
    });

    // Upstream names this warning 'v_limited' (ashrae55.py:101 at v4.6.2),
    // the name of its check; the quantity checked is vr. A row's key names
    // the quantity and its bound says which limit it broke.
    test("vr above 0.2 m/s is a vr row bound by ASHRAE_55_V_LIMITED with limit_inputs false", () => {
      const result = vertical_tmp_grad_ppd({
        ...base,
        vr: 0.5,
        limit_inputs: false,
      });
      expect(result.ppd_vg).toBe(23.6);
      expect(result.acceptability).toBe(false);
      expect(result.warnings).toEqual([
        { key: "vr", role: "input", value: 0.5, bound: ASHRAE_55_V_LIMITED },
      ]);
      expect(result.warnings[0].bound).toBe(ASHRAE_55_V_LIMITED);
    });

    // Upstream masks a vr outside 0 to 0.2 m/s to NaN; unlike ankle_draft it
    // does not raise.
    test.each([-0.1, 0.20001, 0.3])("vr %p returns NaN", (vr) => {
      const result = vertical_tmp_grad_ppd({ ...base, vr });
      expect(result.ppd_vg).toBeNaN();
      expect(result.acceptability).toBeNaN();
      expect(result.warnings).toEqual([
        { key: "vr", role: "input", value: vr, bound: ASHRAE_55_V_LIMITED },
      ]);
    });

    // Upstream also emits numpy's RuntimeWarning "invalid value encountered
    // in _pmv_ppd_optimized" here, which has no counterpart (ADR 0001).
    test("vr below 0 computes with limit_inputs false", () => {
      const result = vertical_tmp_grad_ppd({
        ...base,
        vr: -0.1,
        limit_inputs: false,
      });
      expect(result.ppd_vg).toBe(12.2);
      expect(result.acceptability).toBe(false);
      expect(result.warnings).toEqual([
        { key: "vr", role: "input", value: -0.1, bound: ASHRAE_55_V_LIMITED },
      ]);
    });

    test("four rows without vr's mask the result", () => {
      const result = vertical_tmp_grad_ppd({ ...out_of_range, vr: 0.1 });
      expect(result.ppd_vg).toBeNaN();
      expect(result.acceptability).toBeNaN();
      expect(result.warnings.map((row) => row.key)).toEqual([
        "tdb",
        "tr",
        "met",
        "clo",
      ]);
    });

    test.each([
      [{ tdb: 10, tr: 10, vr: 0, met: 1, clo: 0 }, 65.5],
      [{ tdb: 40, tr: 40, vr: 0.2, met: 4, clo: 1.5 }, 19.2],
    ])("the limits are inclusive: %p", (input, ppd_vg) => {
      expect(
        vertical_tmp_grad_ppd({ ...input, rh: 50, vertical_tmp_grad: 3 }),
      ).toEqual({ ppd_vg, acceptability: false, warnings: [] });
    });

    test("writes nothing to the console", () => {
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
      try {
        vertical_tmp_grad_ppd(out_of_range);
        vertical_tmp_grad_ppd({ ...out_of_range, limit_inputs: false });
        expect(warn).not.toHaveBeenCalled();
      } finally {
        warn.mockRestore();
      }
    });
  });

  // Upstream's pmv_ppd_ashrae warns with a UserWarning when the cooling effect
  // cannot be calculated, and vertical_tmp_grad_ppd passes it on; here it is a
  // console message, behind suppress_warnings (ADR 0001).
  describe("suppress_warnings", () => {
    const no_ce = { ...base, tdb: 50, vr: 0.3, limit_inputs: false };

    test("by default the cooling-effect message reaches the console", () => {
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
      try {
        expect(vertical_tmp_grad_ppd(no_ce).ppd_vg).toBe(44.5);
        expect(warn).toHaveBeenCalledWith(
          "Cooling effect could not be calculated. Returning 0.",
        );
      } finally {
        warn.mockRestore();
      }
    });

    test("true writes nothing and changes neither the result nor the rows", () => {
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
      try {
        const quiet = vertical_tmp_grad_ppd({
          ...no_ce,
          suppress_warnings: true,
        });
        expect(warn).not.toHaveBeenCalled();
        expect(quiet).toEqual(vertical_tmp_grad_ppd(no_ce));
      } finally {
        warn.mockRestore();
      }
    });

    test("a non-boolean throws a TypeError", () => {
      const params = {
        ...base,
        suppress_warnings: "yes",
      } as unknown as VerticalTmpGradPpdParams;
      expect(() => vertical_tmp_grad_ppd(params)).toThrow(TypeError);
    });
  });

  // Upstream does not give round_output to VerticalTGradPPDInputs
  // (vertical_tmp_grad_ppd.py:97-106) and reads it with `if round_output:`
  // (:130); JavaScript's truth value stands in for Python's (ADR 0001).
  describe("round_output, read for its truth value as upstream", () => {
    test.each([
      { label: '"yes"', value: "yes" },
      { label: "1", value: 1 },
    ])("rounds for $label", ({ value }) => {
      const params = {
        ...base,
        round_output: value,
      } as unknown as VerticalTmpGradPpdParams;
      expect(vertical_tmp_grad_ppd(params).ppd_vg).toBe(12.6);
    });

    test.each([
      { label: "0", value: 0 },
      { label: "null", value: null },
    ])("does not round for $label", ({ value }) => {
      const params = {
        ...base,
        round_output: value,
      } as unknown as VerticalTmpGradPpdParams;
      expect(vertical_tmp_grad_ppd(params).ppd_vg).toBe(12.637059952602048);
    });
  });

  describe("errors", () => {
    test("limit_inputs that is not a boolean throws upstream's TypeError", () => {
      const params = {
        ...base,
        limit_inputs: "false",
      } as unknown as VerticalTmpGradPpdParams;
      expect(() => vertical_tmp_grad_ppd(params)).toThrow(TypeError);
    });

    // ADR 0008: upstream raises a TypeError for an unexpected keyword; it
    // has had no units parameter since v3.4.3.
    test("the removed key 'units' throws a TypeError naming it", () => {
      const params = {
        ...base,
        units: "IP",
      } as unknown as VerticalTmpGradPpdParams;
      expect(() => vertical_tmp_grad_ppd(params)).toThrow(
        new TypeError("vertical_tmp_grad_ppd got an unexpected key: 'units'"),
      );
    });

    // ADR 0002: a positional call fails instead of running as defaults.
    test("a positional call throws a TypeError", () => {
      const call = vertical_tmp_grad_ppd as unknown as (
        ...args: unknown[]
      ) => unknown;
      expect(() => call(25, 25, 0.1, 50, 1.2, 0.5, 7)).toThrow(TypeError);
    });

    const quantities = [
      "tdb",
      "tr",
      "vr",
      "rh",
      "met",
      "clo",
      "vertical_tmp_grad",
    ];

    // Upstream raises a TypeError for a missing argument.
    test.each(quantities)("a missing %s throws a TypeError", (key) => {
      const params = { ...base } as Record<string, unknown>;
      delete params[key];
      expect(() =>
        vertical_tmp_grad_ppd(params as unknown as VerticalTmpGradPpdParams),
      ).toThrow(TypeError);
    });

    // Upstream raises a TypeError for a string quantity.
    test.each(quantities)("a string %s throws a TypeError", (key) => {
      const params = {
        ...base,
        [key]: "25",
      } as unknown as VerticalTmpGradPpdParams;
      expect(() => vertical_tmp_grad_ppd(params)).toThrow(TypeError);
    });

    // ADR 0001: a public model throws a TypeError for a non-finite number.
    test.each(
      quantities.flatMap((key) =>
        [NaN, Infinity, -Infinity].map((value) => [key, value] as const),
      ),
    )("%s %p throws a TypeError", (key, value) => {
      const params = {
        ...base,
        [key]: value,
      } as unknown as VerticalTmpGradPpdParams;
      expect(() => vertical_tmp_grad_ppd(params)).toThrow(TypeError);
    });

    // ADR 0005 as amended: upstream reads True and False as 1 and 0.
    test.each(quantities)("a boolean %s throws a TypeError", (key) => {
      const params = {
        ...base,
        [key]: false,
      } as unknown as VerticalTmpGradPpdParams;
      expect(() => vertical_tmp_grad_ppd(params)).toThrow(TypeError);
    });

    // ADR 0005: quantities are numbers; upstream would broadcast the list.
    test("an array throws a TypeError", () => {
      const params = {
        ...base,
        tdb: [25, 30],
      } as unknown as VerticalTmpGradPpdParams;
      expect(() => vertical_tmp_grad_ppd(params)).toThrow(TypeError);
    });
  });
});
