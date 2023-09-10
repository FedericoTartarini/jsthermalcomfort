import { expect, describe, it } from "@jest/globals";
import { wbgt } from "../../src/models/wbgt";

describe("wbgt", () => {
  it.each([
    {
      twb: 25,
      tg: 32,
      expected: 27.1,
    },
    {
      twb: 25,
      tg: 32,
      tdb: 20,
      with_solar_load: true,
      expected: 25.9,
    },
    {
      twb: 28,
      tg: 37,
      round: false,
      expected: 30.699999999999996,
    },
    {
      twb: 19,
      tg: 60,
      tdb: 20,
      with_solar_load: true,
      round: false,
      expected: 27.299999999999997,
    },
  ])(
    "returns $expected when tdb is $twb, tg is $tg, tdb is $tdb, and with_solar_load is $with_solar_load",
    ({ twb, tg, tdb, with_solar_load, round, expected }) => {
      const options = {
        ...(tdb && { tdb }),
        ...(with_solar_load !== undefined && { with_solar_load }),
        ...(round !== undefined && { round }),
      };

      const result = wbgt(twb, tg, options);
      expect(result).toBe(expected);
    },
  );

  it("throws an error if with_solar_load is set and tdb is not", () => {
    expect(() => {
      wbgt(0, 0, { with_solar_load: true });
    }).toThrow("Please enter the dry bulb air temperature");
  });
});
