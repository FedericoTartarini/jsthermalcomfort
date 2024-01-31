import JOS3Defaults from "../../../src/jos3_functions/JOS3Defaults";
import { conv_coef } from "../../../src/jos3_functions/thermoregulation/conv_coef";
import { fixed_hc } from "../../../src/jos3_functions/thermoregulation/fixed_hc";
import { describe, it, expect } from "@jest/globals";
import * as math from "mathjs";

describe("fixed_hc", () => {
  it("should return the correct value given appropriate details", () => {
    const result = fixed_hc(
      conv_coef(
        JOS3Defaults.posture,
        math.dotMultiply(math.ones(17), JOS3Defaults.air_speed),
        math.dotMultiply(math.ones(17), JOS3Defaults.dry_bulb_air_temperature),
        math.dotMultiply(math.ones(17), JOS3Defaults.other_body_temperature),
      ),
      math.dotMultiply(math.ones(17), JOS3Defaults.air_speed),
    ).toArray();

    const expected = [
      4.479928052547337, 4.479928052547337, 2.969952302693212,
      2.9099532662751675, 2.849954229857123, 3.609942024485689,
      3.5499429880676434, 3.6699410609037333, 3.609942024485689,
      3.5499429880676434, 3.6699410609037333, 2.799955032842085,
      2.0399672382135194, 2.0399672382135194, 2.799955032842085,
      2.0399672382135194, 2.0399672382135194,
    ];

    expect(result).toHaveLength(expected.length);

    for (let i = 0; i < expected.length; i++) {
      expect(result[i]).toBeCloseTo(expected[i]);
    }
  });
});
