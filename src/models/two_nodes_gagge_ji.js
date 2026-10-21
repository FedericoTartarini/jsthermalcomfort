import { validateInputs } from "../utilities/utilities.js";

/**
 * @typedef {Object} GaggeTwoNodesJiReturnType
 * @property {number[]} t_core - Core temperature history over the simulation, [°C]
 * @property {number[]} t_skin - Skin temperature history over the simulation, [°C]
 */

/**
 * @typedef {Object} GaggeTwoNodesJiKwargs
 * @property {number} [body_weight=70] - Body weight, [kg]. Defaults to 70.
 * @property {number} [length_time_simulation=120] - Length of the simulation, [minutes]. Defaults to 120.
 * @property {number} [initial_skin_temp=36.8] - Initial skin temperature, [°C]. Defaults to 36.8.
 * @property {number} [initial_core_temp=36.49] - Initial core temperature, [°C]. Defaults to 36.49.
 * @property {boolean} [acclimatized=true] - If true, assumes the person is acclimatized to heat. Defaults to true.
 */

const TWO_NODES_GAGGE_JI_SCHEMA = {
  tdb: { type: "number" },
  tr: { type: "number" },
  v: { type: "number" },
  met: { type: "number" },
  clo: { type: "number" },
  vapor_pressure: { type: "number" },
  wme: { type: "number", required: false },
  body_surface_area: { type: "number", required: false },
  p_atm: { type: "number", required: false },
  position: { enum: ["sitting", "standing"] },
  body_weight: { type: "number", required: false },
  length_time_simulation: { type: "number", required: false },
  initial_skin_temp: { type: "number", required: false },
  initial_core_temp: { type: "number", required: false },
  acclimatized: { type: "boolean", required: false },
};

/**
 * @public
 * @memberof models
 * @docname Ji et al. two-node model
 *
 * Two-node model for older people under hot and cold exposures proposed by Ji et al. (2022).
 *
 * @param {number} tdb - Dry bulb air temperature, [°C]
 * @param {number} tr - Mean radiant temperature, [°C]
 * @param {number} v - Air speed, [m/s]
 * @param {number} met - Metabolic rate, [met]
 * @param {number} clo - Clothing insulation, [clo]
 * @param {number} vapor_pressure - Vapor pressure, [Pa]
 * @param {number} [wme=0] - External work, [met]. Defaults to 0.
 * @param {number} [body_surface_area=1.8258] - Body surface area, [m2]. Defaults to 1.8258.
 * @param {number} [p_atm=101325] - Atmospheric pressure, [Pa]. Defaults to 101325.
 * @param {"sitting" | "standing"} [position="sitting"] - Select either "sitting" or "standing". Defaults to "sitting".
 * @param {GaggeTwoNodesJiKwargs} [kwargs={}] - Additional simulation configuration
 *
 * @returns {GaggeTwoNodesJiReturnType} Object containing core and skin temperature arrays over time.
 */
