import { expect, describe, it } from "@jest/globals";
import { t_wb } from "../../src/psychrometrics/t_wb";

describe("t_wb", () => {
  it.each([
    { tdb: 27.1, rh: 66.4, expected: 22.4 },
    { tdb: 25, rh: 50, expected: 18.0 },
  ])(
    "returns $expected when bulbTemperature is $bulbTemperature and relativeHumidity is $relativeHumidity",
    ({ tdb, rh, expected }) => {
      const result = t_wb(tdb, rh);
      expect(result).toBeCloseTo(expected);
    },
  );
});
