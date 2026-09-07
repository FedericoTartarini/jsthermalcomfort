import { describe, expect, test } from "@jest/globals";
import { pmv_ppd } from "../../src/models/pmv_ppd.js";
import { testDataUrls } from "./comftest";
import { loadTestData, validateResult } from "./testUtils.js";

let returnArray = false;

// use top-level await to load test data before tests are defined.
let { testData, tolerances } = await loadTestData(
  testDataUrls.pmvPpd,
  returnArray,
);

describe("pmv_pdd", () => {
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const {
      tdb,
      tr,
      vr,
      rh,
      met,
      clo,
      wme,
      standard,
      units,
      limit_inputs,
      airspeed_control,
    } = inputs;

    const kwargs = {
      units,
      limit_inputs,
      airspeed_control,
    };

    const modelResult = pmv_ppd(
      tdb,
      tr,
      vr,
      rh,
      met,
      clo,
      wme,
      standard,
      kwargs,
    );

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });

  test("round_output: false returns raw unrounded finite values", () => {
    const result = pmv_ppd(25, 25, 0.3, 50, 1.2, 0.5, 0, "ISO", {
      round_output: false,
    });
    expect(Number.isFinite(result.pmv)).toBe(true);
    expect(Number.isFinite(result.ppd)).toBe(true);
  });

  test("round_output: true rounds pmv to 2 and ppd to 1 decimal places", () => {
    const raw = pmv_ppd(25, 25, 0.3, 50, 1.2, 0.5, 0, "ISO", {
      round_output: false,
    });
    const rounded = pmv_ppd(25, 25, 0.3, 50, 1.2, 0.5, 0, "ISO", {
      round_output: true,
    });
    expect(rounded.pmv).toBe(parseFloat(raw.pmv.toFixed(2)));
    expect(rounded.ppd).toBe(parseFloat(raw.ppd.toFixed(1)));
  });

  test("default behaviour rounds output", () => {
    const defaultResult = pmv_ppd(25, 25, 0.3, 50, 1.2, 0.5);
    const roundedResult = pmv_ppd(25, 25, 0.3, 50, 1.2, 0.5, 0, "ISO", {
      round_output: true,
    });
    expect(defaultResult.pmv).toBe(roundedResult.pmv);
    expect(defaultResult.ppd).toBe(roundedResult.ppd);
  });
});

// ---------------------------------------------------------------------------
// Input validation tests
// ---------------------------------------------------------------------------
describe("pmv_ppd input validation", () => {
  test.each([
    ["tdb", "25", 25, 0.1, 50, 1.2, 0.5],
    ["tr", 25, "25", 0.1, 50, 1.2, 0.5],
    ["vr", 25, 25, "0.1", 50, 1.2, 0.5],
    ["rh", 25, 25, 0.1, "50", 1.2, 0.5],
    ["met", 25, 25, 0.1, 50, "1.2", 0.5],
    ["clo", 25, 25, 0.1, 50, 1.2, "0.5"],
  ])("throws TypeError if %s is not a number", (_, ...args) => {
    expect(() => pmv_ppd(...args)).toThrow(TypeError);
  });

  test("throws TypeError if wme is not a number", () => {
    expect(() => pmv_ppd(25, 25, 0.1, 50, 1.2, 0.5, "0")).toThrow(TypeError);
  });

  test("throws Error if standard is not a valid enum", () => {
    expect(() => pmv_ppd(25, 25, 0.1, 50, 1.2, 0.5, 0, "INVALID")).toThrow(
      Error,
    );
  });

  test("throws Error if units is not a valid enum", () => {
    expect(() =>
      pmv_ppd(25, 25, 0.1, 50, 1.2, 0.5, 0, "ISO", { units: "INVALID" }),
    ).toThrow(Error);
  });

  test("throws TypeError if limit_inputs is not a boolean", () => {
    expect(() =>
      pmv_ppd(25, 25, 0.1, 50, 1.2, 0.5, 0, "ISO", { limit_inputs: "true" }),
    ).toThrow(TypeError);
  });

  test("throws TypeError if airspeed_control is not a boolean", () => {
    expect(() =>
      pmv_ppd(25, 25, 0.1, 50, 1.2, 0.5, 0, "ISO", {
        airspeed_control: "true",
      }),
    ).toThrow(TypeError);
  });

  test("throws TypeError if round_output is not a boolean", () => {
    expect(() =>
      pmv_ppd(25, 25, 0.1, 50, 1.2, 0.5, 0, "ISO", { round_output: "true" }),
    ).toThrow(TypeError);
  });
});

// Issue #195. pythermalcomfort's pmv_ppd_iso applies the ISO 7730 Clause 4
// limit on partial water vapour pressure; jsthermalcomfort did not, so warm
// humid conditions returned a number where Python returned NaN.
//
// pa = rh * 10 * exp(16.6536 - 4030.183 / (tdb + 235)), and pa = 2700 Pa falls
// at these relative humidities. Values from solving the equation, not measured
// from either library.
describe("pmv_ppd ISO vapour pressure limit (#195)", () => {
  const AT_LIMIT = [
    { tdb: 25, rh: 85.244688 },
    { tdb: 28, rh: 71.429553 },
    { tdb: 30, rh: 63.628386 },
  ];

  test.each(AT_LIMIT)(
    "pa exactly at 2700 Pa is valid (tdb=$tdb, rh=$rh)",
    ({ tdb, rh }) => {
      const result = pmv_ppd(tdb, tdb, 0.1, rh, 1.2, 0.5, 0, "ISO", {
        limit_inputs: true,
      });
      // The bound is inclusive in both libraries, so exactly on it must return
      // a number. An approximate rh would not have caught an off-by-epsilon.
      expect(Number.isFinite(result.pmv)).toBe(true);
      expect(Number.isFinite(result.ppd)).toBe(true);
    },
  );

  test.each(AT_LIMIT)(
    "pa just above 2700 Pa NaNs pmv, ppd and tsv (tdb=$tdb)",
    ({ tdb, rh }) => {
      const result = pmv_ppd(tdb, tdb, 0.1, rh + 0.02, 1.2, 0.5, 0, "ISO", {
        limit_inputs: true,
      });
      expect(result.pmv).toBeNaN();
      expect(result.ppd).toBeNaN();
      expect(result.tsv).toBeNaN();
    },
  );

  test("the NaN comes from the vapour pressure bound, not the PMV output gate", () => {
    // Every input is inside its own limit here, and with limits off the PMV is
    // well inside [-2, 2]. So the NaN above can only be the pa bound.
    const unlimited = pmv_ppd(30, 30, 0.1, 90, 1.2, 0.5, 0, "ISO", {
      limit_inputs: false,
    });
    expect(Number.isFinite(unlimited.pmv)).toBe(true);
    expect(unlimited.pmv).toBeGreaterThan(-2);
    expect(unlimited.pmv).toBeLessThan(2);

    const limited = pmv_ppd(30, 30, 0.1, 90, 1.2, 0.5, 0, "ISO", {
      limit_inputs: true,
    });
    expect(limited.pmv).toBeNaN();
  });

  test("the bound is ISO-only; ASHRAE is unaffected", () => {
    // ASHRAE 55 has no vapour pressure limit, and pythermalcomfort's
    // pmv_ppd_ashrae does not apply one either.
    const result = pmv_ppd(30, 30, 0.1, 90, 1.2, 0.5, 0, "ASHRAE", {
      limit_inputs: true,
    });
    expect(Number.isFinite(result.pmv)).toBe(true);
  });
});
