import { error_signals } from "../../../src/jos3_functions/thermoregulation/error_signals";
import { describe, it, expect } from "@jest/globals";
import { $array, $lerp } from "../../../src/supa";

describe("error_signals", () => {
  it("should use appropriate defaults", () => {
    const withDefaults = error_signals();
    const withoutDefaults = error_signals($array(17, 0));

    expect(withDefaults).toStrictEqual(withoutDefaults);
  });

  it("should return the correct values", () => {
    const expected = { wrms: 0.5861764705882355, clds: 2.0505294117647055 };
    const result = error_signals($lerp(17, -5, 5));

    expect(result).toStrictEqual(expected);
  });
});
