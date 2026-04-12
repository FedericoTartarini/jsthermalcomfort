import { describe, expect, test } from "@jest/globals";
import { solar_gain } from "../../src/models/solar_gain";
import { testDataUrls } from "./comftest";
import { loadTestData, validateResult } from "./testUtils";

let returnArray = false;

// use top-level await to load test data before tests are defined.
let { testData, tolerances } = await loadTestData(
  testDataUrls.solarGain,
  returnArray,
);

describe("solar_gain", () => {
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const {
      sol_altitude,
      sharp,
      sol_radiation_dir,
      sol_transmittance,
      f_svv,
      f_bes,
      asw,
      posture,
    } = inputs;
    const modelResult = solar_gain(
      sol_altitude,
      sharp,
      sol_radiation_dir,
      sol_transmittance,
      f_svv,
      f_bes,
      asw,
      posture,
    );

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });
});

describe("solar_gain invalid input", () => {
  const valid = {
    sol_altitude: 0,
    sharp: 120,
    sol_radiation_dir: 800,
    sol_transmittance: 0.5,
    f_svv: 0.5,
    f_bes: 0.5,
  };

  test.each([
    ["sol_altitude", { ...valid, sol_altitude: undefined }],
    ["sharp", { ...valid, sharp: "string" }],
    ["sol_radiation_dir", { ...valid, sol_radiation_dir: null }],
    ["sol_transmittance", { ...valid, sol_transmittance: NaN }],
    ["f_svv", { ...valid, f_svv: Infinity }],
  ])("returns NaN result when %s is invalid", (_label, args) => {
    const result = solar_gain(
      args.sol_altitude,
      args.sharp,
      args.sol_radiation_dir,
      args.sol_transmittance,
      args.f_svv,
      args.f_bes,
    );
    expect(result.erf).toBeNaN();
  });
});
