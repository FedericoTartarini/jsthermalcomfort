import { basal_met } from "../../../src/jos3_functions/thermoregulation/basal_met";
import { describe, it, expect } from "@jest/globals";

describe("basal_met", () => {
  it("should throw an error if an invalid bmr_equation is provided", () => {
    expect(() =>
      basal_met(undefined, undefined, undefined, undefined, "abc"),
    ).toThrow();
  });

  it.each([
    {
      bmr_equation: "harris-benedict",
      sex: "male",
      expected: 87.95888208,
    },
    {
      bmr_equation: "harris-benedict_origin",
      sex: "male",
      expected: 87.14266502400001,
    },
    {
      bmr_equation: "japanese",
      sex: "male",
      expected: 79.18260487338749,
    },
    {
      bmr_equation: "ganpule",
      sex: "male",
      expected: 79.18260487338749,
    },
    {
      bmr_equation: "harris-benedict",
      sex: "female",
      expected: 89.98441008000002,
    },
    {
      bmr_equation: "harris-benedict_origin",
      sex: "female",
      expected: 76.39289097600002,
    },
    {
      bmr_equation: "japanese",
      sex: "female",
      expected: 72.90682847587196,
    },
    {
      bmr_equation: "ganpule",
      sex: "female",
      expected: 72.90682847587196,
    },
  ])(
    "returns correct value when bmr_equation is $bmr_equation and sex is $sex",
    ({ bmr_equation, sex, expected }) => {
      const result = basal_met(1.72, 74.43, 20, sex, bmr_equation);
      expect(result).toBe(expected);
    },
  );
});
