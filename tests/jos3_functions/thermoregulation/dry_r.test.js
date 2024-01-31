import { dry_r } from "../../../src/jos3_functions/thermoregulation/dry_r";
import { describe, it, expect } from "@jest/globals";
import { $lerp } from "../../../src/supa";
import * as math from "mathjs";

describe("dry_r", () => {
  it("should throw an error if hc or hr are negative", () => {
    expect(() => dry_r(math.matrix([-1]), math.matrix([]), math.matrix([]))).toThrow(
      "Input parameters hc and hr must be non-negative.",
    );

    expect(() => dry_r(math.matrix([]), math.matrix([-1]), math.matrix([]))).toThrow(
      "Input parameters hc and hr must be non-negative.",
    );
  });

  it("should return the correct value", () => {
    const expected = [
      0.5,
      0.44864497599451303,
      0.40961890243902443,
      0.3795553806133625,
      0.35621031746031745,
      0.3380302601809955,
      0.32390573089700997,
      0.31302322796934867,
      0.30477272727272725,
      0.29988274759056166,
      0.29662531210986265,
      0.29474244707438985,
      0.2940277777777778,
      0.2943142429623783,
      0.29546515984015986,
      0.29736761998099315,
      0.29992753623188406
    ];

    const result = dry_r(
      math.matrix($lerp(17, 1, 3)),
      math.matrix($lerp(17, 1, 3)),
      math.matrix($lerp(17, 0, 1)),
    );

    expect(result.toArray()).toStrictEqual(expected);
  });
});
