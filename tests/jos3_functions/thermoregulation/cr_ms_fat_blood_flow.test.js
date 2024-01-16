import { cr_ms_fat_blood_flow } from "../../../src/jos3_functions/thermoregulation/cr_ms_fat_blood_flow";
import { describe, it, expect } from "@jest/globals";
import { $lerp } from "../../../src/supa";
import * as math from "mathjs";

describe("cr_ms_fat_blood_flow", () => {
  const result = cr_ms_fat_blood_flow(
    math.matrix($lerp(17, 12, 18)),
    math.matrix($lerp(17, 24, 36)),
    1.72,
    74.43,
    "dubois",
    20,
    2.59,
  );

  let expected = [
    {
      property: "bf_core",
      expected: [
        35.30423941882337, 47.1847709842923, 122.23781944848352,
        121.65180286184963, 18.714221377553365, 37.601788223491795,
        37.69980316853238, 37.943037106388175, 40.50376586751587,
        40.60178081255645, 40.84501475041225, 43.003136372838426,
        42.726586467445266, 43.60978548398332, 45.90511401686251,
        45.62856411146934, 46.511763128007395,
      ],
    },
    {
      property: "bf_muscle",
      expected: [
        31.637458224302655, 0.0, 0.0, 0.0, 47.45678259291794, 0.0, 0.0, 0.0,
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
      ],
    },
    {
      property: "bf_fat",
      expected: [
        0.2654002282485091, 0.0, 0.0, 0.0, 2.2223513452205346, 0.0, 0.0, 0.0,
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
      ],
    },
  ];

  it.each(expected)(
    "should return the correct value for $property",
    ({ property, expected }) => {
      let actual = result[property];
      let actualLength = actual.size()[0];

      expect(actualLength).toBe(expected.length);

      for (let i = 0; i < actualLength; i++) {
        expect(actual.get([i])).toBeCloseTo(expected[i], 13);
      }
    },
  );
});
