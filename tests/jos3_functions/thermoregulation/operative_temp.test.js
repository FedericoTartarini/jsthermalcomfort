import { operative_temp } from "../../../src/jos3_functions/thermoregulation/operative_temp";
import { describe, it, expect } from "@jest/globals";
import { $lerp } from "../../../src/supa";

describe("operative_temp", () => {
  it("should return the correct value", () => {
    const result = operative_temp(
      $lerp(17, 28, 32),
      $lerp(17, 20, 28),
      $lerp(17, 1, 3),
      $lerp(17, 0, 1),
    );

    const expected = [
      28, 27.847058823529412, 27.815856777493604, 27.86425339366516,
      27.967545638945232, 28.110294117647058, 28.28235294117647,
      28.476780185758514, 28.688665710186516, 28.914438502673796,
      29.151439299123908, 29.397647058823534, 29.65149833518313,
      29.91176470588235, 30.177467597208373, 30.447817836812142,
      30.722171945701362,
    ];

    expect(result).toStrictEqual(expected);
  });
});
