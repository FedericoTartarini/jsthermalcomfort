import { describe } from "@jest/globals";
import { pmv } from "../../src/models/pmv.js";
import { validateResult } from "./testUtils.js";

describe("pmv", () => {
  test("Test case with default parameters", () => {
    const tolerances = {
      pmv: 0.1,
      ppd: 1,
    };

    const inputs = {
      tdb: 22,
      tr: 22,
      rh: 60,
      vr: 0.1,
      met: 1.2,
      clo: 0.5,
      standard: "ISO",
    };

    const outputs = {
      pmv: -0.8,
    };

    const { tdb, tr, vr, rh, met, clo, wme, standard } = inputs;
    const modelResult = { pmv: pmv(tdb, tr, vr, rh, met, clo, wme, standard) };

    validateResult(modelResult, outputs, tolerances, inputs);
  });
});

// ---------------------------------------------------------------------------
// Input validation tests
// ---------------------------------------------------------------------------
describe("pmv input validation", () => {
  test.each([
    ["tdb", "25", 25, 0.1, 50, 1.2, 0.5],
    ["tr", 25, "25", 0.1, 50, 1.2, 0.5],
    ["vr", 25, 25, "0.1", 50, 1.2, 0.5],
    ["rh", 25, 25, 0.1, "50", 1.2, 0.5],
    ["met", 25, 25, 0.1, 50, "1.2", 0.5],
    ["clo", 25, 25, 0.1, 50, 1.2, "0.5"],
  ])("throws TypeError if %s is not a number", (_, ...args) => {
    expect(() => pmv(...args)).toThrow(TypeError);
  });

  test("throws Error if standard is not a valid enum", () => {
    expect(() => pmv(25, 25, 0.1, 50, 1.2, 0.5, 0, "INVALID")).toThrow(Error);
  });
});
