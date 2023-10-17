import { local_q_work } from "../../../src/jos3_functions/thermoregulation/local_q_work";
import { describe, it, expect } from "@jest/globals";

describe("local_q_work", () => {
  it("should return the right values", () => {
    const expected = [
      0, 0, 2.275, 2, 3.225, 0.655, 0.3475, 0.125, 0.655, 0.3475, 0.125, 5.025,
      2.475, 0.125, 5.025, 2.475, 0.125,
    ];

    const result = local_q_work(5, 6);
    expect(result).toStrictEqual(expected);
  });
});
