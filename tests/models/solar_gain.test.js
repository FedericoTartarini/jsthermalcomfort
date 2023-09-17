import { expect, describe, it } from "@jest/globals";
import { find_span } from "../../src/models/solar_gain";

function slow_find_span(arr, x) {
  for (let i = 0; i < arr.length - 1; ++i) {
    if (arr[i + 1] >= x && x >= arr[i]) return i;
  }
  return -1;
}

describe("find_span", () => {
  it.each([
    {
      arr: [1, 2, 3, 4, 5],
      x: 1,
    },
    {
      arr: [1, 2, 3, 4, 5],
      x: 1.1,
    },
    {
      arr: [1, 2, 3, 4, 5],
      x: 2,
    },
    {
      arr: [1, 2, 3, 4, 5],
      x: 3,
    },
    {
      arr: [1, 2, 3, 4, 5],
      x: 4,
    },
    {
      arr: [1, 2, 3, 4, 5],
      x: 5,
    },
    {
      arr: [1, 2, 3, 4, 5],
      x: 6,
    },
    {
      arr: [1, 2, 3, 4, 5],
      x: 0,
    },
    {
      arr: [1, 2, 3, 4, 5, 6],
      x: 1,
    },
    {
      arr: [1, 2, 3, 4, 5, 6],
      x: 1.1,
    },
    {
      arr: [1, 2, 3, 4, 5, 6],
      x: 2,
    },
    {
      arr: [1, 2, 3, 4, 5, 6],
      x: 3,
    },
    {
      arr: [1, 2, 3, 4, 5, 6],
      x: 4,
    },
    {
      arr: [1, 2, 3, 4, 5, 6],
      x: 5,
    },
    {
      arr: [1, 2, 3, 4, 5, 6],
      x: 6,
    },
    {
      arr: [1, 2, 3, 4, 5, 6],
      x: 7,
    },
    {
      arr: [1, 2, 3, 4, 5, 6],
      x: 0,
    },
  ])("%j", ({ arr, x }) => {
    const result = find_span(arr, x);
    const slow_result = slow_find_span(arr, x);
    expect(result).toBe(slow_result);
  });
});
