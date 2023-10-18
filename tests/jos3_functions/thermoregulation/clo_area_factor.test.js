import { clo_area_factor } from "../../../src/jos3_functions/thermoregulation/clo_area_factor";
import { describe, it, expect } from "@jest/globals";
import { $lerp } from "../../../src/supa";

describe("clo_area_factor", () => {
  it("should return the correct value", () => {
    const expected = [
      1, 1.011764705882353, 1.0235294117647058, 1.035294117647059,
      1.0470588235294118, 1.0588235294117647, 1.0705882352941176,
      1.0823529411764705, 1.0941176470588236, 1.1029411764705883,
      1.1088235294117648, 1.1147058823529412, 1.1205882352941177,
      1.1264705882352941, 1.1323529411764706, 1.138235294117647,
      1.1441176470588235,
    ];

    const result = clo_area_factor($lerp(17, 0, 1));
    expect(result).toStrictEqual(expected);
  });
});
