import { describe, expect, test } from "vitest";
import {
  c_to_k,
  cp_air,
  cp_vapour,
  cp_water,
  g,
  h_fg,
  met_to_w_m2,
  r_air,
} from "../../src/utilities/index.ts";

// JS-only: upstream has no test of its constants. The expected values are
// copied from pythermalcomfort v4.8.1 `utilities.py:13-20`.
describe("utilities constants", () => {
  test.each([
    ["c_to_k", c_to_k, 273.15],
    ["cp_vapour", cp_vapour, 1805.0],
    ["cp_water", cp_water, 4186],
    ["cp_air", cp_air, 1004],
    ["h_fg", h_fg, 2501000],
    ["r_air", r_air, 287.055],
    ["g", g, 9.81],
    ["met_to_w_m2", met_to_w_m2, 58.15],
  ])("%s holds upstream's value", (_name, value, expected) => {
    expect(value).toBe(expected);
  });
});
