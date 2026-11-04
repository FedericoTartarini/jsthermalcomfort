import { describe, expect, it } from "@jest/globals";
import { two_nodes_gagge_sleep } from "../../src/models/two_nodes_gagge_sleep.js";

describe("two_nodes_gagge_sleep", () => {
  const expectedTolerance = (actual, expected) => {
    const tolerance = 0.01 + 0.005 * Math.abs(expected);
    expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
  };

  it("should calculate correctly for a single input", () => {
    const result = two_nodes_gagge_sleep(18, 18, 0.05, 50, 1.4, 1.76);

    const expected = {
      set: 24.28,
      t_core: 37.03,
      t_skin: 33.67,
      wet: 0.27,
      t_sens: 1.12,
      disc: 1.47,
      e_skin: 28.75,
      met_shivering: 0.0,
      alfa: 0.13,
      skin_blood_flow: 7.11,
    };

    Object.keys(expected).forEach((field) => {
      expectedTolerance(result[field], expected[field]);
    });
  });

  it.each([
    ["tdb", 0],
    ["tr", 1],
    ["v", 2],
    ["rh", 3],
    ["clo", 4],
    ["thickness_quilt", 5],
  ])("rejects array-valued %s input (the JS API is scalar)", (_, index) => {
    const inputs = [18, 18, 0.05, 50, 1.4, 1.76];
    inputs[index] = [inputs[index]];

    expect(() => two_nodes_gagge_sleep(...inputs)).toThrow(TypeError);
  });

  it("should throw TypeError on unexpected kwargs", () => {
    expect(() => {
      two_nodes_gagge_sleep(18, 18, 0.05, 50, 1.4, 1.76, 0, 101325, {
        foo: 123,
      });
    }).toThrow(TypeError);

    try {
      two_nodes_gagge_sleep(18, 18, 0.05, 50, 1.4, 1.76, 0, 101325, {
        foo: 123,
      });
    } catch (e) {
      expect(e.message).toContain("Unexpected keyword arguments");
    }
  });

  it("should throw error on invalid type for main inputs", () => {
    expect(() => {
      two_nodes_gagge_sleep("string", 18, 0.05, 50, 1.4, 1.76);
    }).toThrow();
  });

  it("should throw RangeError when thickness_quilt is negative", () => {
    expect(() => {
      two_nodes_gagge_sleep(18, 18, 0.05, 50, 1.4, -1.76);
    }).toThrow(RangeError);
  });

  it("should throw TypeError on non-integer ltime", () => {
    expect(() => {
      two_nodes_gagge_sleep(18, 18, 0.05, 50, 1.4, 1.76, 0, 101325, {
        ltime: 1.5,
      });
    }).toThrow(TypeError);
  });

  it("should throw TypeError on string ltime", () => {
    expect(() => {
      two_nodes_gagge_sleep(18, 18, 0.05, 50, 1.4, 1.76, 0, 101325, {
        ltime: "1",
      });
    }).toThrow(TypeError);
  });

  it("should throw TypeError on boolean ltime", () => {
    expect(() => {
      two_nodes_gagge_sleep(18, 18, 0.05, 50, 1.4, 1.76, 0, 101325, {
        ltime: true,
      });
    }).toThrow(TypeError);
    expect(() => {
      two_nodes_gagge_sleep(18, 18, 0.05, 50, 1.4, 1.76, 0, 101325, {
        ltime: false,
      });
    }).toThrow(TypeError);
  });

  it("should throw RangeError on non-positive ltime", () => {
    expect(() => {
      two_nodes_gagge_sleep(18, 18, 0.05, 50, 1.4, 1.76, 0, 101325, {
        ltime: 0,
      });
    }).toThrow(RangeError);
    expect(() => {
      two_nodes_gagge_sleep(18, 18, 0.05, 50, 1.4, 1.76, 0, 101325, {
        ltime: -1,
      });
    }).toThrow(RangeError);
  });
});
