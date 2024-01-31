import { fixed_hr } from "../../../src/jos3_functions/thermoregulation/fixed_hr";
import { rad_coef } from "../../../src/jos3_functions/thermoregulation/rad_coef";
import JOS3Defaults from "../../../src/jos3_functions/JOS3Defaults";
import { describe, it, expect } from "@jest/globals";

describe("fixed_hr", () => {
  it("should return expected values", () => {
    const expected = [
      4.890111397134201, 4.890111397134201, 4.320098412192178,
      4.090093172654168, 4.320098412192178, 4.550103651730188,
      4.430100918058182, 4.210095906326173, 4.550103651730188,
      4.430100918058182, 4.210095906326173, 4.770108663462197, 5.34012164840422,
      6.140139872884253, 4.770108663462197, 5.34012164840422, 6.140139872884253,
    ];

    const result = fixed_hr(rad_coef(JOS3Defaults.posture));
    expect(result.toArray()).toStrictEqual(expected);
  });
});
