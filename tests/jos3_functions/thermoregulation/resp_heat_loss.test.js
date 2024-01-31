import { resp_heat_loss } from "../../../src/jos3_functions/thermoregulation/resp_heat_loss";
import { describe, it, expect } from "@jest/globals";

describe("resp_heat_loss", () => {
  it("should return the correct values", () => {
    const expected = {"res_sh": 0.1456, "res_lh": -29.803748000000002};
    const result = resp_heat_loss(32, 39, 52);
    expect(result).toStrictEqual(expected);
  });
});
