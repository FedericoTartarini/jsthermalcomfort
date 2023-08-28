import { describe, expect, it } from "@jest/globals";
import { body_surface_area } from "../../src/utilities/utilities";

describe("body_surface_area", () => {
  it.each([
    { weight: 80, height: 1.8, formula: undefined, expected: 1.9917 },
    { weight: 70, height: 1.8, formula: "dubois", expected: 1.88 },
    { weight: 75, height: 1.75, formula: "takahira", expected: 1.919 },
    { weight: 80, height: 1.7, formula: "fujimoto", expected: 1.872 },
    { weight: 85, height: 1.65, formula: "kurazumi", expected: 1.89 },
  ])(
    "returns $expected when weight is $weight, height is $height and formula is $formula",
    ({ weight, height, formula, expected }) => {
      const result = body_surface_area(weight, height, formula);

      expect(result).toBeCloseTo(expected, 2);
    },
  );

  it("throws an error if the formula is not valid", () => {
    expect(() => body_surface_area(70, 1.8, "invalid_formula")).toThrow();
  });
});
