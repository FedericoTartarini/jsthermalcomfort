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
