import { wet_r } from "../../../src/jos3_functions/thermoregulation/wet_r";
import { describe, it, expect } from "@jest/globals";
import { $array, $lerp } from "../../../src/supa";

describe("wet_r", () => {
  it("throws an error if hc is negative", () => {
    expect(() => wet_r([-1], [])).toThrow(
      "Input parameter hc must be non-negative.",
    );
  });

  it("should return the correct value", () => {
    const expected = [
      0.0021645021645021645, 0.003349471689074972, 0.004535720923832167,
      0.005723199160890929, 0.006911858199076293, 0.008101652195580091,
      0.009292537527831646, 0.01048447266477957, 0.011677418046854316,
      0.012876188354129531, 0.01408040692912621, 0.015285091429744541,
      0.01649022961406062, 0.01769580964370202, 0.01890182006783671,
      0.020108249807904748, 0.021315088143053263,
    ];

    const result = wet_r(
      $lerp(17, 28, 32),
      $lerp(17, 0, 1),
      $array(17, 0.45),
      16.5,
    );

    expect(result).toStrictEqual(expected);
  });
});
