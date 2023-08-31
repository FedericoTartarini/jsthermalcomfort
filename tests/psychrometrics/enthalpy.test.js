import { expect, describe, it } from "@jest/globals";
import { enthalpy } from "../../src/psychrometrics/enthalpy";

describe("enthalpy", () => {
  it.each([
    { airTemperature: 0, humidityRatio: 0, expected: 0 },
    { airTemperature: 1, humidityRatio: 1, expected: 2503809.0 },
    { airTemperature: -1, humidityRatio: -1, expected: -2500199.0 },
    { airTemperature: -273, humidityRatio: 1, expected: 1734143.0 },
  ])(
    "returns $expected when airTemperature is $airTemperature and the humidityRatio is $humidityRatio",
    ({ airTemperature, humidityRatio, expected }) => {
      const result = enthalpy(airTemperature, humidityRatio);
      expect(result).toBeCloseTo(expected);
    },
  );
});
