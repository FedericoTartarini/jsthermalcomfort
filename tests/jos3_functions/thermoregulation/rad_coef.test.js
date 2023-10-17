import { rad_coef } from "../../../src/jos3_functions/thermoregulation/rad_coef";
import JOS3Defaults from "../../../src/jos3_functions/JOS3Defaults";
import { describe, it, expect } from "@jest/globals";

describe("rad_coef", () => {
  it("should use appropriate defaults", () => {
    const withDefaults = rad_coef();
    const withoutDefaults = rad_coef(JOS3Defaults.posture);
    expect(withDefaults).toStrictEqual(withoutDefaults);
  });

  it("should throw an error if posture is invalid", () => {
    expect(() => rad_coef("squatting")).toThrow(
      "Invalid posture squatting. Must be one of standing, sitting, lying, sedentary, supine.",
    );
  });

  it.each([
    {
      posture: "standing",
      expected: [
        4.89, 4.89, 4.32, 4.09, 4.32, 4.55, 4.43, 4.21, 4.55, 4.43, 4.21, 4.77,
        5.34, 6.14, 4.77, 5.34, 6.14,
      ],
    },
    {
      posture: "sitting",
      expected: [
        4.96, 4.96, 3.99, 4.64, 4.21, 4.96, 4.21, 4.74, 4.96, 4.21, 4.74, 4.1,
        4.74, 6.36, 4.1, 4.74, 6.36,
      ],
    },
    {
      posture: "sedentary",
      expected: [
        4.96, 4.96, 3.99, 4.64, 4.21, 4.96, 4.21, 4.74, 4.96, 4.21, 4.74, 4.1,
        4.74, 6.36, 4.1, 4.74, 6.36,
      ],
    },
    {
      posture: "lying",
      expected: [
        5.475, 5.475, 3.463, 3.463, 3.463, 4.249, 4.835, 4.119, 4.249, 4.835,
        4.119, 4.44, 5.547, 6.085, 4.44, 5.547, 6.085,
      ],
    },
    {
      posture: "supine",
      expected: [
        5.475, 5.475, 3.463, 3.463, 3.463, 4.249, 4.835, 4.119, 4.249, 4.835,
        4.119, 4.44, 5.547, 6.085, 4.44, 5.547, 6.085,
      ],
    },
  ])(
    "returns correct value when posture is $posture",
    ({ posture, expected }) => {
      const result = rad_coef(posture);
      expect(result).toStrictEqual(expected);
    },
  );
});
