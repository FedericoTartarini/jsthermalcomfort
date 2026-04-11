import { describe } from "@jest/globals";
import { ankle_draft } from "../../src/models/ankle_draft.js";
import { testDataUrls } from "./comftest";
import { loadTestData, validateResult } from "./testUtils"; // Import shared utilities

let returnArray = false;

// use top-level await to load test data before tests are defined.
let { testData, tolerances } = await loadTestData(
  testDataUrls.ankleDraft,
  returnArray,
);

describe("ankle_draft", () => {
  test.each(testData.data)("Test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { tdb, tr, vr, rh, met, clo, v_ankle, units } = inputs;
    const modelResult = ankle_draft(tdb, tr, vr, rh, met, clo, v_ankle, units);

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });
});

// ---------------------------------------------------------------------------
// Input validation tests
// ---------------------------------------------------------------------------
describe("ankle_draft input validation", () => {
  test.each([
    ["tdb", "25", 25, 0.1, 50, 1.2, 0.5, 0.1],
    ["tr", 25, "25", 0.1, 50, 1.2, 0.5, 0.1],
    ["vr", 25, 25, "0.1", 50, 1.2, 0.5, 0.1],
    ["rh", 25, 25, 0.1, "50", 1.2, 0.5, 0.1],
    ["met", 25, 25, 0.1, 50, "1.2", 0.5, 0.1],
    ["clo", 25, 25, 0.1, 50, 1.2, "0.5", 0.1],
    ["v_ankle", 25, 25, 0.1, 50, 1.2, 0.5, "0.1"],
  ])("throws TypeError if %s is not a number", (_, ...args) => {
    expect(() => ankle_draft(...args)).toThrow(TypeError);
  });

  test("throws Error if units is invalid", () => {
    expect(() =>
      ankle_draft(25, 25, 0.1, 50, 1.2, 0.5, 0.1, "INVALID"),
    ).toThrow(Error);
  });
});
