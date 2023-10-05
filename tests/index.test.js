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

  it("should have models.wc", () => {
    expect(jsthermalcomfort.models).toHaveProperty("wc");
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

  it("should have models.discomfort_index", () => {
    expect(jsthermalcomfort.models).toHaveProperty("discomfort_index");
  });

  it("should have models.discomfort_index_array", () => {
    expect(jsthermalcomfort.models).toHaveProperty("discomfort_index_array");
  });

  it("should have models.two_nodes", () => {
    expect(jsthermalcomfort.models).toHaveProperty("two_nodes");
  });

  it("should have models.two_nodes_array", () => {
    expect(jsthermalcomfort.models).toHaveProperty("two_nodes_array");
  });

  it("should have models.set_tmp", () => {
    expect(jsthermalcomfort.models).toHaveProperty("set_tmp");
  });

  it("should have models.set_tmp_array", () => {
    expect(jsthermalcomfort.models).toHaveProperty("set_tmp_array");
  });

  it("should have models.adaptive_en", () => {
    expect(jsthermalcomfort.models).toHaveProperty("adaptive_en");
  });

  it("should have models.adaptive_en_array", () => {
    expect(jsthermalcomfort.models).toHaveProperty("adaptive_en_array");
  });

  it("should have models.at", () => {
    expect(jsthermalcomfort.models).toHaveProperty("at");
  });

  it("should have models.pmv_ppd", () => {
    expect(jsthermalcomfort.models).toHaveProperty("pmv_ppd");
  });

  it("should have models.pmv_ppd_array", () => {
    expect(jsthermalcomfort.models).toHaveProperty("pmv_ppd_array");
  });

  it("should have models.adaptive_ashrae", () => {
    expect(jsthermalcomfort.models).toHaveProperty("adaptive_ashrae");
  });

  it("should have models.adaptive_ashrae_array", () => {
    expect(jsthermalcomfort.models).toHaveProperty("adaptive_ashrae_array");
  });

  it("should have models.cooling_effect", () => {
    expect(jsthermalcomfort.models).toHaveProperty("cooling_effect");
  });

  it("should have models.solar_gain", () => {
    expect(jsthermalcomfort.models).toHaveProperty("solar_gain");
  });

  it("should have models.athb", () => {
    expect(jsthermalcomfort.models).toHaveProperty("athb");
  });

  it("should have models.athb_array", () => {
    expect(jsthermalcomfort.models).toHaveProperty("athb_array");
  });

  it("should have models.pmv", () => {
    expect(jsthermalcomfort.models).toHaveProperty("pmv");
  });

  it("should have models.pmv_array", () => {
    expect(jsthermalcomfort.models).toHaveProperty("pmv_array");
  });

  it("should have models.a_pmv", () => {
    expect(jsthermalcomfort.models).toHaveProperty("a_pmv");
  });

  it("should have models.a_pmv_array", () => {
    expect(jsthermalcomfort.models).toHaveProperty("a_pmv_array");
  });

  it("should have models.ankle_draft", () => {
    expect(jsthermalcomfort.models).toHaveProperty("ankle_draft");
  });

  it("should have models.e_pmv", () => {
    expect(jsthermalcomfort.models).toHaveProperty("e_pmv");
  });

  it("should have models.e_pmv_array", () => {
    expect(jsthermalcomfort.models).toHaveProperty("e_pmv_array");
  });

  it("should have models.vertical_tmp_grad_ppd", () => {
    expect(jsthermalcomfort.models).toHaveProperty("vertical_tmp_grad_ppd");
  });

  it("should have models.use_fans_heatwaves", () => {
    expect(jsthermalcomfort.models).toHaveProperty("use_fans_heatwaves");
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

  it("should have utilities.units_converter_array", () => {
    expect(jsthermalcomfort.utilities).toHaveProperty("units_converter_array");
  });

  it("should have utilities.running_mean_outdoor_temperature", () => {
    expect(jsthermalcomfort.utilities).toHaveProperty(
      "running_mean_outdoor_temperature",
    );
  });

  it("should have utilities.f_svv", () => {
    expect(jsthermalcomfort.utilities).toHaveProperty("f_svv");
  });

  it("should have utilities.met_typical_tasks", () => {
    expect(jsthermalcomfort.utilities).toHaveProperty("met_typical_tasks");
  });

  it("should have utilities.clo_typical_ensembles", () => {
    expect(jsthermalcomfort.utilities).toHaveProperty("clo_typical_ensembles");
  });

  it("should have utilities.clo_individual_garments", () => {
    expect(jsthermalcomfort.utilities).toHaveProperty(
      "clo_individual_garments",
    );
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
