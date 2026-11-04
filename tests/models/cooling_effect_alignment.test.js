import { describe, expect, jest, test } from "@jest/globals";
import pkg, { cooling_effect } from "../../src/index.js";

// Mirror test_cooling_effect_regression_values at local Python commit
// a4244026c71a7befbb1a5ced4c7b367e4966f951. Additional expected values
// below were evaluated with the same Python checkout.
describe("cooling_effect Python alignment", () => {
  test.each([
    [25, 25, 0.05, 50, 1.2, 0.5, 0],
    [25, 25, 0.1, 50, 1.2, 0.5, 0],
    [25, 25, 0.3, 50, 1.2, 0.5, 1.68],
    [35, 35, 1.5, 90, 2.5, 0.2, 5.14],
    [15, 15, 0.5, 10, 1, 1.2, 2.61],
  ])("regression %#", (tdb, tr, vr, rh, met, clo, expected) => {
    expect(cooling_effect(tdb, tr, vr, rh, met, clo).ce).toBeCloseTo(
      expected,
      2,
    );
  });

  test("broadcasts scalars and different trailing dimensions without mutation", () => {
    const tdb = Object.freeze([Object.freeze([25]), Object.freeze([26])]);
    const vr = Object.freeze([0.1, 0.3, 0.5]);
    expect(cooling_effect(tdb, 25, vr, 50, 1.2, 0.5)).toEqual({
      ce: [
        [0, 1.68, 2.62],
        [0, 1.62, 2.51],
      ],
    });
    expect(cooling_effect([[[25]]], 25, 0.3, 50, 1.2, 0.5)).toEqual({
      ce: [[[1.68]]],
    });
  });

  test("IP conversion and mixed-case units", () => {
    expect(cooling_effect(77, 77, [0, 1.64], 50, 1, 0.6, 0, "iP")).toEqual({
      ce: [0, 3.95],
    });
    expect(cooling_effect(25, 25, 0.3, 50, 1.2, 0.5, 0, "si").ce).toBe(1.68);
  });

  test("booleans follow Python numeric semantics", () => {
    expect(cooling_effect(25, 25, false, 50, 1.2, 0.5).ce).toBe(0);
    expect(cooling_effect(25, 25, 0.3, 50, 1.2, 0.5, [false, true])).toEqual(
      cooling_effect(25, 25, 0.3, 50, 1.2, 0.5, [0, 1]),
    );
  });

  test("unbracketed root warns and returns zero, as in Python", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect(
        cooling_effect(
          21.018997491311307,
          28.698430328392455,
          0.10077128542484631,
          32.953097349514174,
          1.8597762999796692,
          0.7799847811956819,
          0.1,
        ).ce,
      ).toBe(0);
      expect(warn).toHaveBeenCalledTimes(1);
    } finally {
      warn.mockRestore();
    }
  });

  test.each([[], [[]], [[25], [26, 27]], [25, [26]]].map((tdb) => ({ tdb })))(
    "rejects empty or ragged input %#",
    ({ tdb }) => {
      expect(() => cooling_effect(tdb, 25, 0.3, 50, 1.2, 0.5)).toThrow(
        RangeError,
      );
    },
  );
  test("rejects incompatible shapes", () => {
    expect(() =>
      cooling_effect([25, 26], 25, [0.1, 0.3, 0.5], 50, 1.2, 0.5),
    ).toThrow(RangeError);
  });
  test.each(
    [null, undefined, "25", {}, [25, "26"], Array(1), NaN, Infinity].map(
      (tdb) => ({ tdb }),
    ),
  )("retains JS numeric validation %#", ({ tdb }) => {
    expect(() => cooling_effect(tdb, 25, 0, 50, 1.2, 0.5)).toThrow(TypeError);
  });
  test.each([null, 1, true, [], {}].map((units) => ({ units })))(
    "rejects non-string units %#",
    ({ units }) => {
      expect(() => cooling_effect(25, 25, 0.3, 50, 1.2, 0.5, 0, units)).toThrow(
        TypeError,
      );
    },
  );
  test("still-air shortcut is silent and package export is unchanged", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect(cooling_effect(25, 25, [-1, 0, 0.1], 50, 1.2, 0.5).ce).toEqual([
        0, 0, 0,
      ]);
      expect(warn).not.toHaveBeenCalled();
      expect(pkg.models.cooling_effect).toBe(cooling_effect);
    } finally {
      warn.mockRestore();
    }
  });
});
