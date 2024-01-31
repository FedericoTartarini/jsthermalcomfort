import { operative_temp } from "../../../src/jos3_functions/thermoregulation/operative_temp";
import { describe, it, expect } from "@jest/globals";
import { $lerp } from "../../../src/supa";
import * as math from "mathjs";

describe("operative_temp", () => {
  it("should return the correct value", () => {
    const result = operative_temp(
      math.matrix($lerp(17, 28, 32)),
      math.matrix($lerp(17, 20, 28)),
      math.matrix($lerp(17, 1, 3)),
      math.matrix($lerp(17, 0, 1)),
    );

    const expected = [
      28.0,
      27.842105263157894,
      27.818181818181817,
      27.88,
      28.0,
      28.161290322580644,
      28.352941176470587,
      28.56756756756757,
      28.8,
      29.046511627906977,
      29.304347826086957,
      29.571428571428573,
      29.846153846153847,
      30.12727272727273,
      30.413793103448278,
      30.704918032786885,
      31.0
    ];

    expect(result.toArray()).toStrictEqual(expected);
  });
});
