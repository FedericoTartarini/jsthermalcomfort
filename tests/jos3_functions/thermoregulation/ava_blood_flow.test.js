import { ava_blood_flow } from "../../../src/jos3_functions/thermoregulation/ava_blood_flow";
import { describe, it, expect } from "@jest/globals";
import { $lerp } from "../../../src/supa";
import * as math from "mathjs";

describe("ava_blood_flow", () => {
  it.each([
    {
      age: 20,
      expected: {
        bf_ava_hand: 1.7125826049243418,
        bf_ava_foot: 2.163262237799169,
      },
    },
    {
      age: 61,
      expected: {
        bf_ava_hand: 1.2844369536932565,
        bf_ava_foot: 1.6224466783493767,
      },
    },
  ])("return the appropriate value when age is $age", ({ age, expected }) => {
    const result = ava_blood_flow(
      math.matrix($lerp(17, 1, 3)),
      math.matrix($lerp(17, 3, 6)),
      1.72,
      74.43,
      "dubois",
      age,
      2.59,
    );

    expect(result.bf_ava_hand).toBeCloseTo(expected.bf_ava_hand, 14);
    expect(result.bf_ava_foot).toBeCloseTo(expected.bf_ava_foot, 14);
  });
});
