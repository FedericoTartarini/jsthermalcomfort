import { describe, expect, test } from "@jest/globals";
import { pet_steady } from "../../src/models/pet_steady";
import { testDataUrls } from "./comftest";
import { loadTestData, validateResult } from "./testUtils"; // Import shared utilities

let returnArray = false;

// use top-level await to load test data before tests are defined.
let { testData, tolerances } = await loadTestData(
  testDataUrls.petSteady,
  returnArray,
);

describe("pet_steady", () => {
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { tdb, tr, v, rh, met, clo } = inputs;
    const modelResult = pet_steady(tdb, tr, v, rh, met, clo);

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });
});

describe("pet_steady invalid input", () => {
  const valid = { tdb: 20, tr: 20, v: 0.3, rh: 50, met: 1.37, clo: 0.5 };

  test.each([
    ["tdb=undefined", { ...valid, tdb: undefined }],
    ["tr='string'", { ...valid, tr: "string" }],
    ["v=null", { ...valid, v: null }],
    ["rh=NaN", { ...valid, rh: NaN }],
    ["met=Infinity", { ...valid, met: Infinity }],
  ])("returns NaN result when %s is invalid", (_label, args) => {
    const result = pet_steady(
      args.tdb,
      args.tr,
      args.v,
      args.rh,
      args.met,
      args.clo,
    );
    expect(result.pet).toBeNaN();
  });
});
