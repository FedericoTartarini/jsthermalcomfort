import { expect, describe, it } from "@jest/globals";
import jsthermalcomfort from "../src";

describe("NPM Package", () => {
  it("should be an object", () => {
    expect(jsthermalcomfort).toBeInstanceOf(Object);
  });

  it("should have the utilities functions", () => {
    expect(jsthermalcomfort.utilities).toBeInstanceOf(Object);
  });

  it("should have the psychrometrics functions", () => {
    expect(jsthermalcomfort.psychrometrics).toBeInstanceOf(Object);
  });

  it("should have the models functions", () => {
    expect(jsthermalcomfort.models).toBeInstanceOf(Object);
  });

  it("should have models.heat_index", () => {
    expect(jsthermalcomfort.models).toHaveProperty("heat_index");
  });

  it("should have models.phs", () => {
    expect(jsthermalcomfort.models).toHaveProperty("phs");
  });

  it("should have utilities.body_surface_area", () => {
    expect(jsthermalcomfort.utilities).toHaveProperty("body_surface_area");
  });

  it("should have psychrometrics.p_sat", () => {
    expect(jsthermalcomfort.psychrometrics).toHaveProperty("p_sat");
  });
});
