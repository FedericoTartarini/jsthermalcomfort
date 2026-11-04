import { describe, expect, it, test } from "vitest";
import {
  clo_typical_ensembles,
  met_typical_tasks,
  clo_individual_garments,
} from "../../src/utilities/index.ts";
import { round } from "../../src/_internal/round.ts";

// JS-only: upstream rounds with numpy, so `round` must round half to even
// on the scaled value exactly as `np.round` does.
describe("round", () => {
  test.each([
    [26.25, 1, 26.2],
    [26.35, 1, 26.4],
    [-2.5, 0, -2],
    [-1.5, 0, -2],
    [0.5, 0, 0],
    [1.5, 0, 2],
    [2.5, 0, 2],
    [26.26, 1, 26.3],
    [-26.26, 1, -26.3],
  ])("round(%p, %p) is %p", (number, precision, expected) => {
    expect(round(number, precision)).toBe(expected);
  });

  test("keeps the sign of a negative value that rounds to zero, like numpy", () => {
    expect(round(-0.4, 0)).toBe(-0);
    expect(round(-0.5, 0)).toBe(-0);
  });

  test("passes NaN through", () => {
    expect(round(NaN, 1)).toBeNaN();
  });
});

describe("clo_typical_ensembles", () => {
  it("is keyed the same way pythermalcomfort keys clo_typical_ensembles", () => {
    expect(clo_typical_ensembles["Walking shorts, short-sleeve shirt"]).toBe(
      0.36,
    );
    expect(clo_typical_ensembles["Trousers, long-sleeve shirt"]).toBe(0.61);
    expect(clo_typical_ensembles["Sweat pants, long-sleeve sweatshirt"]).toBe(
      0.74,
    );
    expect(clo_typical_ensembles["Typical winter indoor clothing"]).toBe(1.0);
  });

  it("includes the 0.57 ensemble missing from the old type union", () => {
    expect(
      clo_typical_ensembles[
        "Trousers, short-sleeve shirt, socks, shoes, underwear"
      ],
    ).toBe(0.57);
  });

  it("is frozen", () => {
    expect(Object.isFrozen(clo_typical_ensembles)).toBe(true);
  });
});

describe("met_typical_tasks", () => {
  it("is keyed the same way pythermalcomfort keys met_typical_tasks", () => {
    expect(met_typical_tasks["Seated, quiet"]).toBe(1.0);
    expect(met_typical_tasks["Walking 2mph (3.2kmh)"]).toBe(2.0);
    expect(met_typical_tasks["Wrestling"]).toBe(7.8);
  });

  it("is frozen", () => {
    expect(Object.isFrozen(met_typical_tasks)).toBe(true);
  });
});

describe("clo_individual_garments", () => {
  it("is keyed the same way pythermalcomfort keys clo_individual_garments", () => {
    expect(clo_individual_garments["Metal chair"]).toBe(0.0);
    expect(clo_individual_garments["Women's underwear"]).toBe(0.03);
    expect(clo_individual_garments["Double-breasted coat (thick)"]).toBe(0.48);
  });

  it("is frozen", () => {
    expect(Object.isFrozen(clo_individual_garments)).toBe(true);
  });
});
