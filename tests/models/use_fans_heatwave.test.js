import { describe, expect, test } from "@jest/globals";
import { use_fans_heatwaves } from "../../src/models/use_fans_heatwave";
import { testDataUrls } from "./comftest"; // Import all test URLs from comftest.js
import { loadTestData, validateResult } from "./testUtils";

let returnArray = false;

// use top-level await to load test data before tests are defined.
let { testData, tolerances } = await loadTestData(
  testDataUrls.use_fans_heatwaves,
  returnArray,
);

describe("use_fans_heatwaves", () => {
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
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
      position: body_position,
      units,
      max_skin_blood_flow,
      kwargs,
    } = inputs;

    const modelResult = use_fans_heatwaves(
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
      max_skin_blood_flow,
      kwargs,
    );

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });
});

describe("use_fans_heatwaves invalid input", () => {
  const valid = { tdb: 25, tr: 25, v: 0.1, rh: 50, met: 1.2, clo: 0.5 };

  test.each([
    ["tdb", { ...valid, tdb: undefined }],
    ["tr", { ...valid, tr: "string" }],
    ["v", { ...valid, v: null }],
    ["rh", { ...valid, rh: NaN }],
    ["met", { ...valid, met: Infinity }],
    ["clo", { ...valid, clo: undefined }],
  ])("returns NaN when %s is invalid", (_label, args) => {
    const result = use_fans_heatwaves(
      args.tdb,
      args.tr,
      args.v,
      args.rh,
      args.met,
      args.clo,
    );
    expect(result.e_skin).toBeNaN();
  });
});
