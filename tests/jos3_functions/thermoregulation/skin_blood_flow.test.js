import { skin_blood_flow } from "../../../src/jos3_functions/thermoregulation/skin_blood_flow";
import { describe, it, expect } from "@jest/globals";
import { $lerp } from "../../../src/supa";
import * as math from "mathjs";

describe("skin_blood_flow", () => {
  it.each([
    {
      age: 20,
      expected: [
        24.303102589863705, 6.392795481701565, 24.325504462771203,
        21.441665582494252, 34.997709875245285, 8.728079349976067,
        4.698289478291021, 16.564292938097946, 9.31408609467257,
        5.013734516359185, 17.676426202890116, 27.06338811055306,
        7.433159005841143, 15.615057345156426, 28.880434831967982,
        7.9322242797878575, 16.663458551901805,
      ],
    },
    {
      age: 61,
      expected: [
        16.754556209819384, 4.394834452093219, 9.7311887869613,
        8.444365458928788, 9.952975918891873, 3.647580618615998,
        1.981844511386393, 6.568779123396375, 3.8924806428508925,
        2.1149063459600397, 7.009809585698761, 7.646557467698562,
        2.347006194539438, 4.537738518368928, 8.159950399878202,
        2.5045851308318032, 4.842404100658873,
      ],
    },
  ])(
    "should return the correct value when age is $age",
    ({ age, expected }) => {
      const result = skin_blood_flow(
        math.matrix($lerp(17, 1, 3)),
        math.matrix($lerp(17, 3, 6)),
        1.72,
        74.43,
        "dubois",
        age,
        2.59,
      ).toArray();

      expect(result).toHaveLength(expected.length);

      for (let i = 0; i < expected.length; i++) {
        expect(result[i]).toBeCloseTo(expected[i]);
      }
    },
  );
});