export function two_nodes_gagge_ji(
  tdb,
  tr,
  v,
  met,
  clo,
  vapor_pressure,
  wme = 0,
  body_surface_area = 1.8258,
  p_atm = 101325,
  position = "sitting",
  kwargs = {},
) {
  const body_weight =
    kwargs.body_weight !== undefined ? kwargs.body_weight : 70;
  const length_time_simulation = Math.max(
    0,
    Math.ceil(
      kwargs.length_time_simulation !== undefined
        ? kwargs.length_time_simulation
        : 120,
    ),
  );
  const initial_skin_temp =
    kwargs.initial_skin_temp !== undefined ? kwargs.initial_skin_temp : 36.8;
  const initial_core_temp =
    kwargs.initial_core_temp !== undefined ? kwargs.initial_core_temp : 36.49;
  const acclimatized =
    kwargs.acclimatized !== undefined ? kwargs.acclimatized : true;

  validateInputs(
    {
      tdb,
      tr,
      v,
      met,
      clo,
      vapor_pressure,
      wme,
      body_surface_area,
      p_atm,
      position,
      body_weight,
      length_time_simulation,
      initial_skin_temp,
      initial_core_temp,
      acclimatized,
    },
    TWO_NODES_GAGGE_JI_SCHEMA,
  );

  const position_code = position === "sitting" ? 0 : 1;

  // Initial variables as defined in ASHRAE 55-2020
  const air_speed = Math.max(v, 0.1);
  const met_factor = 58.2; // met conversion factor
  const sbc = 0.000000056697; // Stefan-Boltzmann constant (W/m2K4)

  // These values are taken from Ji, 2022
  const c_sw = 170; // driving coefficient for regulatory sweating
  const c_dil = 50; // driving coefficient for vasodilation
  const c_str = 0.75; // driving coefficient for vasoconstriction
  const a_cof = 0.2; // coefficient in sweat rate

  // Max and min values defined by Ji, 2022
  const min_skin_blood_flow = 0.75; // min SBF for older people
  const max_skin_blood_flow = 63; // max SBF for older people
  const max_sweating_rate_factor = 0.9; // 90% sweating efficiency
  let evap_sweating_reg_max = 400; // W/m2

  // Other coefficients defined by Ji, 2022
  const c_de = 0.6; // attenuation coefficient of vasodilation
  const c_ce = 0.5; // attenuation coefficient of vasoconstriction
  const c_swe = 1; // sweat attenuation coefficient
  const c_she = 1; // shivering attenuation coefficient
  const cof_scs = 19.4; // added shivering coefficient
  const cof_sc = 50; // added shivering coefficient
  const cof_ss = 0.5; // added shivering coefficient

  // Neutral/trigger values for different systems (in older people)
  const t_cr0_dil = 37.3; // vasodilation threshold
  const t_sk0_cons = 33.25; // vasoconstriction threshold
  const t_cr0_sw = 37.0; // core sweating threshold
  const t_sk0_sw = 34.3; // skin sweating threshold
  const t_cr0_sh = 36.7; // shivering threshold

  let alfa = 0.1;
  const skin_blood_flow_neutral = 6.3; // as defined by Ji, 2021

  let t_skin = initial_skin_temp;
  let t_core = initial_core_temp;
  let m_bl = skin_blood_flow_neutral;

  let e_skin = 0.1 * met;
  let w = 0.06;

  const pressure_in_atmospheres = p_atm / 101325.0;
  const r_clo = 0.155 * clo;
  const f_a_cl = clo < 0.5 ? 1.0 + 0.2 * clo : 1.05 + 0.1 * clo;
  const lr = 2.2 / pressure_in_atmospheres;
  let m = met * met_factor;

  let i_cl = 1.0;
  if (clo > 0) {
    i_cl = 0.45;
  }

  let w_max = 0.85;
  if (acclimatized) {
    evap_sweating_reg_max = 1.25 * evap_sweating_reg_max;
    w_max = 1.0;
  }
  let m_rsw_max = evap_sweating_reg_max / 0.68;
  m_rsw_max = m_rsw_max * max_sweating_rate_factor;

  let h_cc = 3.0;
  let h_r = 4.7;

  const skin_temp_hist = new Array(length_time_simulation);
  const core_temp_hist = new Array(length_time_simulation);

  for (
    let n_simulation = 0;
    n_simulation < length_time_simulation;
    n_simulation++
  ) {
    const iteration_limit = 150;

    let h_t = h_r + h_cc;
    let r_a = 1.0 / (f_a_cl * h_t);
    let t_op = (h_r * tr + h_cc * tdb) / h_t;

    let t_cl = (r_a * t_skin + r_clo * t_op) / (r_a + r_clo);
    let n_iterations = 0;
    let tc_converged = false;

    while (!tc_converged) {
      if (position_code === 0) {
        h_r =
          4.0 * 0.97 * sbc * Math.pow((t_cl + tr) / 2.0 + 273.15, 3.0) * 0.7;
      } else {
        h_r =
          4.0 * 0.97 * sbc * Math.pow((t_cl + tr) / 2.0 + 273.15, 3.0) * 0.77;
      }
      h_t = h_r + h_cc;
      r_a = 1.0 / (f_a_cl * h_t);
      t_op = (h_r * tr + h_cc * tdb) / h_t;
      let t_cl_new = (r_a * t_skin + r_clo * t_op) / (r_a + r_clo);

      if (Math.abs(t_cl_new - t_cl) < 0.01) {
        tc_converged = true;
      }
      t_cl = t_cl_new;
      n_iterations++;

      if (n_iterations > iteration_limit) {
        throw new Error(
          "Max iterations exceeded in clothing temperature calculation",
        );
      }
    }

    const d_tcl_air = t_cl - tdb;
    if (air_speed < 0.2) {
      if (d_tcl_air > 0) {
        h_cc = 2.5 * Math.pow(d_tcl_air, 0.16);
      } else {
        h_cc = 2.5 * Math.pow(Math.abs(d_tcl_air), 0.41);
      }
    } else {
      h_cc = 8.6 * Math.pow(air_speed, 0.53);
    }

    const q_sensible = (t_skin - t_op) / (r_a + r_clo);

    const q_res = 0.0023 * m * (44.0 - vapor_pressure);
    const c_res = 0.0014 * m * (34.0 - tdb);

    const hf_cs = (t_core - t_skin) * (5.28 + 1.163 * m_bl);
    const s_core = m - hf_cs - q_res - c_res - wme;
    const s_skin = hf_cs - q_sensible - e_skin;
    const tc_sk = 0.97 * alfa * body_weight;
    const tc_cr = 0.97 * (1.0 - alfa) * body_weight;

    const d_t_sk = (s_skin * body_surface_area) / (tc_sk * 60.0);
    const d_t_cr = (s_core * body_surface_area) / (tc_cr * 60.0);

    t_skin += d_t_sk;
    t_core += d_t_cr;

    const t_cr_dil = Math.max(0, t_core - t_cr0_dil);
    const t_sk_cons = Math.max(0, t_sk0_cons - t_skin);

    m_bl =
      (skin_blood_flow_neutral + c_de * c_dil * t_cr_dil) /
      (1.0 + c_ce * c_str * t_sk_cons);
    m_bl = Math.min(max_skin_blood_flow, m_bl);
    m_bl = Math.max(min_skin_blood_flow, m_bl);

    const t_sk_sw = Math.max(0, t_skin - t_sk0_sw);
    const t_cr_sw = Math.max(0, t_core - t_cr0_sw);

    alfa = 0.0417737 + 0.7451832 / (m_bl + 0.5854417);

    let m_rsw =
      c_swe *
      c_sw *
      ((1.0 - alfa) * t_cr_sw + (alfa + a_cof) * t_sk_sw) *
      Math.exp(t_sk_sw / 10.7);
    m_rsw = Math.min(m_rsw, m_rsw_max);
    let e_rsw = 0.68 * m_rsw;

    const r_e_cl = r_clo / (lr * i_cl);
    const r_e_a = 1.0 / (lr * f_a_cl * h_cc);
    const r_total = r_e_cl + r_e_a;

    const e_max =
      (Math.exp(18.6686 - 4030.183 / (t_skin + 235.0)) - vapor_pressure) /
      r_total;
    let p_rsw = e_rsw / e_max;

    const he_n = 1.0 / r_total;
    const wettedness_dif = 1.0 / (2.0 + 2.46 * he_n);
    const wp = wettedness_dif + (1.0 - wettedness_dif) * p_rsw;

    w = (Math.sqrt(2.0 * Math.pow(wp, 2) + 1.0) - 1.0) / wp;
    w = Math.min(w, w_max);

    p_rsw = (w - wettedness_dif) / (1.0 - wettedness_dif);
    e_rsw = Math.max(0, p_rsw * e_max);
    let e_diff = Math.max(0, w * e_max - e_rsw);

    if (e_max < 0) {
      w = 0.0;
      e_diff = 0.0;
      e_rsw = 0.0;
    }

    e_skin = e_rsw + e_diff;

    const t_cr_sh = Math.max(0, t_cr0_sh - t_core);
    const met_shivering =
      c_she *
      (cof_scs * t_cr_sh * t_sk_cons + cof_sc * t_cr_sh + cof_ss * t_sk_cons);
    m = met * met_factor + met_shivering;

    skin_temp_hist[n_simulation] = t_skin;
    core_temp_hist[n_simulation] = t_core;
  }

  return {
    t_core: core_temp_hist,
    t_skin: skin_temp_hist,
  };
}
