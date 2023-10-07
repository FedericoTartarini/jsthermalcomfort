import { bfb_rate } from "../../src/jos3_functions/bfb_rate";
import JOS3Defaults from "../../src/jos3_functions/JOS3Defaults";
import { describe, it, expect } from "@jest/globals";

describe("bfb_rate", () => {
  it("should use appropriate defaults", () => {
    const withDefaults = bfb_rate();
    const withoutDefaults = bfb_rate(
      JOS3Defaults.height,
      JOS3Defaults.weight,
      JOS3Defaults.bsa_equation,
      JOS3Defaults.age,
      JOS3Defaults.cardiac_index,
    );

    expect(withoutDefaults).toEqual(withDefaults);
  });

  it.each([
    {
      height: 1.72,
      weight: 74.43,
      bsa_equation: "dubois",
      age: 20,
      ci: 2.59,
      expected: 1.0015102952773929,
    },
    {
      height: 1.72,
      weight: 74.43,
      bsa_equation: "takahira",
      age: 20,
      ci: 2.59,
      expected: 1.012417833146751,
    },
    {
      height: 1.72,
      weight: 74.43,
      bsa_equation: "fujimoto",
      age: 20,
      ci: 2.59,
      expected: 0.9792286611261332,
    },
    {
      height: 1.72,
      weight: 74.43,
      bsa_equation: "kurazumi",
      age: 20,
      ci: 2.59,
      expected: 0.992072812083115,
    },
  ])(
    "returns $expected when height is $height, weight is $weight, bsa_equation is $bsa_equation, age is $age, and ci is $ci",
    ({ height, weight, bsa_equation, age, ci, expected }) => {
      const result = bfb_rate(height, weight, bsa_equation, age, ci);
      expect(result).toBeCloseTo(expected);
    },
  );
});
