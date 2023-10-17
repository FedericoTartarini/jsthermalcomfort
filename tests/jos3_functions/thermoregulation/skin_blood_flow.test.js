import { skin_blood_flow } from "../../../src/jos3_functions/thermoregulation/skin_blood_flow";
import { describe, it, expect } from "@jest/globals";
import { $lerp } from "../../../src/supa";

describe("skin_blood_flow", () => {
  it.each([
    {
      age: 20,
      expected: [
        24.230143557263187, 6.364876726542825, 24.192163391361344,
        21.295863167120274, 34.715034049850765, 8.648423125492805,
        4.6496361900695735, 16.36839851361775, 9.193870867997145,
        4.942884280101641, 17.400737691305178, 26.606110387435855,
        7.299829837048958, 15.312946245821113, 28.284132222985352,
        7.760223095739952, 16.278719062400032,
      ],
    },
    {
      age: 61,
      expected: [
        16.704761670069523, 4.375739470682227, 9.681242792743468,
        8.389589154257639, 9.87802173962727, 3.6158760418662994,
        1.9622137619488487, 6.493245483565689, 3.8439258719443257,
        2.085968699841641, 6.902768241546565, 7.521390867956149,
        2.3066177191198762, 4.4525938163632865, 7.995757768128562,
        2.4520938839025463, 4.733414633081335,
      ],
    },
  ])(
    "should return the correct value when age is $age",
    ({ age, expected }) => {
      const result = skin_blood_flow(
        $lerp(17, 1, 3),
        $lerp(17, 3, 6),
        1.72,
        74.43,
        "dubois",
        age,
        2.59,
      );

      expect(result).toHaveLength(expected.length);

      for (let i = 0; i < expected.length; i++) {
        expect(result[i]).toBeCloseTo(expected[i]);
      }
    },
  );
});
