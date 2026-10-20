import { expect, describe, it } from "@jest/globals";
import jsthermalcomfort, * as namedExports from "../src";
import models, * as modelsNamed from "../src/models/index.js";

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

  it("should have models.heat_index_rothfusz", () => {
    expect(jsthermalcomfort.models).toHaveProperty("heat_index_rothfusz");
  });

  // Upstream's name (ADR 0010); the old name wc keeps no alias.
  it("should have models.wci and not models.wc", () => {
    expect(jsthermalcomfort.models).toHaveProperty("wci");
    expect(namedExports).toHaveProperty("wci");
    expect(jsthermalcomfort.models).not.toHaveProperty("wc");
    expect(namedExports).not.toHaveProperty("wc");
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

  // Renamed as upstream renamed it, with no alias (ADR 0010).
  it("should have models.two_nodes_gagge and not models.two_nodes", () => {
    expect(jsthermalcomfort.models).toHaveProperty("two_nodes_gagge");
    expect(namedExports).toHaveProperty("two_nodes_gagge");
    expect(jsthermalcomfort.models).not.toHaveProperty("two_nodes");
    expect(namedExports).not.toHaveProperty("two_nodes");
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
  // holding the kernel and the logic the wrappers, athb and pmv share.
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

  // Upstream keeps it private, in pythermalcomfort/_internal/.
  it("should not have the adaptive cooling-effect helper", () => {
    expect(jsthermalcomfort.models).not.toHaveProperty(
      "adaptive_cooling_effect",
    );
    expect(namedExports).not.toHaveProperty("adaptive_cooling_effect");
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

  it("should have models.pmv", () => {
    expect(jsthermalcomfort.models).toHaveProperty("pmv");
  });

  // Renamed as upstream renamed it, with no alias (ADR 0010).
  it("should have models.pmv_a and not models.a_pmv", () => {
    expect(jsthermalcomfort.models).toHaveProperty("pmv_a");
    expect(namedExports).toHaveProperty("pmv_a");
    expect(jsthermalcomfort.models).not.toHaveProperty("a_pmv");
    expect(namedExports).not.toHaveProperty("a_pmv");
  });

  it("should have models.ankle_draft", () => {
    expect(jsthermalcomfort.models).toHaveProperty("ankle_draft");
  });

  it("should have models.pet_steady", () => {
    expect(jsthermalcomfort.models).toHaveProperty("pet_steady");
  });

  // Renamed as upstream renamed it, with no alias (ADR 0010).
  it("should have models.pmv_e and not models.e_pmv", () => {
    expect(jsthermalcomfort.models).toHaveProperty("pmv_e");
    expect(namedExports).toHaveProperty("pmv_e");
    expect(jsthermalcomfort.models).not.toHaveProperty("e_pmv");
    expect(namedExports).not.toHaveProperty("e_pmv");
  });

  it("should have models.vertical_tmp_grad_ppd", () => {
    expect(jsthermalcomfort.models).toHaveProperty("vertical_tmp_grad_ppd");
  });

  it("should have models.use_fans_heatwaves", () => {
    expect(jsthermalcomfort.models).toHaveProperty("use_fans_heatwaves");
  });

  // pythermalcomfort.models exports JOS3; it was only in the default export.
  it("should have models.JOS3, also as a named export", () => {
    expect(jsthermalcomfort.models).toHaveProperty("JOS3");
    expect(namedExports.JOS3).toBe(jsthermalcomfort.models.JOS3);
  });

  // #191: the named export block of src/models/index.js and its default
  // object list the same models, so that none is in one and not the other,
  // as JOS3 was in the default object only (07c7caf).
  it("should export the same models by name as in the models' default object", () => {
    const { default: _default, ...named } = modelsNamed;
    expect(Object.keys(named).sort()).toEqual(Object.keys(models).sort());
    for (const [name, value] of Object.entries(named)) {
      expect(value).toBe(models[name]);
    }
  });

  // jos3 D5: upstream's pythermalcomfort.jos3_functions, its four modules
  // as namespaces.
  it("should have jos3_functions with construction, matrix, parameters and thermoregulation", () => {
    expect(namedExports.jos3_functions).toBe(jsthermalcomfort.jos3_functions);
    for (const module of [
      "construction",
      "matrix",
      "parameters",
      "thermoregulation",
    ]) {
      expect(jsthermalcomfort.jos3_functions).toHaveProperty(module);
    }
    expect(jsthermalcomfort.jos3_functions.parameters).toHaveProperty(
      "local_clo_typical_ensembles",
    );
    expect(jsthermalcomfort.jos3_functions.parameters).toHaveProperty(
      "ALL_OUT_PARAMS",
    );
    expect(jsthermalcomfort.jos3_functions.thermoregulation).toHaveProperty(
      "tetens",
    );
  });

  it("should have utilities.body_surface_area", () => {
    expect(jsthermalcomfort.utilities).toHaveProperty("body_surface_area");
  });

  it("should have utilities.v_relative", () => {
    expect(jsthermalcomfort.utilities).toHaveProperty("v_relative");
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

  it("should have utilities.CLO_INDIVIDUAL_GARMENT_GROUPS", () => {
    expect(jsthermalcomfort.utilities).toHaveProperty(
      "CLO_INDIVIDUAL_GARMENT_GROUPS",
    );
    expect(namedExports.CLO_INDIVIDUAL_GARMENT_GROUPS).toBe(
      jsthermalcomfort.utilities.CLO_INDIVIDUAL_GARMENT_GROUPS,
    );
  });

  it("should have utilities.check_standard_compliance", () => {
    expect(jsthermalcomfort.utilities).toHaveProperty(
      "check_standard_compliance",
    );
  });

  // pythermalcomfort.utilities.met_to_w_m2, under upstream's name.
  it("should have utilities.met_to_w_m2", () => {
    expect(jsthermalcomfort.utilities.met_to_w_m2).toBe(58.15);
    expect(namedExports.met_to_w_m2).toBe(58.15);
  });

  it("should have psychrometrics.p_sat", () => {
    expect(jsthermalcomfort.psychrometrics).toHaveProperty("p_sat");
  });

  it("should have psychrometrics.p_sat_torr", () => {
    expect(jsthermalcomfort.psychrometrics).toHaveProperty("p_sat_torr");
  });

  it("should have psychrometrics.t_o", () => {
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
