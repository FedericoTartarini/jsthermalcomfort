import { describe, expect, test } from "@jest/globals";
import { pmv_athb, athb } from "../../src/models/athb.js";
import jsthermalcomfort, {
  pmv_athb as exported_pmv_athb,
  athb as exported_athb,
} from "../../src/index.js";
import { testDataUrls } from "./comftest";
import {
  assertNonEmptyRows,
  filterScalarRows,
  loadTestData,
  validateResult,
} from "./testUtils"; // Import shared utilities

// Load the array rows too, so the list-input row Python runs is ported with Array.map().
let returnArray = true;

// use top-level await to load test data before tests are defined.
let { testData, tolerances } = await loadTestData(
  testDataUrls.athb,
  returnArray,
);

const scalarRows = assertNonEmptyRows(
  filterScalarRows(testData.data),
  "ts_athb.json scalar rows",
);
const arrayRows = assertNonEmptyRows(
  testData.data.filter((row) => !scalarRows.includes(row)),
  "ts_athb.json array rows",
);

describe("pmv_athb", () => {
  test.each(scalarRows)("test_athb - reference case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { tdb, tr, vr, rh, met, t_running_mean } = inputs;
    const modelResult = pmv_athb(tdb, tr, vr, rh, met, t_running_mean);

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });

  test.each(arrayRows)("test_athb - list input case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { tdb, tr, vr, rh, met, t_running_mean } = inputs;
    const results = tdb.map((_, i) =>
      pmv_athb(tdb[i], tr[i], vr[i], rh[i], met[i], t_running_mean[i]),
    );

    results.forEach((result, i) => {
      validateResult(
        result,
        { athb_pmv: expectedOutput.athb_pmv[i] },
        tolerances,
        inputs,
      );
    });
  });
});

// ---------------------------------------------------------------------------
// clo parameter tests
// ---------------------------------------------------------------------------
describe("pmv_athb clo parameter", () => {
  // Reference values from pythermalcomfort pmv_athb(25, 25, 0.1, 50, 1.1, 20, clo=...).
  test.each([
    [0.3, -0.148],
    [0.5, 0.061],
    [1.0, 0.41],
  ])("uses clo = %s directly", (clo, expected) => {
    expect(pmv_athb(25, 25, 0.1, 50, 1.1, 20, clo)).toEqual({
      athb_pmv: expected,
    });
  });

  test("calculates clo from the adaptive equation when clo is omitted, undefined or false", () => {
    expect(pmv_athb(25, 25, 0.1, 50, 1.1, 20)).toEqual({ athb_pmv: 0.17 });
    expect(pmv_athb(25, 25, 0.1, 50, 1.1, 20, undefined)).toEqual({
      athb_pmv: 0.17,
    });
    expect(pmv_athb(25, 25, 0.1, 50, 1.1, 20, false)).toEqual({
      athb_pmv: 0.17,
    });
  });

  test("treats clo = 0 as 0 clo, not as the default", () => {
    // pythermalcomfort checks `clo is False`, so 0 is used as a value.
    expect(pmv_athb(25, 25, 0.1, 50, 1.1, 20, 0)).toEqual({
      athb_pmv: -0.705,
    });
  });
});

// ---------------------------------------------------------------------------
// Input validation tests
// ---------------------------------------------------------------------------
describe("pmv_athb input validation", () => {
  const validArgs = [25, 25, 0.1, 50, 1.1, 20];
  const parameters = ["tdb", "tr", "vr", "rh", "met", "t_running_mean"];

  test.each([
    ["missing", undefined],
    ["null", null],
    ["string", "25"],
    ["boolean", true],
    ["NaN", NaN],
    ["infinity", Infinity],
    ["negative infinity", -Infinity],
    ["array", [25]],
  ])("throws TypeError for %s inputs for every parameter", (_, value) => {
    parameters.forEach((parameter, i) => {
      const args = [...validArgs];
      args[i] = value;
      expect(() => pmv_athb(...args)).toThrow(TypeError);
      expect(() => pmv_athb(...args)).toThrow(`Parameter "${parameter}"`);
    });
  });

  test.each([
    ["null", null],
    ["string", "0.5"],
    ["true", true],
    ["NaN", NaN],
    ["infinity", Infinity],
    ["negative infinity", -Infinity],
    ["array", [0.5]],
  ])("throws TypeError for %s clo", (_, clo) => {
    expect(() => pmv_athb(...validArgs, clo)).toThrow(TypeError);
    expect(() => pmv_athb(...validArgs, clo)).toThrow('Parameter "clo"');
  });

  test("does not range-check inputs, as in pythermalcomfort", () => {
    // pythermalcomfort's ATHBInputs only checks types; values from Python.
    expect(pmv_athb(25, 25, 0.1, 150, 1.1, 20)).toEqual({ athb_pmv: 0.506 });
    expect(pmv_athb(25, 25, -1, 50, 1.1, 20)).toEqual({ athb_pmv: 0.191 });
  });
});

// ---------------------------------------------------------------------------
// Alias and export tests
// ---------------------------------------------------------------------------
describe("pmv_athb alias and exports", () => {
  test("athb is the same function object as pmv_athb", () => {
    expect(athb).toBe(pmv_athb);
    expect(athb(25, 25, 0.1, 50, 1.1, 20, 0.5)).toEqual(
      pmv_athb(25, 25, 0.1, 50, 1.1, 20, 0.5),
    );
  });

  test("is available through named and default package exports", () => {
    expect(exported_pmv_athb).toBe(pmv_athb);
    expect(exported_athb).toBe(pmv_athb);
    expect(jsthermalcomfort.models.pmv_athb).toBe(pmv_athb);
    expect(jsthermalcomfort.models.athb).toBe(pmv_athb);
  });
});
