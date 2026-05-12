// Reference values match pythermalcomfort 3.9.3 and are also proposed in
// FedericoTartarini/validation-data-comfort-models#10. Once that PR
// merges these rows should move to ts_wind_chill_temperature.json and the
// suite should switch to loadTestData(testDataUrls.windChillTemperature).

import { describe, expect, test } from "@jest/globals";
import { wind_chill_temperature } from "../../src/models/wind_chill_temperature.js";
import { validateResult } from "./testUtils";

const tolerances = { wct: 0.1 };

const testCases = [
  { inputs: { tdb: -40, v: 30 }, outputs: { wct: -58.7 } },
  { inputs: { tdb: -20, v: 5 }, outputs: { wct: -24.3 } },
  { inputs: { tdb: -20, v: 15 }, outputs: { wct: -29.1 } },
  { inputs: { tdb: -20, v: 60 }, outputs: { wct: -36.5 } },
  { inputs: { tdb: -10, v: 10 }, outputs: { wct: -15.3 } },
  { inputs: { tdb: -5, v: 5.5 }, outputs: { wct: -7.5 } },
  {
    inputs: { tdb: -5, v: 5.5, round_output: false },
    outputs: { wct: -7.527 },
  },
  { inputs: { tdb: 0, v: 0.1 }, outputs: { wct: 5.3 } },
  { inputs: { tdb: 0, v: 1.5 }, outputs: { wct: 1.0 } },
];

describe("test_wind_chill_temperature", () => {
  test.each(testCases)("Test case #%#", (testCase) => {
    const { inputs, outputs: expectedOutput } = testCase;
    const { tdb, v, round_output } = inputs;
    // Only build a kwargs object when round_output is explicit in the
    // row, so rows without that key exercise the function's own default
    // (true). Without this guard, undefined would coerce to skipping
    // rounding and silently widen the assertion window.
    const kwargs = round_output !== undefined ? { round_output } : undefined;
    const modelResult = wind_chill_temperature(tdb, v, kwargs);
    validateResult(modelResult, expectedOutput, tolerances, inputs);
  });
});

// The row-level tolerance is 0.1, which is looser than the difference
// between the rounded and unrounded outputs of the boundary case
// (|-7.5 - -7.527| = 0.027). A buggy implementation that ignored
// round_output: false would still pass the loop above. This tighter
// check locks the unrounded path against the pythermalcomfort 3.9.3
// binary value.
describe("wind_chill_temperature unrounded path", () => {
  test("round_output:false returns the full-precision pythermalcomfort value", () => {
    const result = wind_chill_temperature(-5, 5.5, { round_output: false });
    expect(Math.abs(result.wct - -7.527137645688018)).toBeLessThan(1e-10);
  });
});

// Passing an empty kwargs object must still apply the documented
// round_output=true default. Without the explicit merge in the function
// body, kwargs.round_output would be undefined and the branch would
// silently return an unrounded value.
describe("wind_chill_temperature kwargs defaults", () => {
  test("empty kwargs keeps round_output default true", () => {
    expect(wind_chill_temperature(-5, 5.5, {}).wct).toBe(-7.5);
  });
});

describe("wind_chill_temperature input validation", () => {
  test.each([
    ["tdb", "0", 5],
    ["v", 0, "5"],
  ])("throws TypeError if %s is not a number", (_, ...args) => {
    expect(() => wind_chill_temperature(...args)).toThrow(TypeError);
  });

  test("throws TypeError if round_output is not a boolean", () => {
    expect(() =>
      wind_chill_temperature(0, 5, { round_output: "true" }),
    ).toThrow(TypeError);
  });
});
