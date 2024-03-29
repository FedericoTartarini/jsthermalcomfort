import { expect, describe, it } from "@jest/globals";
import {
  discomfort_index,
  discomfort_index_array,
} from "../../src/models/discomfort_index";
import { deep_close_to_array, deep_close_to_obj } from "../test_utilities";

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
    expect(result.di).toBeCloseTo(expected.di);
    expect(result.discomfort_condition).toBe(expected.discomfort_condition);
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
    const result = discomfort_index_array(tdb, rh);
    deep_close_to_array(result.di, expected.di, 2);
    expect(result.discomfort_condition).toStrictEqual(
      expected.discomfort_condition,
    );
  });
});
