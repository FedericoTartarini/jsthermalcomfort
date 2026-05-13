import { expect, describe, test } from "@jest/globals";
import { phs } from "../../src/models/phs";
import { testDataUrls } from "./comftest"; // Import test URLs from comftest.js
import {
  assertNonEmptyRows,
  loadTestData,
  validateResult,
} from "./testUtils.js";

// Validated against pythermalcomfort 3.9.3.

const testDataUrl = testDataUrls.phs;

// Load data at module scope so test.each registers one test per row.
// loadTestData filters out array-input rows; the secondary filter below
// also drops rows whose outputs are missing or contain arrays.
const { testData, tolerances } = await loadTestData(testDataUrl, false);

const scalarRows = assertNonEmptyRows(
  testData.data.filter(({ outputs }) => {
    if (outputs === undefined || outputs === null) return false;
    return !Object.values(outputs).some((value) => Array.isArray(value));
  }),
  "phs scalar rows with finite outputs",
);

describe("phs", () => {
  test.each(scalarRows)("row #%#", ({ inputs, outputs }) => {
    const result = phs(
      inputs.tdb,
      inputs.tr,
      inputs.v,
      inputs.rh,
      inputs.met,
      inputs.clo,
      inputs.posture,
      inputs.wme,
      "7933-2004",
      inputs,
    );

    // Per-key tolerance overrides: d_lim* accumulates float-boundary
    // crossings (+/- 1.5 minute), sweat_loss_g / evap_load_wm2_min
    // accumulate larger absolute error (+/- 10), sweat_rate_watt diverges
    // by +/- 0.3 because JS uses half-up rounding while Python uses
    // banker's rounding. Build a per-row tolerance map so validateResult
    // applies the correct tolerance for each output key.
    const perRowTolerances = { ...(tolerances ?? {}) };
    for (const key of Object.keys(outputs)) {
      if (key.startsWith("d_lim")) {
        perRowTolerances[key] = 1.5;
      } else if (key === "sweat_loss_g" || key === "evap_load_wm2_min") {
        perRowTolerances[key] = 10;
      } else if (key === "sweat_rate_watt") {
        perRowTolerances[key] = 0.3;
      }
    }

    validateResult(result, outputs, perRowTolerances, inputs);
  });
});

