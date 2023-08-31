import { expect, describe, it } from "@jest/globals";
import { t_o, t_o_array } from "../../src/psychrometrics/t_o";
import { deep_close_to_array } from "../test_utilities";

describe("t_o", () => {
  it.each([
    {
      airTemperature: 0,
      meanRadiantTemperature: 0,
      airSpeed: 0,
      standard: "ISO",
      expected: 0,
    },
    {
      airTemperature: 1,
      meanRadiantTemperature: 1,
      airSpeed: 1,
      standard: "ISO",
      expected: 1,
    },
    {
      airTemperature: -1,
      meanRadiantTemperature: -1,
      airSpeed: 1,
      standard: "ISO",
      expected: -1,
    },
    {
      airTemperature: -273,
      meanRadiantTemperature: 0,
      airSpeed: 1,
      standard: "ISO",
      expected: -207.4109109748925,
    },
    {
      airTemperature: 0,
      meanRadiantTemperature: -273,
      airSpeed: 1,
      standard: "ISO",
      expected: -65.5890890251075,
    },
    {
      airTemperature: 0,
      meanRadiantTemperature: 0,
      airSpeed: 0,
      standard: "ASHRAE",
      expected: 0,
    },
    {
      airTemperature: 1,
      meanRadiantTemperature: 1,
      airSpeed: 1,
      standard: "ASHRAE",
      expected: 1,
    },
    {
      airTemperature: -1,
      meanRadiantTemperature: -1,
      airSpeed: 1,
      standard: "ASHRAE",
      expected: -1,
    },
    {
      // This is another case like above, the Python version returns -191.1.
      airTemperature: -273,
      meanRadiantTemperature: -1,
      airSpeed: 1,
      standard: "ASHRAE",
      expected: -191.4,
    },
    {
      airTemperature: 0,
      meanRadiantTemperature: -273,
      airSpeed: 1,
      standard: "ASHRAE",
      expected: -81.9,
    },
  ])(
    "returns $expected when airTemperature is $airTemperature, meanRadiantTemperature is $meanRadiantTemperature, airSpeed is $airSpeed, and the standard is $standard",
    ({
      airTemperature,
      meanRadiantTemperature,
      airSpeed,
      standard,
      expected,
    }) => {
      const result = t_o(
        airTemperature,
        meanRadiantTemperature,
        airSpeed,
        standard,
      );

      expect(result).toBeCloseTo(expected);
    },
  );

  it("throws an error if the airSpeed is negative", () => {
    expect(() => t_o(0, 0, -1, "ISO")).toThrow("v cannot be negative");
  });

  it("throws an error if standard is not valid", () => {
    expect(() => t_o(0, 0, 0, "JORDAN")).toThrow(
      "standard must be one of ISO or ASHRAE",
    );
  });
});

describe("t_o_array", () => {
  it.each([
    {
      tdb: [0, 1, -1, -273, 0],
      tr: [0, 1, -1, 0, -273],
      v: [0, 1, 1, 1, 1],
      standard: "ISO",
      expected: [0, 1, -1, -207.4109, -65.589],
    },
    {
      tdb: [0, 1, -1, -273, 0],
      tr: [0, 1, -1, -1, -273],
      v: [0, 1, 1, 1, 1],
      standard: "ASHRAE",
      expected: [0, 1, -1, -191.4, -81.9],
    },
  ])(
    "returns $expected when tdb is $tdb, tr is $tr, v is $v and standard is $standard",
    ({ tdb, tr, v, standard, expected }) => {
      const result = t_o_array(tdb, tr, v, standard);
      deep_close_to_array(result, expected, 2);
    },
  );
});
