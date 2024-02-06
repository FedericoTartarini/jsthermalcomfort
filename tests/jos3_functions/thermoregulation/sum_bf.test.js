import { sum_bf } from "../../../src/jos3_functions/thermoregulation/sum_bf";
import { describe, it, expect } from "@jest/globals";
import { $lerp } from "../../../src/supa";

describe("sum_bf", () => {
  it("should return the correct values", () => {
    const result = sum_bf(
      $lerp(17, 1, 3),
      $lerp(17, 3, 6),
      $lerp(17, 6, 9),
      $lerp(17, 9, 12),
      15,
      18,
    );

    const expected = 482.5;

    expect(result).toBe(expected);
  });
});
