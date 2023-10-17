import { nonshivering } from "../../../src/jos3_functions/thermoregulation/nonshivering";
import { describe, it, expect } from "@jest/globals";
import { $lerp } from "../../../src/supa";

describe("nonshivering", () => {
  it.each([
    {
      age: 30,
      expected: [
        0, 1.908924555286287, 0, 1.908924555286287, 1.908924555286287,
        2.160098838876588, 0, 0, 2.160098838876588, 0, 0, 0, 0, 0, 0, 0, 0,
      ],
    },
    {
      age: 40,
      expected: [
        0, 1.898387115061335, 0, 1.898387115061335, 1.898387115061335,
        2.148174893358879, 0, 0, 2.148174893358879, 0, 0, 0, 0, 0, 0, 0, 0,
      ],
    },
    {
      age: 50,
      expected: [
        0, 1.898387115061335, 0, 1.898387115061335, 1.898387115061335,
        2.148174893358879, 0, 0, 2.148174893358879, 0, 0, 0, 0, 0, 0, 0, 0,
      ],
    },
    {
      age: 60,
      expected: [
        0, 1.898387115061335, 0, 1.898387115061335, 1.898387115061335,
        2.148174893358879, 0, 0, 2.148174893358879, 0, 0, 0, 0, 0, 0, 0, 0,
      ],
    },
    {
      age: 70,
      expected: [
        0, 1.898387115061335, 0, 1.898387115061335, 1.898387115061335,
        2.148174893358879, 0, 0, 2.148174893358879, 0, 0, 0, 0, 0, 0, 0, 0,
      ],
    },
  ])("returns correct result when age is $age", ({ age, expected }) => {
    const result = nonshivering(
      $lerp(17, -5, -1),
      1.72,
      74.43,
      "dubois",
      age,
      false,
      true,
    );

    expect(result).toHaveLength(expected.length);

    for (let i = 0; i < expected.length; i++) {
      expect(result[i]).toBeCloseTo(expected[i]);
    }
  });
});
