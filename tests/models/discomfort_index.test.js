import { expect, describe, it } from "@jest/globals";
import {
  discomfort_index,
  discomfortIndex_array,
} from "../../src/models/discomfort_index";

describe("discomfort_index", () => {
  it.each([
    {
      tdb: 25,
      rh: 50,
      expected: {
        di: 22.1,
        discomfort_condition: "Less than 50% feels discomfort",
      },
    },
    {
      tdb: 35,
      rh: 34.5,
      expected: {
        di: 27.6,
        discomfort_condition: "Most of the population feels discomfort",
      },
    },
    {
      tdb: 40,
      rh: 75.8,
      expected: {
        di: 36.6,
        discomfort_condition: "State of medical emergency",
      },
    },
    {
      tdb: 34,
      rh: 75.8,
      expected: {
        di: 31.4,
        discomfort_condition: "Everyone feels severe stress",
      },
    },
    {
      tdb: 20,
      rh: 25,
      expected: {
        di: 17.7,
        discomfort_condition: "No discomfort",
      },
    },
  ])("returns", ({ tdb, rh, expected }) => {
    const result = discomfort_index(tdb, rh);

    expect(result).toStrictEqual(expected);
  });
});

describe("discomfortIndex_array", () => {
  it.each([
    {
      tdb: [25, 28, 30],
      rh: [60, 75, 90],
      expected: {
        di: [22.7, 26.1, 29.1],
        discomfort_condition: [
          "Less than 50% feels discomfort",
          "More than 50% feels discomfort",
          "Everyone feels severe stress",
        ],
      },
    },
    {
      tdb: [34.5, 38, 15.9],
      rh: [35, 65.3, 50],
      expected: {
        di: [27.4, 33.5, 15.5],
        discomfort_condition: [
          "Most of the population feels discomfort",
          "State of medical emergency",
          "No discomfort",
        ],
      },
    },
  ])("returns", ({ tdb, rh, expected }) => {
    const result = discomfortIndex_array(tdb, rh);
    expect(result).toStrictEqual(expected, 1);
  });
});
