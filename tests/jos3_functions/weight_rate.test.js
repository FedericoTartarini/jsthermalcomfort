import { weight_rate } from "../../src/jos3_functions/weight_rate";
import JOS3Defaults from "../../src/jos3_functions/JOS3Defaults";
import { describe, it, expect } from "@jest/globals";

describe("weight_rate", () => {
  it("should use correct default values", () => {
    const withDefaults = weight_rate();
    const withoutDefaults = weight_rate(JOS3Defaults.weight);

    expect(withoutDefaults).toEqual(withDefaults);
  });

  it.each([
    { weight: 74.43, expected: 1 },
    { weight: 50, expected: 0.671 },
    { weight: 100, expected: 1.342 },
  ])("returns $expected when weight is $weight", ({ weight, expected }) => {
    const result = weight_rate(weight);
    expect(result).toBeCloseTo(expected);
  });
});
