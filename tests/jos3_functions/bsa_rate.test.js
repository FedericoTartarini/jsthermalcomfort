import JOS3Defaults from "../../src/jos3_functions/JOS3Defaults";
import { bsa_rate } from "../../src/jos3_functions/bsa_rate";
import { describe, it, expect } from "@jest/globals";

describe("bsa_rate", () => {
  it("should use the correct default values", () => {
    const withDefaults = bsa_rate();
    const withoutDefaults = bsa_rate(
      JOS3Defaults.height,
      JOS3Defaults.weight,
      JOS3Defaults.bsa_equation,
    );

    expect(withoutDefaults).toBe(withDefaults);
  });

  it.each([
    {
      height: 1.72,
      weight: 74.43,
      bsa_equation: "dubois",
      expected: 1.0005194360290224,
    },
    {
      height: 1.72,
      weight: 74.43,
      bsa_equation: "takahira",
      expected: 1.0114161823620118,
    },
    {
      height: 1.72,
      weight: 74.43,
      bsa_equation: "fujimoto",
      expected: 0.9782598465470701,
    },
    {
      height: 1.72,
      weight: 74.43,
      bsa_equation: "kurazumi",
      expected: 0.9910912899504472,
    },
  ])(
    "should return the correct value when height is $height, weight is $weight, bsa_equation is $bsa_equation",
    ({ height, weight, bsa_equation, expected }) => {
      const result = bsa_rate(height, weight, bsa_equation);
      expect(result).toBeCloseTo(expected);
    },
  );
});
