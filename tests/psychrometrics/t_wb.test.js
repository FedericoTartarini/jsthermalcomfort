import { expect, describe, it } from "@jest/globals";
import { t_wb } from "../../src/psychrometrics/t_wb";

describe("t_wb", () => {
  it.each([
    { airTemperature: 27.1, relativeHumidity: 66.4, expected: 22.4 },
    { airTemperature: 25, relativeHumidity: 50, expected: 18.0 },
  ])(
    "returns $expected when bulbTemperature is $bulbTemperature and relativeHumidity is $relativeHumidity",
    ({ airTemperature, relativeHumidity, expected }) => {
      const result = t_wb(airTemperature, relativeHumidity);
      expect(result).toBeCloseTo(expected);
    },
  );
});
