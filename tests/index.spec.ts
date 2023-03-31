import "mocha";
import { assert, expect } from "chai";

import { heatIndex, phs, p_sat } from "../src/index";
import npmPackage from "../src/index";

describe("NPM Package", () => {
  it("should be an object", () => {
    assert.isObject(npmPackage);
  });

  it("should have a helloWorld property", () => {
    assert.property(npmPackage, "heatIndex");
  });
});

describe("p_sat", () => {
  it("should be a function", () => {
    assert.isFunction(p_sat);
  });

  it("should calculate the p_sat", () => {
    expect(p_sat(25)).to.equal(3169.2);
  });
});

describe("phs", () => {
  it("should be a function", () => {
    assert.isFunction(phs);
  });

  it("should calculate the heat index in SI units with default options", () => {
    assert.deepStrictEqual(phs(40, 40, 33.85, 0.3, 150, 0.5, 2), {
      t_re: 37.5,
      t_sk: 35.3,
      t_cr: 37.5,
      t_cr_eq: 37.1,
      t_sk_t_cr_wg: 0.24,
      sweat_rate: 266.1,
      sw_tot_g: 6166.4,
      d_lim_loss_50: 440,
      d_lim_loss_95: 298,
      d_lim_t_re: 480,
      wp: 0.84,
    });
  });

  it("should return the right rectal temperature with the phs model", () => {
    expect(phs(35, 35, 71, 0.3, 150, 0.5, 2)["t_re"]).to.equal(39.8);
    expect(phs(30, 50, 70.65, 0.3, 150, 0.5, 2)["t_re"]).to.equal(37.7);
    expect(phs(43, 43, 34.7, 0.3, 103, 0.5, 1)["t_re"]).to.equal(37.3);
    expect(phs(40, 40, 40.63, 0.3, 150, 0.4, 2)["t_re"]).to.equal(37.5);
  });

  it("should return a number", function () {
    const result = phs(25, 20, 50, 0.1, 100, 1, 1);
    assert(typeof result["t_re"] === "number");
  });

  it("should return a different result for different input values", function () {
    const result1 = phs(25, 20, 50, 0.1, 100, 1, 1);
    const result2 = phs(20, 25, 50, 0.1, 100, 1, 1);
    assert.notDeepEqual(result1, result2);
  });

  it("should return the same result for the same input values", function () {
    const result1 = phs(25, 20, 50, 0.1, 100, 1, 1);
    const result2 = phs(25, 20, 50, 0.1, 100, 1, 1);
    assert.deepStrictEqual(result1, result2);
  });
});

describe("heatIndex", () => {
  it("should be a function", () => {
    assert.isFunction(heatIndex);
  });

  it("should calculate the heat index in SI units with default options", () => {
    expect(heatIndex(25, 50)).to.equal(25.9);
  });

  it("should calculate the heat index in IP units with specified options", () => {
    expect(heatIndex(77, 50, { units: "IP" })).to.equal(78.6);
  });

  it("should round the heat index if round option is true", () => {
    expect(heatIndex(30, 80)).to.equal(37.7);
  });

  it("should not round the heat index if round option is false", () => {
    expect(heatIndex(86, 80, { units: "IP" })).to.equal(99.8);
  });

  it("should not round the heat index if round option is false", () => {
    expect(heatIndex(30, 60, { round: false })).to.equal(32.83204090000003);
  });
});
