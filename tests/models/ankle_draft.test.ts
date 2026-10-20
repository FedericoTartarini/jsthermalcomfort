import { describe, expect, jest, test } from "@jest/globals";
import { ankle_draft } from "../../src/models/ankle_draft.ts";
import type { AnkleDraftParams } from "../../src/models/ankle_draft.ts";
import { ASHRAE_55_V_LIMITED } from "../../src/_internal/ashrae55.ts";
import { ASHRAE_55_LIMITS } from "../../src/utilities/utilities.js";
import { testDataUrls } from "./comftest.ts";
import {
  assertNonEmptyRows,
  loadTestData,
  validateResult,
} from "./testUtils.ts";

const { testData, tolerances } = await loadTestData(testDataUrls.ankleDraft);

// Every row of the fixture is scalar (no list inputs), so each runs as it is.
const rows = assertNonEmptyRows(testData.data, "ankle_draft fixture rows");

const VR_MESSAGE =
  "This equation is only applicable for air speed lower than 0.2 m/s";

// Mirrors pythermalcomfort v4.6.2 tests/test_ankle_draft.py.
describe("test_ankle_draft", () => {
  test.each(rows)(
    "test_ankle_draft: fixture case %#",
    ({ inputs, outputs }) => {
      const result = ankle_draft(inputs as unknown as AnkleDraftParams);
      validateResult(result, outputs, tolerances, inputs);
    },
  );

  // Upstream's ValueError for a value out of range is a RangeError here
  // (ADR 0012). Upstream passes the second call's v_ankle as a list; here one
  // scalar call per element (ADR 0005), and each raises on vr = 0.3.
  test.each([[7], [0.1], [0.2], [0.3], [0.4]])(
    "test_ankle_draft_invalid_input_range: vr 0.3, v_ankle %p",
    (v_ankle) => {
      const call = () =>
        ankle_draft({
          tdb: 25,
          tr: 25,
          vr: 0.3,
          rh: 50,
          met: 1.2,
          clo: 0.5,
          v_ankle,
        });
      expect(call).toThrow(RangeError);
      expect(call).toThrow(VR_MESSAGE);
    },
  );

  // The list call's tdb [50, 45] runs one scalar call per element.
  test.each([[50], [45]])(
    "test_ankle_draft_outside_ashrae_range: tdb %p",
    (tdb) => {
      const result = ankle_draft({
        tdb,
        tr: 25,
        vr: 0.1,
        rh: 50,
        met: 1.2,
        clo: 0.5,
        v_ankle: 0.1,
      });
      expect(result.ppd_ad).toBeNaN();
    },
  );

  // Upstream asserts only that each list has three elements; the values are
  // what pythermalcomfort 4.6.2 returns for each element.
  test.each([
    [25, 8.6],
    [26, 6.4],
    [27, 4.7],
  ])("test_ankle_draft_list_inputs: tdb = tr = %p", (t, ppd_ad) => {
    const result = ankle_draft({
      tdb: t,
      tr: t,
      vr: 0.1,
      rh: 50,
      met: 1.2,
      clo: 0.5,
      v_ankle: 0.1,
      units: "SI",
    });
    expect(result).toEqual({ ppd_ad, acceptability: true, warnings: [] });
  });

  // Of the list's elements, only tdb "invalid" is not a number.
  test("test_ankle_draft_invalid_list_inputs: tdb 'invalid'", () => {
    const params = {
      tdb: "invalid",
      tr: 26,
      vr: 0.1,
      rh: 50,
      met: 1.2,
      clo: 0.5,
      v_ankle: 0.1,
      units: "SI",
    } as unknown as AnkleDraftParams;
    expect(() => ankle_draft(params)).toThrow(TypeError);
  });

  // Upstream turns its UserWarnings into errors, and none is raised. A range
  // check is a row here, reported whatever limit_inputs is (ADR 0001), so
  // the tdb row comes beside the number and nothing reaches the console.
  test("test_ankle_draft_limit_inputs_false_suppresses_warning_and_nan", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const result = ankle_draft({
        tdb: 50,
        tr: 25,
        vr: 0.1,
        rh: 50,
        met: 1.2,
        clo: 0.5,
        v_ankle: 0.1,
        limit_inputs: false,
      });
      expect(result.ppd_ad).not.toBeNaN();
      expect(result.warnings).toEqual([
        { key: "tdb", role: "input", value: 50, bound: ASHRAE_55_LIMITS.tdb },
      ]);
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  test("test_ankle_draft_limit_inputs_false_skips_valueerror", () => {
    const result = ankle_draft({
      tdb: 25,
      tr: 25,
      vr: 0.5,
      rh: 50,
      met: 1.2,
      clo: 0.5,
      v_ankle: 0.1,
      limit_inputs: false,
    });
    expect(result.ppd_ad).not.toBeNaN();
  });

  // Upstream's UserWarning is the row.
  test("test_ankle_draft_limit_inputs_true_still_warns_and_nans", () => {
    const result = ankle_draft({
      tdb: 50,
      tr: 25,
      vr: 0.1,
      rh: 50,
      met: 1.2,
      clo: 0.5,
      v_ankle: 0.1,
    });
    expect(result.warnings).toEqual([
      { key: "tdb", role: "input", value: 50, bound: ASHRAE_55_LIMITS.tdb },
    ]);
    expect(result.ppd_ad).toBeNaN();
  });
});

// Upstream has no test for these. Every expected value is what
// pythermalcomfort 4.6.2 returns for the same call.
describe("ankle_draft beyond upstream's tests", () => {
  const base = {
    tdb: 25,
    tr: 25,
    vr: 0.2,
    rh: 50,
    met: 1.2,
    clo: 0.5,
    v_ankle: 0.3,
  };

  test("the docstring example returns 18.5, acceptable", () => {
    expect(ankle_draft({ ...base, units: "SI" })).toEqual({
      ppd_ad: 18.5,
      acceptability: true,
      warnings: [],
    });
  });

  // Upstream converts tdb, tr, vr and v_ankle from IP before it computes or
  // checks anything, and accepts units in any case.
  describe("units", () => {
    const ip = {
      tdb: 77,
      tr: 77,
      vr: 0.656,
      rh: 50,
      met: 1.2,
      clo: 0.5,
      v_ankle: 1.312,
    };

    // The type lists upstream's spellings; a lower-case one is accepted.
    test.each(["IP", "ip"])("units %p converts from IP", (units) => {
      expect(ankle_draft({ ...ip, units: units as "IP" })).toEqual({
        ppd_ad: 23.5,
        acceptability: false,
        warnings: [],
      });
    });

    test("the same call in SI returns the same result", () => {
      const si = { ...ip, tdb: 25, tr: 25, vr: 0.19994, v_ankle: 0.39988 };
      expect(ankle_draft({ ...si, units: "SI" })).toEqual(
        ankle_draft({ ...ip, units: "IP" }),
      );
    });

    test("an IP row carries the value in SI", () => {
      const result = ankle_draft({
        ...ip,
        tdb: 104.1,
        vr: 0.3,
        v_ankle: 0.6,
        units: "IP",
      });
      expect(result.ppd_ad).toBeNaN();
      expect(result.warnings).toEqual([
        {
          key: "tdb",
          role: "input",
          value: 40.05555555555556,
          bound: ASHRAE_55_LIMITS.tdb,
        },
      ]);
    });

    test("104 °F is inside the inclusive bound", () => {
      const result = ankle_draft({
        ...ip,
        tdb: 104,
        vr: 0.3,
        v_ankle: 0.6,
        units: "IP",
      });
      expect(result).toEqual({
        ppd_ad: 0.9,
        acceptability: true,
        warnings: [],
      });
    });

    test("vr 0.7 fps is above 0.2 m/s and throws", () => {
      expect(() =>
        ankle_draft({ ...ip, vr: 0.7, v_ankle: 0.6, units: "IP" }),
      ).toThrow(new RangeError(VR_MESSAGE));
    });
  });

  // ADR 0006: a boolean in range, upstream's NaN where limit_inputs masks.
  describe("acceptability", () => {
    // Upstream compares the ppd_ad it has rounded to one decimal.
    test.each([
      [0.333, 20.0, true],
      [0.334, 20.1, false],
    ])("v_ankle %p gives ppd_ad %p, acceptable %p", (v_ankle, ppd_ad, ok) => {
      expect(ankle_draft({ ...base, v_ankle })).toEqual({
        ppd_ad,
        acceptability: ok,
        warnings: [],
      });
    });

    test("is NaN where limit_inputs masks", () => {
      const result = ankle_draft({ ...base, met: 0.8 });
      expect(result.ppd_ad).toBeNaN();
      expect(result.acceptability).toBeNaN();
    });

    test("is a boolean with limit_inputs false, in range or not", () => {
      const result = ankle_draft({
        ...base,
        vr: 0.1,
        met: 0.8,
        limit_inputs: false,
      });
      expect(result.ppd_ad).toBe(50.5);
      expect(result.acceptability).toBe(false);
    });
  });

  // Each limit upstream warns about is a row (ADR 0001), built whatever
  // limit_inputs is; the gate reads the rows.
  describe("warnings rows", () => {
    test("rows come in upstream's order: tdb, tr, vr, met, clo, then vr's second check", () => {
      const result = ankle_draft({
        tdb: 5,
        tr: 45,
        vr: 2.5,
        rh: 50,
        met: 0.5,
        clo: 2,
        v_ankle: 0.1,
        limit_inputs: false,
      });
      expect(result.ppd_ad).toBe(99.9);
      expect(result.acceptability).toBe(false);
      expect(result.warnings).toEqual([
        { key: "tdb", role: "input", value: 5, bound: ASHRAE_55_LIMITS.tdb },
        { key: "tr", role: "input", value: 45, bound: ASHRAE_55_LIMITS.tr },
        { key: "vr", role: "input", value: 2.5, bound: ASHRAE_55_LIMITS.vr },
        { key: "met", role: "input", value: 0.5, bound: ASHRAE_55_LIMITS.met },
        { key: "clo", role: "input", value: 2, bound: ASHRAE_55_LIMITS.clo },
        { key: "vr", role: "input", value: 2.5, bound: ASHRAE_55_V_LIMITED },
      ]);
    });

    // Upstream names this warning 'v_limited' (ashrae55.py:101 at v4.6.2),
    // the name of its check; the quantity checked is vr. A row's key names
    // the quantity and its bound says which limit it broke.
    test("vr above 0.2 m/s is a vr row bound by ASHRAE_55_V_LIMITED with limit_inputs false", () => {
      const result = ankle_draft({
        ...base,
        vr: 0.5,
        v_ankle: 0.1,
        limit_inputs: false,
      });
      expect(result.ppd_ad).toBe(17.6);
      expect(result.acceptability).toBe(true);
      expect(result.warnings).toEqual([
        { key: "vr", role: "input", value: 0.5, bound: ASHRAE_55_V_LIMITED },
      ]);
      expect(result.warnings[0].bound).toBe(ASHRAE_55_V_LIMITED);
    });

    test("four rows below the throw mask the result", () => {
      const result = ankle_draft({
        tdb: 5,
        tr: 45,
        vr: 0.1,
        rh: 50,
        met: 0.5,
        clo: 2,
        v_ankle: 0.1,
      });
      expect(result.ppd_ad).toBeNaN();
      expect(result.acceptability).toBeNaN();
      expect(result.warnings.map((row) => row.key)).toEqual([
        "tdb",
        "tr",
        "met",
        "clo",
      ]);
    });

    test.each([
      [{ tdb: 10, tr: 10, vr: 0, met: 1, clo: 0 }, 100, false],
      [{ tdb: 40, tr: 40, vr: 0.2, met: 4, clo: 1.5 }, 0, true],
    ])("the limits are inclusive: %p", (input, ppd_ad, acceptability) => {
      expect(
        ankle_draft({ ...input, rh: 50, v_ankle: 0.1 } as AnkleDraftParams),
      ).toEqual({ ppd_ad, acceptability, warnings: [] });
    });
  });

  // Upstream's pmv_ppd_ashrae warns with a UserWarning when the cooling effect
  // cannot be calculated, and ankle_draft passes it on; here it is a console
  // message, behind suppress_warnings (ADR 0001).
  describe("suppress_warnings", () => {
    const no_ce = { ...base, tdb: 50, vr: 0.3, limit_inputs: false };

    test("by default the cooling-effect message reaches the console", () => {
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
      try {
        expect(ankle_draft(no_ce).ppd_ad).toBe(0);
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
        const quiet = ankle_draft({ ...no_ce, suppress_warnings: true });
        expect(warn).not.toHaveBeenCalled();
        expect(quiet).toEqual(ankle_draft(no_ce));
      } finally {
        warn.mockRestore();
      }
    });

    test("a non-boolean throws a TypeError", () => {
      const params = {
        ...base,
        suppress_warnings: "yes",
      } as unknown as AnkleDraftParams;
      expect(() => ankle_draft(params)).toThrow(TypeError);
    });
  });

  describe("errors", () => {
    // Upstream raises when every v_limited is NaN once masked to [0, 0.2],
    // so a negative vr raises too.
    test.each([-0.01, 0.20001, 2.5])("vr %p throws a RangeError", (vr) => {
      expect(() => ankle_draft({ ...base, vr })).toThrow(
        new RangeError(VR_MESSAGE),
      );
    });

    test("vr below 0 computes with limit_inputs false", () => {
      const result = ankle_draft({
        ...base,
        vr: -0.1,
        limit_inputs: false,
      });
      expect(result.ppd_ad).toBe(14.3);
      expect(result.warnings.map((row) => [row.key, row.bound])).toEqual([
        ["vr", ASHRAE_55_LIMITS.vr],
        ["vr", ASHRAE_55_V_LIMITED],
      ]);
    });

    test("limit_inputs that is not a boolean throws upstream's TypeError", () => {
      const params = {
        ...base,
        limit_inputs: "false",
      } as unknown as AnkleDraftParams;
      expect(() => ankle_draft(params)).toThrow(TypeError);
    });

    // Upstream raises a ValueError (ADR 0012: Error), for a non-string too,
    // as it upper-cases str(units).
    test.each(["XX", 5])("units %p throws an Error", (units) => {
      const params = { ...base, units } as unknown as AnkleDraftParams;
      expect(() => ankle_draft(params)).toThrow('"units" must be one of');
    });

    // ADR 0008: upstream raises a TypeError for an unexpected keyword.
    test("the key 'round_output' throws a TypeError naming it", () => {
      const params = {
        ...base,
        round_output: true,
      } as unknown as AnkleDraftParams;
      expect(() => ankle_draft(params)).toThrow(
        new TypeError("ankle_draft got an unexpected key: 'round_output'"),
      );
    });

    // ADR 0002: a positional call fails instead of running as defaults.
    test("a positional call throws a TypeError", () => {
      const call = ankle_draft as unknown as (...args: unknown[]) => unknown;
      expect(() => call(25, 25, 0.2, 50, 1.2, 0.5, 0.3, "SI")).toThrow(
        TypeError,
      );
    });

    const quantities = ["tdb", "tr", "vr", "rh", "met", "clo", "v_ankle"];

    // ADR 0001: a public model throws a TypeError for a non-finite number.
    test.each(
      quantities.flatMap((key) =>
        [NaN, Infinity, -Infinity].map((value) => [key, value] as const),
      ),
    )("%s %p throws a TypeError", (key, value) => {
      const params = { ...base, [key]: value } as unknown as AnkleDraftParams;
      expect(() => ankle_draft(params)).toThrow(TypeError);
    });

    // ADR 0005 as amended: upstream reads True and False as 1 and 0.
    test.each(quantities)("a boolean %s throws a TypeError", (key) => {
      const params = { ...base, [key]: false } as unknown as AnkleDraftParams;
      expect(() => ankle_draft(params)).toThrow(TypeError);
    });

    // ADR 0005: quantities are numbers; upstream would broadcast the list.
    test("an array throws a TypeError", () => {
      const params = { ...base, tdb: [25, 30] } as unknown as AnkleDraftParams;
      expect(() => ankle_draft(params)).toThrow(TypeError);
    });
  });
});
