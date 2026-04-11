// Validation data loaded from the shared validation-data-comfort-models
// repository via the same URL-based mechanism as the original pmv_ppd.test.js.
import { describe, test } from "@jest/globals";
import { pmv_ppd_ashrae } from "../../src/models/pmv_ppd_ashrae.js";
import { testDataUrls } from "./comftest";
import { loadTestData, validateResult } from "./testUtils.js";

// Load test data from the shared repository (filters out array-input rows).
let { testData, tolerances } = await loadTestData(testDataUrls.pmvPpd, false);

// Keep only scalar SI ASHRAE rows.
const ashraeData = testData.data.filter((testCase) => {
  const { standard, units } = testCase.inputs;
  const isAshrae = standard === "ASHRAE";
  const isSI = !units || units.toLowerCase() === "si";
  return isAshrae && isSI;
});

describe("pmv_ppd_ashrae", () => {
  test.each(ashraeData)("ASHRAE test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { tdb, tr, vr, rh, met, clo, wme, limit_inputs, airspeed_control } =
      inputs;

    // Pass optional flags through kwargs so rows with limit_inputs=false
    // or airspeed_control=false are handled correctly.
    const kwargs = { limit_inputs, airspeed_control };

    const modelResult = pmv_ppd_ashrae(tdb, tr, vr, rh, met, clo, wme, kwargs);

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });
});

// ---------------------------------------------------------------------------
// Input validation tests
// ---------------------------------------------------------------------------
describe("pmv_ppd_ashrae input validation", () => {
  test.each([
    ["tdb", "25", 25, 0.1, 50, 1.2, 0.5],
    ["tr", 25, "25", 0.1, 50, 1.2, 0.5],
    ["vr", 25, 25, "0.1", 50, 1.2, 0.5],
    ["rh", 25, 25, 0.1, "50", 1.2, 0.5],
    ["met", 25, 25, 0.1, 50, "1.2", 0.5],
    ["clo", 25, 25, 0.1, 50, 1.2, "0.5"],
  ])("throws TypeError if %s is not a number", (_, ...args) => {
    expect(() => pmv_ppd_ashrae(...args)).toThrow(TypeError);
  });
});
