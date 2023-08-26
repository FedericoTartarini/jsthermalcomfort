import { expect, describe, it } from "@jest/globals";
import { heat_index } from "../../src/models/heat_index";

describe("heat_index", () => {
  it("should be a function", () => {
    expect(heat_index).toBeInstanceOf(Function);
  });

  it.each([
    {
      tdb: 25,
      rh: 50,
      options: undefined,
      expected: 25.9,
    },
    {
      tdb: 77,
      rh: 50,
      options: { units: "IP" },
      expected: 78.6,
    },
    {
      tdb: 30,
      rh: 80,
      options: undefined,
      expected: 37.7,
    },
    {
      tdb: 86,
      rh: 80,
      options: { units: "IP" },
      expected: 99.8,
    },
  ])(
    "returns $expected when tdb is $tdb, rh is $rh and options is $options",
    ({ tdb, rh, options, expected }) => {
      const result = heat_index(tdb, rh, options);

      expect(result).toBeCloseTo(expected, 1);
    },
  );

  it("should not round the heat index if the round options is false", () => {
    const not_rounded = heat_index(30, 60, { round: false });
    const rounded = heat_index(30, 60, { round: true });

    expect(not_rounded).toBeGreaterThan(rounded);
    expect(not_rounded).toBeLessThan(rounded + 0.04);
  });
});
