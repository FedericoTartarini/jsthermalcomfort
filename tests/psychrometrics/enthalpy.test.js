import { expect, describe, it } from "@jest/globals";
import { enthalpy } from "../../src/psychrometrics/enthalpy";

describe("enthalpy", () => {
  it.each([
    { tdb: 0, hr: 0, expected: 0 },
    { tdb: 1, hr: 1, expected: 2503809.0 },
    { tdb: -1, hr: -1, expected: -2500199.0 },
    { tdb: -273, hr: 1, expected: 1734143.0 },
  ])(
    "returns $expected when airTemperature is $airTemperature and the humidityRatio is $humidityRatio",
    ({ tdb, hr, expected }) => {
      const result = enthalpy(tdb, hr);
      expect(result).toBeCloseTo(expected);
    },
  );
});
