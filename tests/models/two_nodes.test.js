import { expect, describe, test, it } from "@jest/globals";
import { loadTestData, validateResult } from "./testUtils";
import { two_nodes } from "../../src/models/two_nodes";
import { testDataUrls } from "./comftest"; // Import all test URLs from comftest.js

// Use the URL from comftest.js to fetch data for two_nodes tests
const testDataUrl = testDataUrls.twoNodes; // Ensure the correct URL is added in comftest.js

// Load data at module scope so test.each can register one test per row.
const { testData, tolerances } = await loadTestData(testDataUrl, false);

// Skip rows with missing outputs or array-valued inputs; keep original
// dataset index so failures are reported as "row N" matching the JSON file.
const scalarRows = testData.data
  .map((row, index) => ({ ...row, index }))
  .filter(({ inputs, outputs }) => {
    if (outputs === undefined || outputs === null) return false;
    return !Object.values(inputs).some((value) => Array.isArray(value));
  });

describe("two_nodes related tests", () => {
  test.each(scalarRows)("row $index", ({ inputs, outputs }) => {
    const {
      tdb,
      tr,
      v,
      rh,
      met,
      clo,
      wme,
      body_surface_area,
      p_atmospheric,
      body_position,
      max_skin_blood_flow,
      kwargs,
      w_max,
      max_sweating,
    } = inputs;

    const mergedKwargs = {
      w_max,
      max_sweating,
      ...(kwargs ?? {}),
      round: false,
    };
    for (const k of Object.keys(mergedKwargs)) {
      if (mergedKwargs[k] === undefined) delete mergedKwargs[k];
    }

    const result = two_nodes(
      tdb,
      tr,
      v,
      rh,
      met,
      clo,
      wme,
      body_surface_area,
      p_atmospheric,
      body_position,
      max_skin_blood_flow,
      mergedKwargs,
    );

    const actualOutputs = {
      disc: result.disc,
      t_core: result.tCore,
      e_skin: result.eSkin,
      e_rsw: result.eRsw,
      e_max: result.eMax,
      q_sensible: result.qSensible,
      q_skin: result.qSkin,
      q_res: result.qRes,
      t_skin: result.tSkin,
      m_bl: result.mBl,
      m_rsw: result.mRsw,
      w: result.w,
      w_max: result.wMax,
      set: result.set,
      et: result.et,
      pmv_gagge: result.pmvGagge,
      pmv_set: result.pmvSet,
      t_sens: result.tSens,
    };

    validateResult(actualOutputs, outputs, tolerances, inputs);
  });
});

// ---------------------------------------------------------------------------
// Input validation tests
// ---------------------------------------------------------------------------
describe("two_nodes input validation", () => {
  test.each([
    ["tdb", "25", 25, 0.3, 50, 1.2, 0.5],
    ["tr", 25, "25", 0.3, 50, 1.2, 0.5],
    ["v", 25, 25, "0.3", 50, 1.2, 0.5],
    ["rh", 25, 25, 0.3, "50", 1.2, 0.5],
    ["met", 25, 25, 0.3, 50, "1.2", 0.5],
    ["clo", 25, 25, 0.3, 50, 1.2, "0.5"],
    ["wme", 25, 25, 0.3, 50, 1.2, 0.5, "0"],
  ])("throws TypeError if %s is not a number", (_, ...args) => {
    expect(() => two_nodes(...args)).toThrow(TypeError);
  });

  test("throws Error if body_position is not a valid enum", () => {
    expect(() =>
      two_nodes(25, 25, 0.3, 50, 1.2, 0.5, 0, 1.8258, 101325, "INVALID"),
    ).toThrow(Error);
  });

  test("throws TypeError if kwargs.calculate_ce is not a boolean", () => {
    expect(() =>
      two_nodes(25, 25, 0.3, 50, 1.2, 0.5, 0, 1.8258, 101325, "standing", 90, {
        calculate_ce: "true",
      }),
    ).toThrow(TypeError);
  });

  test("throws TypeError if kwargs.round is not a boolean", () => {
    expect(() =>
      two_nodes(25, 25, 0.3, 50, 1.2, 0.5, 0, 1.8258, 101325, "standing", 90, {
        round: "true",
      }),
    ).toThrow(TypeError);
  });

  test("throws TypeError if kwargs.w_max is not a number", () => {
    expect(() =>
      two_nodes(25, 25, 0.3, 50, 1.2, 0.5, 0, 1.8258, 101325, "standing", 90, {
        w_max: "0.5",
      }),
    ).toThrow(TypeError);
  });

  test("does not throw when kwargs.w_max is not provided", () => {
    expect(() => two_nodes(25, 25, 0.3, 50, 1.2, 0.5)).not.toThrow();
  });
});

// Range check
describe("two_nodes validation logic (Testing the Test)", () => {
  it("should fail if the result is outside the tolerance margin", () => {
    const mockExpected = 25.0;
    const mockActual = 25.2; // Difference is 0.2
    const mockTolerance = 0.1;

    expect(() => {
      const diff = Math.abs(mockActual - mockExpected);
      if (diff > mockTolerance) {
        throw new Error(
          `Value outside tolerance: actual ${mockActual}, expected ${mockExpected}, tol ${mockTolerance}`,
        );
      }
    }).toThrow();
  });

  it("should pass if the result is inside the tolerance margin", () => {
    const mockExpected = 25.0;
    const mockActual = 25.05; // Difference is 0.05
    const mockTolerance = 0.1;

    expect(() => {
      const diff = Math.abs(mockActual - mockExpected);
      if (diff > mockTolerance) {
        throw new Error(
          `Value outside tolerance: actual ${mockActual}, expected ${mockExpected}, tol ${mockTolerance}`,
        );
      }
    }).not.toThrow();
  });
});
