import JOS3Defaults from "../../src/jos3_functions/JOS3Defaults";
import { validate_body_parameters } from "../../src/jos3_functions/validate_body_parameters";

describe("validate_body_parameters", () => {
  it("should return an error if the height is outside of the valid range", () => {
    expect(() => validate_body_parameters(0.4)).toThrowError(
      "Height must be in the range [0.5, 3.0] meters.",
    );
    expect(() => validate_body_parameters(3.1)).toThrowError(
      "Height must be in the range [0.5, 3.0] meters.",
    );
  });

  it("should return an error if the weight is outside of the valid range", () => {
    expect(() => validate_body_parameters(undefined, 19)).toThrowError(
      "Weight must be in the range [20, 200] kilograms.",
    );
    expect(() => validate_body_parameters(undefined, 201)).toThrowError(
      "Weight must be in the range [20, 200] kilograms.",
    );
  });

  it("should return an error if the age is outside of the valid range", () => {
    expect(() =>
      validate_body_parameters(undefined, undefined, 4),
    ).toThrowError("Age must be in the range [5, 100] years.");
    expect(() =>
      validate_body_parameters(undefined, undefined, 101),
    ).toThrowError("Age must be in the range [5, 100] years.");
  });

  it("should return an error if the body_fat is outside of the valid range", () => {
    expect(() =>
      validate_body_parameters(undefined, undefined, undefined, 0),
    ).toThrowError("Body Fat must be in the range [1, 90] (1% to 90%).");
    expect(() =>
      validate_body_parameters(undefined, undefined, undefined, 91),
    ).toThrowError("Body Fat must be in the range [1, 90] (1% to 90%).");
  });

  it("should use the correct defaults", () => {
    const withDefaults = validate_body_parameters();
    const withoutDefaults = validate_body_parameters(
      JOS3Defaults.height,
      JOS3Defaults.weight,
      JOS3Defaults.age,
      JOS3Defaults.body_fat,
    );

    expect(withoutDefaults).toEqual(withDefaults);
  });
});
