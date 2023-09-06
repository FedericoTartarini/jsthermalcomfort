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

  it("should have models.humidex", () => {
    expect(jsthermalcomfort.models).toHaveProperty("humidex");
  });

  it("should have models.net", () => {
    expect(jsthermalcomfort.models).toHaveProperty("net");
  });

  it("should have models.wbgt", () => {
    expect(jsthermalcomfort.models).toHaveProperty("wbgt");
  });

  it("should have models.two_nodes", () => {
    expect(jsthermalcomfort.models).toHaveProperty("two_nodes");
  });

  it("should have models.set_tmp", () => {
    expect(jsthermalcomfort.models).toHaveProperty("set_tmp");
  });

  it("should have utilities.body_surface_area", () => {
    expect(jsthermalcomfort.utilities).toHaveProperty("body_surface_area");
  });

  it("should have utilities.v_relative", () => {
    expect(jsthermalcomfort.utilities).toHaveProperty("v_relative");
  });

  it("should have utilities.v_relative_array", () => {
    expect(jsthermalcomfort.utilities).toHaveProperty("v_relative_array");
  });

  it("should have utilities.clo_dynamic", () => {
    expect(jsthermalcomfort.utilities).toHaveProperty("clo_dynamic");
  });

  it("should have utilities.clo_dynamic_array", () => {
    expect(jsthermalcomfort.utilities).toHaveProperty("clo_dynamic_array");
  });

  it("should have utilities.units_converter", () => {
    expect(jsthermalcomfort.utilities).toHaveProperty("units_converter");
  });

  it("should have utilities.running_mean_outdoor_temperature", () => {
    expect(jsthermalcomfort.utilities).toHaveProperty(
      "running_mean_outdoor_temperature",
    );
  });

  it("should have utilities.f_svv", () => {
    expect(jsthermalcomfort.utilities).toHaveProperty("f_svv");
  });

  it("should have psychrometrics.p_sat", () => {
    expect(jsthermalcomfort.psychrometrics).toHaveProperty("p_sat");
  });

  it("should have psychrometrics.p_sat_torr", () => {
    expect(jsthermalcomfort.psychrometrics).toHaveProperty("p_sat_torr");
  });

  it("should have psychrometrics.p_sat_torr_array", () => {
    expect(jsthermalcomfort.psychrometrics).toHaveProperty("p_sat_torr_array");
  });

  it("should have psychrometrics.t_o", () => {
    expect(jsthermalcomfort.psychrometrics).toHaveProperty("t_o");
  });

  it("should have psychrometrics.t_o_array", () => {
    expect(jsthermalcomfort.psychrometrics).toHaveProperty("t_o");
  });

  it("should have psychrometrics.enthalpy", () => {
    expect(jsthermalcomfort.psychrometrics).toHaveProperty("enthalpy");
  });

  it("should have psychrometrics.t_wb", () => {
    expect(jsthermalcomfort.psychrometrics).toHaveProperty("t_wb");
  });

  it("should have psychrometrics.t_dp", () => {
    expect(jsthermalcomfort.psychrometrics).toHaveProperty("t_dp");
  });
});
