import { expect, describe, it } from "@jest/globals";
import { t_dp } from "../../src/psychrometrics/t_dp";

describe("t_dp", () => {
  it.each([
    { bulbTemperature: 31.6, relativeHumidity: 59.6, expected: 22.6 },
    { bulbTemperature: 29.3, relativeHumidity: 75.4, expected: 24.3 },
    { bulbTemperature: 27.1, relativeHumidity: 66.4, expected: 20.2 },
  ])(
    "returns $expected when airTemperature is $airTemperature and relativeHumidity is $relativeHumidity",
    ({ bulbTemperature, relativeHumidity, expected }) => {
      const result = t_dp(bulbTemperature, relativeHumidity);
      expect(result).toBeCloseTo(expected);
    },
  );
});
