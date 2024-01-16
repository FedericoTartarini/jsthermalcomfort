import { error_signals } from "../../../src/jos3_functions/thermoregulation/error_signals";
import { describe, it, expect } from "@jest/globals";
import { $lerp } from "../../../src/supa";
import * as math from "mathjs";

describe("error_signals", () => {
  it("should use appropriate defaults", () => {
    const withDefaults = error_signals();
    const withoutDefaults = error_signals(math.zeros(17));

    expect(withDefaults).toStrictEqual(withoutDefaults);
  });

  it("should return the correct values", () => {
    const expected = { wrms: 0.71275, clds: 1.9560625 };
    const result = error_signals(math.matrix($lerp(17, -5, 5)));

    expect(result).toStrictEqual(expected);
  });
});
