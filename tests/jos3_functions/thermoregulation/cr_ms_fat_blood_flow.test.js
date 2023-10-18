import { cr_ms_fat_blood_flow } from "../../../src/jos3_functions/thermoregulation/cr_ms_fat_blood_flow";
import { describe, it, expect } from "@jest/globals";
import { $lerp } from "../../../src/supa";

describe("cr_ms_fat_blood_flow", () => {
  it("should return the correct values", () => {
    let expected = [
      [
        35.30423941882339, 47.12786946186046, 122.12401640361986,
        121.48109829455413, 18.714221377553372, 37.31728061133258,
        37.35839403394131, 37.544726449365264, 40.04855368806111,
        40.08966711066985, 40.2759995260938, 42.37721962608814,
        42.04376819826313, 42.870065692369344, 45.10849270281669,
        44.77504127499168, 45.601338769097886,
      ],
      [
        31.637458224302655, 0, 0, 0, 47.229176503190565, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0,
      ],
      [
        0.26540022824850923, 0, 0, 0, 2.2223513452205355, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0,
      ],
    ];

    const result = cr_ms_fat_blood_flow(
      $lerp(17, 12, 18),
      $lerp(17, 24, 36),
      1.72,
      74.43,
      "dubois",
      20,
      2.59,
    );

    expect(result).toStrictEqual(expected);
  });
});
