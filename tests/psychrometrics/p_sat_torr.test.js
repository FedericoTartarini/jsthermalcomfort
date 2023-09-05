import { expect, describe, it } from "@jest/globals";
import {
  p_sat_torr,
  p_sat_torr_array,
} from "../../src/psychrometrics/p_sat_torr.js";
import { deep_close_to_array } from "../test_utilities.js";

describe("p_sat_torr", () => {
  it.each([
    { tdb: 0, expected: 4.567130491010804 },
    { tdb: 1, expected: 4.91137228152998 },
    { tdb: -1, expected: 4.244379879377941 },

    // Interestingly, this case shows the limits of JS, the Python verison
    // returns 9.699125053317318e+53 - this one is *almost* the same, because
    // Python has "real" integers and floats, but JS uses IEEE Numbers.
    { tdb: -273.15, expected: 9.699125053317317e53 },
  ])(
    "returns $expected when dryBulbAirTemp is $dryBulbAirTemp",
    ({ tdb, expected }) => {
      const result = p_sat_torr(tdb);
      expect(result).toBeCloseTo(expected);
    },
  );
});

describe("p_sat_torr_array", () => {
  it.each([
    {
      tdb: [0, 1, -1, -273.15],
      expected: [4.5671, 4.911372, 4.2443798, 9.699125053317317e53],
    },
  ])(
    "returns $expected when dryBulbAirTemp is $dryBulbAirTemp",
    ({ tdb, expected }) => {
      const result = p_sat_torr_array(tdb);
      deep_close_to_array(result, expected, 2);
    },
  );
});
