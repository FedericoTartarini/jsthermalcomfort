import JOS3Defaults from "../../../src/jos3_functions/JOS3Defaults";
import { conv_coef } from "../../../src/jos3_functions/thermoregulation/conv_coef";
import { describe, it, expect } from "@jest/globals";
import { $array } from "../../../src/supa";

describe("conv_coef", () => {
  it("should use appropriate defaults", () => {
    const withDefaults = conv_coef();
    const withoutDefaults = conv_coef(
      JOS3Defaults.posture,
      $array(17, JOS3Defaults.air_speed),
      $array(17, JOS3Defaults.dry_bulb_air_temperature),
      $array(17, JOS3Defaults.skin_temperature),
    );

    expect(withDefaults).toStrictEqual(withoutDefaults);
  });

  it("should throw an error if the posture is invalid", () => {
    expect(() => conv_coef("squatting")).toThrow(
      "Invalid posture squatting. Must be one of standing, sitting, lying, sedentary, supine.",
    );
  });

  it.each([
    {
      posture: "standing",
      v: $array(17, JOS3Defaults.air_speed),
      tdb: $array(17, JOS3Defaults.dry_bulb_air_temperature),
      t_skin: $array(17, JOS3Defaults.skin_temperature),
      expected: [
        4.48, 4.48, 2.97, 2.91, 2.85, 3.61, 3.55, 3.67, 3.61, 3.55, 3.67, 2.8,
        2.04, 2.04, 2.8, 2.04, 2.04,
      ],
    },
    {
      posture: "sitting",
      v: $array(17, JOS3Defaults.air_speed),
      tdb: $array(17, JOS3Defaults.dry_bulb_air_temperature),
      t_skin: $array(17, JOS3Defaults.skin_temperature),
      expected: [
        4.75, 4.75, 3.12, 2.48, 1.84, 3.76, 3.62, 2.06, 3.76, 3.62, 2.06, 2.98,
        2.98, 2.62, 2.98, 2.98, 2.62,
      ],
    },
    {
      posture: "lying",
      v: $array(17, JOS3Defaults.air_speed),
      tdb: $array(17, JOS3Defaults.dry_bulb_air_temperature),
      t_skin: $array(17, JOS3Defaults.skin_temperature),
      expected: [
        1.9515668461842968, 1.9515668461842968, 1.306412409126461,
        1.306412409126461, 1.306412409126461, 1.688651478943886,
        8.450354381770717, 3.553946358382183, 1.688651478943886,
        8.450354381770717, 3.553946358382183, 1.974628055225179,
        1.0017115211295704, 0.9833072145765787, 1.974628055225179,
        1.0017115211295704, 0.9833072145765787,
      ],
    },
    {
      posture: "sedentary",
      v: $array(17, JOS3Defaults.air_speed),
      tdb: $array(17, JOS3Defaults.dry_bulb_air_temperature),
      t_skin: $array(17, JOS3Defaults.skin_temperature),
      expected: [
        4.75, 4.75, 3.12, 2.48, 1.84, 3.76, 3.62, 2.06, 3.76, 3.62, 2.06, 2.98,
        2.98, 2.62, 2.98, 2.98, 2.62,
      ],
    },
    {
      posture: "supine",
      v: $array(17, JOS3Defaults.air_speed),
      tdb: $array(17, JOS3Defaults.dry_bulb_air_temperature),
      t_skin: $array(17, JOS3Defaults.skin_temperature),
      expected: [
        1.9515668461842968, 1.9515668461842968, 1.306412409126461,
        1.306412409126461, 1.306412409126461, 1.688651478943886,
        8.450354381770717, 3.553946358382183, 1.688651478943886,
        8.450354381770717, 3.553946358382183, 1.974628055225179,
        1.0017115211295704, 0.9833072145765787, 1.974628055225179,
        1.0017115211295704, 0.9833072145765787,
      ],
    },
  ])(
    "returns correct values when posture is $posture, v is $v, tdb is $tdb, t_skin is $t_skin",
    ({ posture, v, tdb, t_skin, expected }) => {
      const result = conv_coef(posture, v, tdb, t_skin);
      expect(result).toStrictEqual(expected);
    },
  );
});
