import { describe, expect, test } from "@jest/globals";
import { set_tmp } from "../../src/models/set_tmp";
import { testDataUrls } from "./comftest";
import { loadTestData, validateResult } from "./testUtils"; // Use modular utilities to load data and check if test should be skipped

let returnArray = false;

// use top-level await to load test data before tests are defined.
let { testData, tolerances } = await loadTestData(
  testDataUrls.setTmp,
  returnArray,
);

describe("set_tmp", () => {
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs } = testCase;
    const {
      tdb,
      tr,
      v,
      rh,
      met,
      clo,
      wme,
      body_surface_area,
      p_atm,
      body_position,
      units,
      limit_inputs = false,
      round,
      calculate_ce,
    } = inputs;

    const kwargs = {
      round,
      calculate_ce,
    };

    const modelResult = set_tmp(
      tdb,
      tr,
      v,
      rh,
      met,
      clo,
      wme,
      body_surface_area,
      p_atm,
      body_position,
      units,
      limit_inputs,
      kwargs,
    );

    validateResult(modelResult, outputs, tolerances, inputs);
  });
});

describe("set_tmp invalid input", () => {
  const valid = { tdb: 25, tr: 25, v: 0.1, rh: 50, met: 1.2, clo: 0.5 };

  test.each([
    ["tdb", { ...valid, tdb: undefined }],
    ["tr", { ...valid, tr: "string" }],
    ["v", { ...valid, v: null }],
    ["rh", { ...valid, rh: NaN }],
    ["met", { ...valid, met: Infinity }],
    ["clo", { ...valid, clo: undefined }],
  ])("returns NaN result when %s is invalid", (_label, args) => {
    const result = set_tmp(
      args.tdb,
      args.tr,
      args.v,
      args.rh,
      args.met,
      args.clo,
    );
    expect(result.set).toBeNaN();
  });
});
