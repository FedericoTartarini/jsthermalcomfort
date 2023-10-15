import { expect, describe, it } from "@jest/globals";
import { pet_steady } from "../../src/models/pet_steady";

describe("pet_steady", () => {
  it("should be a function", () => {
    expect(pet_steady).toBeInstanceOf(Function);
  });

  it.each([
    { tdb: 20, tr: 20, rh: 50, v: 0.15, met: 1.37, clo: 0.5, expected: 18.85 },
    { tdb: 30, tr: 30, rh: 50, v: 0.15, met: 1.37, clo: 0.5, expected: 30.59 },
    { tdb: 20, tr: 20, rh: 50, v: 0.5, met: 1.37, clo: 0.5, expected: 17.16 },
    { tdb: 21, tr: 21, rh: 50, v: 0.1, met: 1.37, clo: 0.9, expected: 21.08 },
    { tdb: 20, tr: 20, rh: 50, v: 0.1, met: 1.37, clo: 0.9, expected: 19.92 },
    { tdb: -5, tr: 40, rh: 2, v: 0.5, met: 1.37, clo: 0.9, expected: 7.82 },
    { tdb: -5, tr: -5, rh: 50, v: 5.0, met: 1.37, clo: 0.9, expected: -13.38 },
    { tdb: 30, tr: 60, rh: 80, v: 1.0, met: 1.37, clo: 0.9, expected: 43.05 },
    { tdb: 30, tr: 30, rh: 80, v: 1.0, met: 1.37, clo: 0.9, expected: 31.69 },
  ])("%j", ({ tdb, tr, v, rh, met, clo, expected }) => {
    const result = pet_steady(tdb, tr, v, rh, met, clo);
    expect(result).toBeCloseTo(expected);
  });
});
