import { dry_r } from "../../../src/jos3_functions/thermoregulation/dry_r";
import { describe, it, expect } from "@jest/globals";
import { $lerp } from "../../../src/supa";

describe("dry_r", () => {
  it("should throw an error if hc or hr are negative", () => {
    expect(() => dry_r([-1], [], [])).toThrow(
      "Input parameters hc and hr must be non-negative.",
    );

    expect(() => dry_r([], [-1], [])).toThrow(
      "Input parameters hc and hr must be non-negative.",
    );
  });

  it("should return the correct value", () => {
    const expected = [
      0.5, 0.4512841097271222, 0.413692327505715, 0.3843193443385259,
      0.3611896893588896, 0.34291333817477604, 0.3284838285446805,
      0.3171545252041911, 0.30835987963122685, 0.30224929971988795,
      0.29835978121982176, 0.2958153949625314, 0.2944191265905248,
      0.2940106188811064, 0.2944580256344962, 0.2956519454227345,
      0.29750084095334794,
    ];

    const result = dry_r($lerp(17, 1, 3), $lerp(17, 1, 3), $lerp(17, 0, 1));
    expect(result).toStrictEqual(expected);
  });
});
