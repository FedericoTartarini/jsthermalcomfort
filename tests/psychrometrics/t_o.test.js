import { expect, describe, it, test } from "@jest/globals";
import { t_o } from "../../src/psychrometrics/t_o";
import { LimitSet, Standard } from "../../src/utilities/utilities.js";

// Mirrors pythermalcomfort v4.6.2 tests/test_environment.py. Upstream's
// operative_tmp takes "ISO" (the default) or "ASHRAE"; t_o takes the Standard
// identifiers, so "ASHRAE" is Standard.ashrae_55_2023 here.
describe("test_environment", () => {
  test("test_t_o", () => {
    expect(t_o(25, 25, 0.1)).toBe(25);
    // operative_tmp([25, 20], 30, 0.3) ≈ [26.83, 23.66], atol 1e-2, element-wise.
    expect(Math.abs(t_o(25, 30, 0.3) - 26.83)).toBeLessThanOrEqual(1e-2);
    expect(Math.abs(t_o(20, 30, 0.3) - 23.66)).toBeLessThanOrEqual(1e-2);
    expect(t_o(25, 25, 0.1, Standard.ashrae_55_2023)).toBe(25);
    expect(t_o(20, 30, 0.1, Standard.ashrae_55_2023)).toBe(25);
    expect(t_o(20, 30, 0.3, Standard.ashrae_55_2023)).toBe(24);
    expect(t_o(20, 30, 0.7, Standard.ashrae_55_2023)).toBe(23);
  });
});

describe("t_o", () => {
  it.each([
    {
      airTemperature: 0,
      meanRadiantTemperature: 0,
      airSpeed: 0,
      standard: Standard.iso_7730_2025,
      expected: 0,
    },
    {
      airTemperature: 1,
      meanRadiantTemperature: 1,
      airSpeed: 1,
      standard: Standard.iso_7730_2025,
      expected: 1,
    },
    {
      airTemperature: -1,
      meanRadiantTemperature: -1,
      airSpeed: 1,
      standard: Standard.iso_7730_2025,
      expected: -1,
    },
    {
      airTemperature: -273,
      meanRadiantTemperature: 0,
      airSpeed: 1,
      standard: Standard.iso_7730_2025,
      expected: -207.4109109748925,
    },
    {
      airTemperature: 0,
      meanRadiantTemperature: -273,
      airSpeed: 1,
      standard: Standard.iso_7730_2025,
      expected: -65.5890890251075,
    },
    {
      airTemperature: 0,
      meanRadiantTemperature: 0,
      airSpeed: 0,
      standard: Standard.ashrae_55_2023,
      expected: 0,
    },
    {
      airTemperature: 1,
      meanRadiantTemperature: 1,
      airSpeed: 1,
      standard: Standard.ashrae_55_2023,
      expected: 1,
    },
    {
      airTemperature: -1,
      meanRadiantTemperature: -1,
      airSpeed: 1,
      standard: Standard.ashrae_55_2023,
      expected: -1,
    },
    {
      // This is another case like above, the Python version returns -191.1.
      airTemperature: -273,
      meanRadiantTemperature: -1,
      airSpeed: 1,
      standard: Standard.ashrae_55_2023,
      expected: -191.4,
    },
    {
      airTemperature: 0,
      meanRadiantTemperature: -273,
      airSpeed: 1,
      standard: Standard.ashrae_55_2023,
      expected: -81.9,
    },
  ])(
    "returns $expected when airTemperature is $airTemperature, meanRadiantTemperature is $meanRadiantTemperature, airSpeed is $airSpeed, and the standard is $standard",
    ({
      airTemperature,
      meanRadiantTemperature,
      airSpeed,
      standard,
      expected,
    }) => {
      const result = t_o(
        airTemperature,
        meanRadiantTemperature,
        airSpeed,
        standard,
      );

      expect(Math.abs(result - expected)).toBeLessThanOrEqual(0.0001);
    },
  );

  // Upstream's operative_tmp has no sign check on v
  // (pythermalcomfort/environment/operative_tmp.py:35-43 at v4.6.2). Expected
  // values from operative_tmp(20, 30, v, standard=...) in pythermalcomfort
  // 4.6.2.
  it("weighs a negative v under ASHRAE 55 as an air speed below 0.2 m/s, as upstream", () => {
    for (const v of [-1e-9, -0.1, -1]) {
      expect(t_o(20, 30, v, Standard.ashrae_55_2023)).toBe(25);
    }
  });

  it("returns NaN for a negative v under ISO 7726, from the square root, as upstream", () => {
    expect(t_o(20, 30, -0.1, Standard.iso_7730_2025)).toBeNaN();
    expect(t_o(25, 25, -1e-9, Standard.iso_7730_2025)).toBeNaN();
  });

  it("throws an error if standard is not valid", () => {
    expect(() => t_o(0, 0, 0, "JORDAN")).toThrow(
      /^Unknown standard "JORDAN"\./,
    );
  });
});
