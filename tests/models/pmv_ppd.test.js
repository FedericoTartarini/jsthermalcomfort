import { describe, test } from "@jest/globals";
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
});
