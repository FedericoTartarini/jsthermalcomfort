import { expect, describe, it } from "@jest/globals";
import { p_sat_torr } from "../../src/psychrometrics/p_sat_torr.js";

describe("p_sat_torr", () => {
  it.each([
    { dryBulbAirTemp: 0, expected: 4.567130491010804 },
    { dryBulbAirTemp: 1, expected: 4.91137228152998 },
    { dryBulbAirTemp: -1, expected: 4.244379879377941 },

    // Interestingly, this case shows the limits of JS, the Python verison
    // returns 9.699125053317318e+53 - this one is *almost* the same, because
    // Python has "real" integers and floats, but JS uses IEEE Numbers.
    { dryBulbAirTemp: -273.15, expected: 9.699125053317317e53 },
  ])(
    "returns $expected when dryBulbAirTemp is $dryBulbAirTemp",
    ({ dryBulbAirTemp, expected }) => {
      const result = p_sat_torr(dryBulbAirTemp);
      expect(result).toBeCloseTo(expected);
    },
  );
});
