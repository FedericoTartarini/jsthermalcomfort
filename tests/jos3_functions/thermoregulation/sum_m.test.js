import { sum_m } from "../../../src/jos3_functions/thermoregulation/sum_m";
import { describe, it, expect } from "@jest/globals";
import { $lerp } from "../../../src/supa";
import * as math from "mathjs";

describe("sum_m", () => {
  it("returns correct result", () => {
    const result = sum_m(
      [
        math.matrix($lerp(17, 9, 12)),
        math.matrix($lerp(17, 12, 15)),
        math.matrix($lerp(17, 15, 18)),
        math.matrix($lerp(17, 18, 21)),
      ],
      math.matrix($lerp(17, 1, 3)),
      math.matrix($lerp(17, 3, 6)),
      math.matrix($lerp(17, 6, 9)),
    );

    const expected = {
      q_thermogenesis_core: [
        15.0, 19.6875, 20.375, 21.0625, 16.5, 22.4375, 23.125, 23.8125, 24.5,
        25.1875, 25.875, 26.5625, 27.25, 27.9375, 28.625, 29.3125, 30.0,
      ],
      q_thermogenesis_muscle: [
        16.0, 12.1875, 12.375, 12.5625, 18.0, 12.9375, 13.125, 13.3125, 13.5,
        13.6875, 13.875, 14.0625, 14.25, 14.4375, 14.625, 14.8125, 15.0,
      ],
      q_thermogenesis_fat: [
        15.0, 15.1875, 15.375, 15.5625, 15.75, 15.9375, 16.125, 16.3125, 16.5,
        16.6875, 16.875, 17.0625, 17.25, 17.4375, 17.625, 17.8125, 18.0,
      ],
      q_thermogenesis_skin: [
        18.0, 18.1875, 18.375, 18.5625, 18.75, 18.9375, 19.125, 19.3125, 19.5,
        19.6875, 19.875, 20.0625, 20.25, 20.4375, 20.625, 20.8125, 21.0,
      ],
    };

    expect(result.q_thermogenesis_core.toArray()).toStrictEqual(
      expected.q_thermogenesis_core,
    );
    expect(result.q_thermogenesis_muscle.toArray()).toStrictEqual(
      expected.q_thermogenesis_muscle,
    );
    expect(result.q_thermogenesis_fat.toArray()).toStrictEqual(
      expected.q_thermogenesis_fat,
    );
    expect(result.q_thermogenesis_skin.toArray()).toStrictEqual(
      expected.q_thermogenesis_skin,
    );
  });
});
