import { expect, describe, it } from "@jest/globals";
import { p_sat } from "../../src/psychrometrics/p_sat";

describe("p_sat", () => {
  it("should be a function", () => {
    expect(p_sat).toBeInstanceOf(Function);
  });

  it.each([
    { tdb: 0, expected: 611.2 },
    { tdb: 1, expected: 657.1 },
    { tdb: -1, expected: 562.7 },
    { tdb: -273, expected: 0.0 },
  ])(
    "returns $expected when airTemperature is $airTemperature",
    ({ tdb, expected }) => {
      const result = p_sat(tdb);
      expect(result).toBeCloseTo(expected);
    },
  );
});
