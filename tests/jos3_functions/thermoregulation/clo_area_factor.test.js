import { clo_area_factor } from "../../../src/jos3_functions/thermoregulation/clo_area_factor";
import { describe, it, expect } from "@jest/globals";
import { $lerp } from "../../../src/supa";
import * as math from "mathjs";

describe("clo_area_factor", () => {
  it("should return the correct value", () => {
    const expected = [
      1.0,
      1.0125,
      1.025,
      1.0375,
      1.05,
      1.0625,
      1.075,
      1.0875,
      1.1,
      1.10625,
      1.1125,
      1.1187500000000001,
      1.125,
      1.13125,
      1.1375,
      1.14375,
      1.1500000000000001
    ];

    const result = clo_area_factor(math.matrix($lerp(17, 0, 1)));
    expect(result.toArray()).toStrictEqual(expected);
  });
});
