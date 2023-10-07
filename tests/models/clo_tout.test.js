import { expect, describe, it } from "@jest/globals";
import { clo_tout, clo_tout_array } from "../../src/models/clo_tout";

describe("clo_tout", () => {
  it.each([
    { tout: 0, units: "SI", expected: 0.82 },
    { tout: 25, units: "SI", expected: 0.47 },
    { tout: 50, units: "SI", expected: 0.46 },
    { tout: 0, units: "IP", expected: 1 },
    { tout: 25, units: "IP", expected: 0.96 },
    { tout: 50, units: "IP", expected: 0.59 },
  ])(
    "returns $expected when tout is $tout and units is $units",
    ({ tout, units, expected }) => {
      const result = clo_tout(tout, units);
      expect(result).toBe(expected);
    },
  );

  it("defaults to SI units if the units are undefined", () => {
    const result = clo_tout(0);
    expect(result).not.toBe(1);
    expect(result).toBe(0.82);
  });
});

describe("clo_tout_array", () => {
  it.each([
    { tout: [0, 25, 50], units: "SI", expected: [0.82, 0.47, 0.46] },
    { tout: [0, 25, 50], units: "IP", expected: [1, 0.96, 0.59] },
  ])(
    "returns $expected when tout is $tout and units is $units",
    ({ tout, units, expected }) => {
      const result = clo_tout_array(tout, units);
      expect(result).toStrictEqual(expected);
    },
  );

  it("defaults to SI units if the units are undefined", () => {
    const result = clo_tout_array([0, 25, 50]);
    expect(result).not.toStrictEqual([1, 0.96, 0.59]);
    expect(result).toStrictEqual([0.82, 0.47, 0.46]);
  });
});
