import { expect, describe, it } from "@jest/globals";
import { t_dp } from "../../src/psychrometrics/t_dp";

describe("t_dp", () => {
  it.each([
    { tdb: 31.6, rh: 59.6, expected: 22.6 },
    { tdb: 29.3, rh: 75.4, expected: 24.3 },
    { tdb: 27.1, rh: 66.4, expected: 20.2 },
  ])(
    "returns $expected when airTemperature is $airTemperature and relativeHumidity is $relativeHumidity",
    ({ tdb, rh, expected }) => {
      const result = t_dp(tdb, rh);
      expect(result).toBeCloseTo(expected);
    },
  );
});
