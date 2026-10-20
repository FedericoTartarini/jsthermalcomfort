import { deepFreeze } from "../models/modelDocs.ts";

/** One entry of `ALL_OUT_PARAMS`: what an output parameter means and its unit. */
export type JOS3OutParam = {
  meaning: string;
  suffix: string | null;
  unit: string;
};

/**
 * The meaning, the suffix and the unit of each output parameter of the JOS-3
 * model, upstream's `ALL_OUT_PARAMS`
 * (`pythermalcomfort/jos3_functions/parameters.py:80-380` at v4.6.2),
 * copied value for value from pythermalcomfort 4.6.2. Upstream's `to_csv`
 * reads it for the units and meanings rows; the library has no `to_csv`,
 * which writes files. Frozen.
 *
 * `name` and `pythermalcomfort_version` are upstream's entries for columns
 * that neither upstream's JOS3 nor this one returns.
 */
export const ALL_OUT_PARAMS: Readonly<Record<string, Readonly<JOS3OutParam>>> =
  deepFreeze({
    age: {
      meaning: "age",
      suffix: null,
      unit: "years",
    },
    bf_ava_foot: {
      meaning: "AVA blood flow rate of one foot",
      suffix: null,
      unit: "L/h",
    },
    bf_ava_hand: {
      meaning: "AVA blood flow rate of one hand",
      suffix: null,
      unit: "L/h",
    },
    bf_core: {
      meaning: "core blood flow rate (each body part)",
      suffix: "Body name",
      unit: "L/h",
    },
    bf_fat: {
      meaning: "fat blood flow rate (each body part)",
      suffix: "Body name",
      unit: "L/h",
    },
    bf_muscle: {
      meaning: "muscle blood flow rate (each body part)",
      suffix: "Body name",
      unit: "L/h",
    },
    bf_skin: {
      meaning: "skin blood flow rate (each body part)",
      suffix: "Body name",
      unit: "L/h",
    },
    bsa: {
      meaning: "body surface area (each body part)",
      suffix: "Body name",
      unit: "m2",
    },
    cardiac_output: {
      meaning: "cardiac output (the sum of the whole blood flow)",
      suffix: null,
      unit: "L/h",
    },
    e_max: {
      meaning: "maximum evaporative heat loss from the skin (each body part)",
      suffix: "Body name",
      unit: "W",
    },
    e_skin: {
      meaning: "evaporative heat loss from the skin (each body part)",
      suffix: "Body name",
      unit: "W",
    },
    e_sweat: {
      meaning:
        "evaporative heat loss from the skin by only sweating (each body part)",
      suffix: "Body name",
      unit: "W",
    },
    fat: {
      meaning: "body fat rate",
      suffix: null,
      unit: "%",
    },
    height: {
      meaning: "body height",
      suffix: null,
      unit: "m",
    },
    clo: {
      meaning: "clothing insulation (each body part)",
      suffix: "Body name",
      unit: "clo",
    },
    q_skin2env_latent: {
      meaning: "latent heat loss from the skin (each body part)",
      suffix: "Body name",
      unit: "W",
    },
    q_bmr_core: {
      meaning: "core thermogenesis by basal metabolism (each body part)",
      suffix: "Body name",
      unit: "W",
    },
    q_bmr_fat: {
      meaning: "fat thermogenesis by basal metabolism (each body part)",
      suffix: "Body name",
      unit: "W",
    },
    q_bmr_muscle: {
      meaning: "muscle thermogenesis by basal metabolism (each body part)",
      suffix: "Body name",
      unit: "W",
    },
    q_bmr_skin: {
      meaning: "skin thermogenesis by basal metabolism (each body part)",
      suffix: "Body name",
      unit: "W",
    },
    q_thermogenesis_total: {
      meaning: "total thermogenesis of the whole body",
      suffix: null,
      unit: "W",
    },
    q_nst: {
      meaning: "core thermogenesis by non-shivering (each body part)",
      suffix: "Body name",
      unit: "W",
    },
    simulation_time: {
      meaning: "simulation times",
      suffix: null,
      unit: "sec",
    },
    q_shiv: {
      meaning: "core or muscle thermogenesis by shivering (each body part)",
      suffix: "Body name",
      unit: "W",
    },
    q_work: {
      meaning: "core or muscle thermogenesis by work (each body part)",
      suffix: "Body name",
      unit: "W",
    },
    name: {
      meaning: "name of the model",
      suffix: null,
      unit: "-",
    },
    par: {
      meaning: "physical activity ratio",
      suffix: null,
      unit: "-",
    },
    q_thermogenesis_core: {
      meaning: "core total thermogenesis (each body part)",
      suffix: "Body name",
      unit: "W",
    },
    q_thermogenesis_fat: {
      meaning: "fat total thermogenesis (each body part)",
      suffix: "Body name",
      unit: "W",
    },
    q_thermogenesis_muscle: {
      meaning: "muscle total thermogenesis (each body part)",
      suffix: "Body name",
      unit: "W",
    },
    q_thermogenesis_skin: {
      meaning: "skin total thermogenesis (each body part)",
      suffix: "Body name",
      unit: "W",
    },
    q_res: {
      meaning: "heat loss by respiration",
      suffix: null,
      unit: "W",
    },
    q_res_latent: {
      meaning: "latent heat loss by respiration (each body part)",
      suffix: "Body name",
      unit: "W",
    },
    q_res_sensible: {
      meaning: "sensible heat loss by respiration (each body part)",
      suffix: "Body name",
      unit: "W",
    },
    rh: {
      meaning: "relative humidity (each body part)",
      suffix: "Body name",
      unit: "%",
    },
    r_et: {
      meaning: "total clothing evaporative heat resistance (each body part)",
      suffix: "Body name",
      unit: "(m2*kPa)/W",
    },
    r_t: {
      meaning: "total clothing heat resistance (each body part)",
      suffix: "Body name",
      unit: "(m2*K)/W",
    },
    q_skin2env_sensible: {
      meaning: "sensible heat loss from the skin (each body part)",
      suffix: "Body name",
      unit: "W",
    },
    t_skin_set: {
      meaning: "skin set point temperature (each body part)",
      suffix: "Body name",
      unit: "°C",
    },
    t_core_set: {
      meaning: "core set point temperature (each body part)",
      suffix: "Body name",
      unit: "°C",
    },
    sex: {
      meaning: "sex",
      suffix: null,
      unit: "-",
    },
    q_skin2env: {
      meaning: "total heat loss from the skin (each body part)",
      suffix: "Body name",
      unit: "W",
    },
    tdb: {
      meaning: "dry bulb air temperature (each body part)",
      suffix: "Body name",
      unit: "°C",
    },
    t_artery: {
      meaning: "arterial temperature (each body part)",
      suffix: "Body name",
      unit: "°C",
    },
    t_cb: {
      meaning: "central blood temperature",
      suffix: null,
      unit: "°C",
    },
    t_core: {
      meaning: "core temperature (each body part)",
      suffix: "Body name",
      unit: "°C",
    },
    t_fat: {
      meaning: "fat temperature (each body part)",
      suffix: "Body name",
      unit: "°C",
    },
    t_muscle: {
      meaning: "muscle temperature (each body part)",
      suffix: "Body name",
      unit: "°C",
    },
    to: {
      meaning: "operative temperature (each body part)",
      suffix: "Body name",
      unit: "°C",
    },
    tr: {
      meaning: "mean radiant temperature (each body part)",
      suffix: "Body name",
      unit: "°C",
    },
    t_skin: {
      meaning: "skin temperature (each body part)",
      suffix: "Body name",
      unit: "°C",
    },
    t_skin_mean: {
      meaning: "mean skin temperature",
      suffix: null,
      unit: "°C",
    },
    t_superficial_vein: {
      meaning: "superficial vein temperature (each body part)",
      suffix: "Body name",
      unit: "°C",
    },
    t_vein: {
      meaning: "vein temperature (each body part)",
      suffix: "Body name",
      unit: "°C",
    },
    v: {
      meaning: "air velocity (each body part)",
      suffix: "Body name",
      unit: "m/s",
    },
    weight: {
      meaning: "body weight",
      suffix: null,
      unit: "kg",
    },
    w: {
      meaning: "skin wettedness (each body part)",
      suffix: "Body name",
      unit: "-",
    },
    w_mean: {
      meaning: "mean skin wettedness",
      suffix: null,
      unit: "-",
    },
    weight_loss_by_evap_and_res: {
      meaning:
        "weight loss by the evaporation and respiration of the whole body",
      suffix: null,
      unit: "g/sec",
    },
    dt: {
      meaning: "time step",
      suffix: null,
      unit: "sec",
    },
    pythermalcomfort_version: {
      meaning: "version of pythermalcomfort",
      suffix: null,
      unit: "-",
    },
  });
