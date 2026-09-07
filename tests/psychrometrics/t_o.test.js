import { expect, describe, it } from "@jest/globals";
import { t_o } from "../../src/psychrometrics/t_o";
import { LimitSet, Standard } from "../../src/utilities/utilities.js";

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

  it("throws an error if the airSpeed is negative", () => {
    expect(() => t_o(0, 0, -1, Standard.iso_7730_2025)).toThrow(
      "v cannot be negative",
    );
  });

  it("throws an error if standard is not valid", () => {
    expect(() => t_o(0, 0, 0, "JORDAN")).toThrow(
      /^Unknown standard "JORDAN"\./,
    );
  });
});
