import { ava_blood_flow } from "../../../src/jos3_functions/thermoregulation/ava_blood_flow";
import { describe, it, expect } from "@jest/globals";
import { $lerp } from "../../../src/supa";

describe("ava_blood_flow", () => {
  it.each([
    {
      age: 21,
      expected: {
        bf_ava_hand: 1.7556902856019296,
        bf_ava_foot: 2.2177140449708586,
      },
    },
    {
      age: 61,
      expected: {
        bf_ava_hand: 1.3167677142014473,
        bf_ava_foot: 1.6632855337281442,
      },
    },
  ])("return the appropriate value when age is $age", ({ age, expected }) => {
    const result = ava_blood_flow(
      $lerp(17, 1, 3),
      $lerp(17, 3, 6),
      1.78,
      74.43,
      "dubois",
      age,
      2.59,
    );

    expect(result).toStrictEqual(expected);
  });
});
