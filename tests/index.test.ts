import { expect, describe, it } from "vitest";
import jsthermalcomfort, * as namedExports from "../src/index.ts";

describe("NPM Package", () => {
  it("should be an object", () => {
    expect(jsthermalcomfort).toBeInstanceOf(Object);
  });

  it("should have the utilities functions", () => {
    expect(jsthermalcomfort.utilities).toBeInstanceOf(Object);
  });

  it("should have the environment functions", () => {
    expect(jsthermalcomfort.environment).toBeInstanceOf(Object);
  });

  it("should have the psychrometrics functions", () => {
    expect(jsthermalcomfort.psychrometrics).toBeInstanceOf(Object);
  });

  it("should have the models functions", () => {
    expect(jsthermalcomfort.models).toBeInstanceOf(Object);
  });

  it("should have models.heat_index_rothfusz", () => {
    expect(jsthermalcomfort.models).toHaveProperty("heat_index_rothfusz");
  });

  it("should have models.wci", () => {
    expect(jsthermalcomfort.models).toHaveProperty("wci");
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

  it("should have models.clo_tout", () => {
    expect(jsthermalcomfort.models).toHaveProperty("clo_tout");
  });

  it("should have models.wbgt", () => {
    expect(jsthermalcomfort.models).toHaveProperty("wbgt");
  });

  it("should have models.discomfort_index", () => {
    expect(jsthermalcomfort.models).toHaveProperty("discomfort_index");
  });

  it("should have models.two_nodes_gagge", () => {
    expect(jsthermalcomfort.models).toHaveProperty("two_nodes_gagge");
  });

  it("should have models.set_tmp", () => {
    expect(jsthermalcomfort.models).toHaveProperty("set_tmp");
  });

  it("should have models.adaptive_en", () => {
    expect(jsthermalcomfort.models).toHaveProperty("adaptive_en");
  });

  it("should have models.at", () => {
    expect(jsthermalcomfort.models).toHaveProperty("at");
  });

  // Upstream has no public pmv_ppd, only its two wrappers; the module stays,
  // holding the kernel and the logic the wrappers, pmv_athb and pmv share.
  it("should not have models.pmv_ppd", () => {
    expect(jsthermalcomfort.models).not.toHaveProperty("pmv_ppd");
    expect(namedExports).not.toHaveProperty("pmv_ppd");
  });

  it("should have models.pmv_ppd_iso and models.pmv_ppd_ashrae", () => {
    expect(jsthermalcomfort.models).toHaveProperty("pmv_ppd_iso");
    expect(jsthermalcomfort.models).toHaveProperty("pmv_ppd_ashrae");
  });

  it("should have models.adaptive_ashrae", () => {
    expect(jsthermalcomfort.models).toHaveProperty("adaptive_ashrae");
  });

  it("should have models.cooling_effect", () => {
    expect(jsthermalcomfort.models).toHaveProperty("cooling_effect");
  });

  it("should have models.solar_gain", () => {
    expect(jsthermalcomfort.models).toHaveProperty("solar_gain");
  });

  it("should have models.pmv_athb", () => {
    expect(jsthermalcomfort.models).toHaveProperty("pmv_athb");
  });

  it("should have models.pmv_a", () => {
    expect(jsthermalcomfort.models).toHaveProperty("pmv_a");
  });

  it("should have models.ankle_draft", () => {
    expect(jsthermalcomfort.models).toHaveProperty("ankle_draft");
  });

  it("should have models.pet_steady", () => {
    expect(jsthermalcomfort.models).toHaveProperty("pet_steady");
  });

  it("should have models.pmv_e", () => {
    expect(jsthermalcomfort.models).toHaveProperty("pmv_e");
  });

  it("should have models.vertical_tmp_grad_ppd", () => {
    expect(jsthermalcomfort.models).toHaveProperty("vertical_tmp_grad_ppd");
  });

  it("should have models.use_fans_heatwaves", () => {
    expect(jsthermalcomfort.models).toHaveProperty("use_fans_heatwaves");
  });

  it("should have models.JOS3", () => {
    expect(jsthermalcomfort.models).toHaveProperty("JOS3");
  });

  it("should have utilities.body_surface_area", () => {
    expect(jsthermalcomfort.utilities).toHaveProperty("body_surface_area");
  });

  it("should have utilities.clo_dynamic_ashrae", () => {
    expect(jsthermalcomfort.utilities).toHaveProperty("clo_dynamic_ashrae");
  });

  it("should have utilities.clo_dynamic_iso", () => {
    expect(jsthermalcomfort.utilities).toHaveProperty("clo_dynamic_iso");
  });

  it("should have utilities.units_converter", () => {
    expect(jsthermalcomfort.utilities).toHaveProperty("units_converter");
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

  it("should have utilities.CLO_INDIVIDUAL_GARMENT_GROUPS", () => {
    expect(jsthermalcomfort.utilities).toHaveProperty(
      "CLO_INDIVIDUAL_GARMENT_GROUPS",
    );
    expect(namedExports.CLO_INDIVIDUAL_GARMENT_GROUPS).toBe(
      jsthermalcomfort.utilities.CLO_INDIVIDUAL_GARMENT_GROUPS,
    );
  });

  it("should have psychrometrics.p_sat", () => {
    expect(jsthermalcomfort.psychrometrics).toHaveProperty("p_sat");
  });

  it("should have psychrometrics.p_sat_torr", () => {
    expect(jsthermalcomfort.psychrometrics).toHaveProperty("p_sat_torr");
  });

  it("should have environment.operative_tmp", () => {
    expect(jsthermalcomfort.environment).toHaveProperty("operative_tmp");
  });

  it.each([
    "f_svv",
    "mean_radiant_tmp",
    "running_mean_outdoor_temperature",
    "v_relative",
  ] as const)("should have environment.%s, and at the root", (name) => {
    expect(jsthermalcomfort.environment).toHaveProperty(name);
    expect(namedExports[name]).toBe(jsthermalcomfort.environment[name]);
  });

  it.each(["f_svv", "running_mean_outdoor_temperature", "v_relative"])(
    "should not have utilities.%s",
    (name) => {
      expect(jsthermalcomfort.utilities).not.toHaveProperty(name);
    },
  );

  it("should not have psychrometrics.t_mrt", () => {
    expect(jsthermalcomfort.psychrometrics).not.toHaveProperty("t_mrt");
    expect(namedExports).not.toHaveProperty("t_mrt");
  });

  it("should have psychrometrics.enthalpy_air", () => {
    expect(jsthermalcomfort.psychrometrics).toHaveProperty("enthalpy_air");
  });

  it("should have psychrometrics.wet_bulb_tmp", () => {
    expect(jsthermalcomfort.psychrometrics).toHaveProperty("wet_bulb_tmp");
  });

  it("should have psychrometrics.dew_point_tmp", () => {
    expect(jsthermalcomfort.psychrometrics).toHaveProperty("dew_point_tmp");
  });

  it("should have psychrometrics.hr_to_rh", () => {
    expect(jsthermalcomfort.psychrometrics).toHaveProperty("hr_to_rh");
  });

  it("should have psychrometrics.rh_from_dew_point", () => {
    expect(jsthermalcomfort.psychrometrics).toHaveProperty("rh_from_dew_point");
  });

  it("should have psychrometrics.rh_from_wet_bulb", () => {
    expect(jsthermalcomfort.psychrometrics).toHaveProperty("rh_from_wet_bulb");
  });

  it("should have psychrometrics.rh_from_vapour_pressure", () => {
    expect(jsthermalcomfort.psychrometrics).toHaveProperty(
      "rh_from_vapour_pressure",
    );
  });
});
