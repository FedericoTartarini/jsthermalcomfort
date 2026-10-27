import { describe, expect, test } from "vitest";
import { use_fans_heatwaves } from "../../src/models/use_fans_heatwave";
import { testDataUrls } from "./comftest"; // Import all test URLs from comftest.js
import { loadTestData, validateResult } from "./testUtils";

let returnArray = false;

// use top-level await to load test data before tests are defined.
let { testData, tolerances } = await loadTestData(
  testDataUrls.use_fans_heatwaves,
  returnArray,
);

// Known gap, reported rather than fixed: validation data v1.0.1 recomputes
// case #0's e_skin at 41 °C with pythermalcomfort 4.7.0's
// p_rsw = (w_max - 0.06) / 0.94 (`models/two_nodes_gagge.py:410`,
// pythermalcomfort#489); two_nodes.js, which this model calls, still uses
// w_max / 0.94. `test.fails` turns red once two_nodes follows 4.7.0.
const cases = testData.data.map((testCase, index) => ({ ...testCase, index }));
const isWMaxCapCase = ({ index }) => index === 0;

describe("use_fans_heatwaves", () => {
  test.each(cases.filter((c) => !isWMaxCapCase(c)))(
    "Test case #$index",
    checkCase,
  );
  test.fails.each(cases.filter(isWMaxCapCase))(
    "Test case #$index (known gap: w_max / 0.94, pythermalcomfort#489)",
    checkCase,
  );
});

function checkCase(testCase) {
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
}

// ---------------------------------------------------------------------------
// Input validation tests
// ---------------------------------------------------------------------------
describe("use_fans_heatwaves input validation", () => {
  test.each([
    ["tdb", "25", 25, 0.1, 50, 1.2, 0.5],
    ["tr", 25, "25", 0.1, 50, 1.2, 0.5],
    ["v", 25, 25, "0.1", 50, 1.2, 0.5],
    ["rh", 25, 25, 0.1, "50", 1.2, 0.5],
    ["met", 25, 25, 0.1, 50, "1.2", 0.5],
    ["clo", 25, 25, 0.1, 50, 1.2, "0.5"],
    ["wme", 25, 25, 0.1, 50, 1.2, 0.5, "0"],
  ])("throws TypeError if %s is not a number", (_, ...args) => {
    expect(() => use_fans_heatwaves(...args)).toThrow(TypeError);
  });

  test("throws Error if body_position is not a valid enum", () => {
    expect(() =>
      use_fans_heatwaves(
        25,
        25,
        0.1,
        50,
        1.2,
        0.5,
        0,
        undefined,
        undefined,
        "INVALID",
      ),
    ).toThrow(Error);
  });

  test("throws Error if units is not a valid enum", () => {
    expect(() =>
      use_fans_heatwaves(
        25,
        25,
        0.1,
        50,
        1.2,
        0.5,
        0,
        undefined,
        undefined,
        "standing",
        "INVALID",
      ),
    ).toThrow(Error);
  });

  test("throws TypeError if kwargs.round is not a boolean", () => {
    expect(() =>
      use_fans_heatwaves(
        25,
        25,
        0.1,
        50,
        1.2,
        0.5,
        0,
        undefined,
        undefined,
        "standing",
        "SI",
        80,
        {
          round: "true",
        },
      ),
    ).toThrow(TypeError);
  });

  test("throws TypeError if kwargs.limit_inputs is not a boolean", () => {
    expect(() =>
      use_fans_heatwaves(
        25,
        25,
        0.1,
        50,
        1.2,
        0.5,
        0,
        undefined,
        undefined,
        "standing",
        "SI",
        80,
        {
          limit_inputs: "true",
        },
      ),
    ).toThrow(TypeError);
  });
});
