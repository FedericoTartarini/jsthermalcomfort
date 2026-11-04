import { describe, expect, test } from "@jest/globals";
import { pmv_calculation } from "../../src/models/pmv_ppd.js";

// Scalar reference cases from pythermalcomfort v3.9.3:
// tests/test_pmv_ppd_optimised.py.
// Python also supports array broadcasting; these tests cover scalar inputs.
describe("pmv_calculation alignment with pythermalcomfort", () => {
  test.each([
    {
      name: "reference example",
      inputs: [25, 25, 0.3, 50, 1.5, 0.7, 0],
      expected: 0.55,
    },
    {
      name: "typical conditions",
      inputs: [25, 23, 0.1, 50, 1.2, 0.5, 0],
      expected: -0.197,
    },
    {
      name: "extreme conditions with external work",
      inputs: [35, 45, 2, 10, 2.5, 1.5, 1],
      expected: 1.86,
    },
  ])("matches Python for $name", ({ inputs, expected }) => {
    const result = pmv_calculation(...inputs);

    expect(Number.isFinite(result)).toBe(true);
    expect(Math.abs(result - expected)).toBeLessThanOrEqual(0.01);
  });

  test("returns NaN when dry bulb temperature is NaN", () => {
    expect(pmv_calculation(NaN, 23, 0.1, 50, 1.2, 0.5, 0)).toBeNaN();
  });

  test("returns NaN when dry bulb temperature is Infinity", () => {
    expect(pmv_calculation(Infinity, 23, 0.1, 50, 1.2, 0.5, 0)).toBeNaN();
  });
});

// Generated from the scalar function body of pythermalcomfort v3.9.3
// models/_pmv_ppd_optimized.py, using NumPy and met_to_w_m2 = 58.15.
describe("pmv_calculation branch reference values", () => {
  test.each([
    [
      "clothing below the area-factor boundary; net metabolism above 1 met",
      [25, 25, 0.1, 50, 1.2, 0.5, 0],
      0.08425176342008413,
    ],
    [
      "clothing at the area-factor boundary",
      [25, 25, 0.1, 50, 1.2, 0.078 / 0.155, 0],
      0.08984731597716217,
    ],
    [
      "clothing above the area-factor boundary",
      [25, 25, 0.1, 50, 1.2, 0.51, 0],
      0.10277631373811162,
    ],
    [
      "net metabolism below 1 met with external work",
      [25, 25, 0.1, 50, 1.2, 0.5, 0.4],
      -1.0903190327689893,
    ],
    [
      "net metabolism exactly at 1 met",
      [25, 25, 0.1, 50, 1, 0.5, 0],
      -0.40072961048593664,
    ],
    [
      "natural convection at zero air speed",
      [25, 25, 0, 50, 1.2, 0.5, 0],
      0.12399707166895806,
    ],
    [
      "forced convection at high air speed",
      [25, 25, 2, 50, 1.2, 0.5, 0],
      -1.3172002742121833,
    ],
  ])("matches the Python scalar calculation for %s", (_, inputs, expected) => {
    const result = pmv_calculation(...inputs);

    expect(Number.isFinite(result)).toBe(true);
    expect(Math.abs(result - expected)).toBeLessThanOrEqual(1e-8);
  });

  test("throws when the clothing temperature iteration does not converge", () => {
    // Deliberately outside normal applicability limits to exercise the guard.
    // Python raises StopIteration; JavaScript uses Error with the same message.
    expect(() => pmv_calculation(200, 200, 0.1, 50, 1.2, 5, 0)).toThrow(
      "Max iterations exceeded",
    );
  });
});
