import { wet_r } from "../../../src/jos3_functions/thermoregulation/wet_r";
import { describe, it, expect } from "@jest/globals";
import { $lerp } from "../../../src/supa";
import * as math from "mathjs";

describe("wet_r", () => {
  it("throws an error if hc is negative", () => {
    expect(() => wet_r(math.matrix([-1]), math.matrix([]))).toThrow(
      "Input parameter hc must be non-negative.",
    );
  });

  it("should return the correct value", () => {
    const expected = [
      0.0021645021645021645, 0.003423575313939129, 0.004684089504371918,
      0.005945984200305834, 0.007209202036788244, 0.008473688620747445,
      0.009739392346802675, 0.011006264226345363, 0.012274257728803185,
      0.013553503235181343, 0.014833280927405077, 0.016113575919067133,
      0.01739437384598675, 0.01867566084416913, 0.019957423528852103,
      0.021239648974578626, 0.02252232469623774,
    ];

    const result = wet_r(
      math.matrix($lerp(17, 28, 32)),
      math.matrix($lerp(17, 0, 1)),
      math.dotMultiply(math.ones(17), 0.45),
      16.5,
    );

    expect(result.toArray()).toStrictEqual(expected);
  });
});
