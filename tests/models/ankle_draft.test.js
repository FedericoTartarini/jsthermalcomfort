import { expect, jest, test } from "@jest/globals";
import { ankle_draft } from "../../src/models/ankle_draft.js";
import { testDataUrls } from "./comftest";
import { assertNonEmptyRows, loadTestData, validateResult } from "./testUtils";

// Mirror tests/test_ankle_draft.py in pythermalcomfort: keep its test names,
// inputs, and assertions. Extra JS-specific regressions live in the sibling
// ankle_draft.regression.test.js file. Python ValueError maps to JS RangeError;
// UserWarning maps to console.warn; the returned dataclass maps to an object.
const { testData, tolerances } = await loadTestData(
  testDataUrls.ankleDraft,
  true,
);
assertNonEmptyRows(testData.data, "ankle_draft reference table");

test("test_ankle_draft", () => {
  for (const testCase of testData.data) {
    const { inputs, outputs: expectedOutput } = testCase;
    const { tdb, tr, vr, rh, met, clo, v_ankle, units, limit_inputs } = inputs;
    const modelResult = ankle_draft(
      tdb,
      tr,
      vr,
      rh,
      met,
      clo,
      v_ankle,
      units,
      limit_inputs,
    );

    validateResult(modelResult, expectedOutput, tolerances, inputs);
  }
});

test("test_ankle_draft_invalid_input_range", () => {
  expect(() => ankle_draft(25, 25, 0.3, 50, 1.2, 0.5, 7)).toThrow(RangeError);
  expect(() =>
    ankle_draft(25, 25, 0.3, 50, 1.2, 0.5, [0.1, 0.2, 0.3, 0.4]),
  ).toThrow(RangeError);
});

test("test_ankle_draft_outside_ashrae_range", () => {
  const scalar = ankle_draft(50, 25, 0.1, 50, 1.2, 0.5, 0.1);
  expect(scalar.ppd_ad).toBeNaN();

  const array = ankle_draft([50, 45], 25, 0.1, 50, 1.2, 0.5, 0.1);
  expect(array.ppd_ad.every(Number.isNaN)).toBe(true);
});

test("test_ankle_draft_list_inputs", () => {
  const result = ankle_draft(
    [25, 26, 27],
    [25, 26, 27],
    [0.1, 0.1, 0.1],
    [50, 50, 50],
    [1.2, 1.2, 1.2],
    [0.5, 0.5, 0.5],
    [0.1, 0.1, 0.1],
    "SI",
  );
  expect(result).toBeInstanceOf(Object);
  expect(result).toHaveProperty("ppd_ad");
  expect(result).toHaveProperty("acceptability");
  expect(result.ppd_ad).toHaveLength(3);
  expect(result.acceptability).toHaveLength(3);
});

test("test_ankle_draft_invalid_list_inputs", () => {
  expect(() =>
    ankle_draft(
      [25, "invalid", 27],
      [25, 26, 27],
      [0.1, 0.1, 0.1],
      [50, 50, 50],
      [1.2, 1.2, 1.2],
      [0.5, 0.5, 0.5],
      [0.1, 0.1, 0.1],
      "SI",
    ),
  ).toThrow(TypeError);
});

test("test_ankle_draft_limit_inputs_false_suppresses_warning_and_nan", () => {
  // Python treats UserWarning as an error in this test.
  const warn = jest.spyOn(console, "warn").mockImplementation((message) => {
    throw new Error(message);
  });
  try {
    const result = ankle_draft(50, 25, 0.1, 50, 1.2, 0.5, 0.1, "SI", false);
    expect(result.ppd_ad).not.toBeNaN();
  } finally {
    warn.mockRestore();
  }
});

test("test_ankle_draft_limit_inputs_false_skips_valueerror", () => {
  const result = ankle_draft(25, 25, 0.5, 50, 1.2, 0.5, 0.1, "SI", false);
  expect(result.ppd_ad).not.toBeNaN();
});

test("test_ankle_draft_limit_inputs_true_still_warns_and_nans", () => {
  const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  try {
    const result = ankle_draft(50, 25, 0.1, 50, 1.2, 0.5, 0.1);
    expect(warn).toHaveBeenCalled();
    expect(result.ppd_ad).toBeNaN();
  } finally {
    warn.mockRestore();
  }
});