// ---------------------------------------------------------------------------
// Input validation tests
// ---------------------------------------------------------------------------
describe("phs input validation", () => {
  test.each([
    ["tdb", "40", 40, 0.3, 33.85, 2.5, 0.5, "standing"],
    ["tr", 40, "40", 0.3, 33.85, 2.5, 0.5, "standing"],
    ["v", 40, 40, "0.3", 33.85, 2.5, 0.5, "standing"],
    ["rh", 40, 40, 0.3, "33.85", 2.5, 0.5, "standing"],
    ["met", 40, 40, 0.3, 33.85, "2.5", 0.5, "standing"],
    ["clo", 40, 40, 0.3, 33.85, 2.5, "0.5", "standing"],
    ["wme", 40, 40, 0.3, 33.85, 2.5, 0.5, "standing", "0"],
  ])("throws TypeError if %s is not a number", (_, ...args) => {
    expect(() => phs(...args)).toThrow(TypeError);
  });

  test("throws Error if model is not a valid enum", () => {
    expect(() =>
      phs(40, 40, 0.3, 33.85, 2.5, 0.5, "standing", 0, "INVALID"),
    ).toThrow(Error);
  });

  test("throws TypeError if kwargs.round is not a boolean", () => {
    expect(() =>
      phs(40, 40, 0.3, 33.85, 2.5, 0.5, "standing", 0, "7933-2023", {
        round: "true",
      }),
    ).toThrow(TypeError);
  });

  test("throws TypeError if kwargs.limit_inputs is not a boolean", () => {
    expect(() =>
      phs(40, 40, 0.3, 33.85, 2.5, 0.5, "standing", 0, "7933-2023", {
        limit_inputs: "true",
      }),
    ).toThrow(TypeError);
  });

  test("throws Error if posture is an invalid string", () => {
    expect(() => phs(40, 40, 0.3, 33.85, 2.5, 0.5, "invalid")).toThrow(Error);
  });

  test("throws Error if posture is an invalid number", () => {
    expect(() => phs(40, 40, 0.3, 33.85, 2.5, 0.5, 5)).toThrow(Error);
  });

  test.each([
    ["i_mst", { i_mst: "0.38" }],
    ["a_p", { a_p: "0.54" }],
    ["weight", { weight: "75" }],
    ["height", { height: "1.8" }],
    ["walk_sp", { walk_sp: "0" }],
    ["theta", { theta: "0" }],
    ["acclimatized", { acclimatized: "100" }],
    ["duration", { duration: "480" }],
    ["f_r", { f_r: "0.42" }],
    ["t_sk", { t_sk: "34.1" }],
    ["t_cr", { t_cr: "36.8" }],
    ["t_re", { t_re: "36.8" }],
    ["t_cr_eq", { t_cr_eq: "36.8" }],
    ["t_sk_t_cr_wg", { t_sk_t_cr_wg: "0.3" }],
    ["sweat_rate_watt", { sweat_rate_watt: "0" }],
    ["evap_load_wm2_min", { evap_load_wm2_min: "0" }],
  ])("throws TypeError if kwargs.%s is not a number", (_, kwargs) => {
    expect(() =>
      phs(40, 40, 0.3, 33.85, 2.5, 0.5, "standing", 0, "7933-2023", kwargs),
    ).toThrow(TypeError);
  });

  test("throws Error if kwargs.drink is not a valid enum", () => {
    expect(() =>
      phs(40, 40, 0.3, 33.85, 2.5, 0.5, "standing", 0, "7933-2023", {
        drink: 2,
      }),
    ).toThrow(Error);
  });

  test.each([
    ["acclimatized", { acclimatized: 50 }],
    ["acclimatized", { acclimatized: 75 }],
  ])("throws Error if kwargs.%s is not in {0, 100}", (_, kwargs) => {
    expect(() =>
      phs(40, 40, 0.3, 33.85, 2.5, 0.5, "standing", 0, "7933-2023", kwargs),
    ).toThrow(Error);
  });

  test.each([
    ["weight=0", { weight: 0 }],
    ["weight=-1", { weight: -1 }],
    ["weight=1001", { weight: 1001 }],
    ["t_sk_t_cr_wg=-0.1", { t_sk_t_cr_wg: -0.1 }],
    ["t_sk_t_cr_wg=1.1", { t_sk_t_cr_wg: 1.1 }],
    ["sweat_rate_watt=-1", { sweat_rate_watt: -1 }],
    ["evap_load_wm2_min=-1", { evap_load_wm2_min: -1 }],
  ])("throws RangeError if kwargs.%s is out of range", (_, kwargs) => {
    expect(() =>
      phs(40, 40, 0.3, 33.85, 2.5, 0.5, "standing", 0, "7933-2023", kwargs),
    ).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// Scalar tests — out-of-range inputs return all NaN
// ---------------------------------------------------------------------------
describe("phs scalar tests — inputs outside ISO 7933 applicability limits return all NaN", () => {
  const NAN_RESULT_KEYS = [
    "t_re",
    "t_sk",
    "t_cr",
    "t_cr_eq",
    "t_sk_t_cr_wg",
    "d_lim_loss_50",
    "d_lim_loss_95",
    "d_lim_t_re",
    "sweat_rate_watt",
    "sweat_loss_g",
    "evap_load_wm2_min",
  ];

  test("returns all NaN when tdb is below ISO 7933 lower limit (< 15)", () => {
    const result = phs(10, 40, 0.3, 33.85, 2.5, 0.5, "standing");
    NAN_RESULT_KEYS.forEach((key) => expect(result[key]).toBeNaN());
  });

  test("returns all NaN when tdb is above ISO 7933 upper limit (> 50)", () => {
    const result = phs(55, 55, 0.3, 33.85, 2.5, 0.5, "standing");
    NAN_RESULT_KEYS.forEach((key) => expect(result[key]).toBeNaN());
  });

  test("returns all NaN when v is above ISO 7933 upper limit (> 3)", () => {
    const result = phs(40, 40, 5, 33.85, 2.5, 0.5, "standing");
    NAN_RESULT_KEYS.forEach((key) => expect(result[key]).toBeNaN());
  });

  test("returns all NaN when tr is below ISO 7933 lower limit (< 0)", () => {
    const result = phs(40, -5, 0.3, 33.85, 2.5, 0.5, "standing");
    NAN_RESULT_KEYS.forEach((key) => expect(result[key]).toBeNaN());
  });

  test("returns all NaN when tr is above ISO 7933 upper limit (> 60)", () => {
    const result = phs(40, 65, 0.3, 33.85, 2.5, 0.5, "standing");
    NAN_RESULT_KEYS.forEach((key) => expect(result[key]).toBeNaN());
  });

  test("returns all NaN when rh produces p_a above ISO 7933 upper limit", () => {
    // tdb=40: rh_max ≈ 61%, rh=90 pushes p_a above 4.5 kPa
    const result = phs(40, 40, 0.3, 90, 2.5, 0.5, "standing");
    NAN_RESULT_KEYS.forEach((key) => expect(result[key]).toBeNaN());
  });

  test("returns all NaN when met is below ISO 7933 lower limit", () => {
    const result = phs(40, 40, 0.3, 33.85, 0.5, 0.5, "standing");
    NAN_RESULT_KEYS.forEach((key) => expect(result[key]).toBeNaN());
  });

  test("returns all NaN when met is above ISO 7933 upper limit", () => {
    const result = phs(40, 40, 0.3, 33.85, 8, 0.5, "standing");
    NAN_RESULT_KEYS.forEach((key) => expect(result[key]).toBeNaN());
  });

  test("returns all NaN when clo is below ISO 7933 lower limit (< 0.1)", () => {
    const result = phs(40, 40, 0.3, 33.85, 2.5, 0.05, "standing");
    NAN_RESULT_KEYS.forEach((key) => expect(result[key]).toBeNaN());
  });

  test("returns all NaN when clo is above ISO 7933 upper limit (> 1)", () => {
    const result = phs(40, 40, 0.3, 33.85, 2.5, 1.5, "standing");
    NAN_RESULT_KEYS.forEach((key) => expect(result[key]).toBeNaN());
  });

  test("valid inputs return finite results", () => {
    const result = phs(40, 40, 0.3, 33.85, 2.5, 0.5, "standing");
    NAN_RESULT_KEYS.forEach((key) =>
      expect(Number.isFinite(result[key])).toBe(true),
    );
  });

  test("returns all NaN when out-of-range with limit_inputs=true", () => {
    const result = phs(
      10,
      40,
      0.3,
      33.85,
      2.5,
      0.5,
      "standing",
      0,
      "7933-2023",
      {
        limit_inputs: true,
      },
    );
    NAN_RESULT_KEYS.forEach((key) => expect(result[key]).toBeNaN());
  });

  test("returns finite results when out-of-range with limit_inputs=false", () => {
    const result = phs(
      10,
      40,
      0.3,
      33.85,
      2.5,
      0.5,
      "standing",
      0,
      "7933-2023",
      {
        limit_inputs: false,
      },
    );
    NAN_RESULT_KEYS.forEach((key) =>
      expect(Number.isFinite(result[key])).toBe(true),
    );
  });

  test("returns all NaN when p_a < 0.5 kPa with model 7933-2023 (2023 lower limit)", () => {
    // tdb=20, rh=5 → p_a ≈ 0.12 kPa, valid for 2004 (≥ 0) but invalid for 2023 (< 0.5)
    const result = phs(20, 20, 0.3, 5, 2.5, 0.5, "standing", 0, "7933-2023");
    NAN_RESULT_KEYS.forEach((key) => expect(result[key]).toBeNaN());
  });

  test("returns finite results when p_a < 0.5 kPa with model 7933-2004 (2004 lower limit is 0)", () => {
    // same input, 2004 accepts p_a ≥ 0
    const result = phs(20, 20, 0.3, 5, 2.5, 0.5, "standing", 0, "7933-2004");
    NAN_RESULT_KEYS.forEach((key) =>
      expect(Number.isFinite(result[key])).toBe(true),
    );
  });
});
