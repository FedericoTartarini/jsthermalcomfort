import {
  body_surface_area,
  check_standard_compliance,
  round,
} from "../utilities/utilities.js";
import { p_sat } from "../psychrometrics/p_sat.js";

/**
 * @typedef {Object} PhsReturnType
 * @property {number} t_re - rectal temperature, [°C]
 * @property {number} t_sk - skin temperature, [°C]
 * @property {number} t_cr - core temperature, [°C]
 * @property {number} t_cr_eq - core temperature as a function of the metabolic rate, [°C]
 * @property {number} t_sk_t_cr_wg - fraction of the body mass at the skin temperature
 * @property {number} d_lim_loss_50 - maximum allowable exposure time for water loss, mean subject, [minutes]
 * @property {number} d_lim_loss_95 - maximum allowable exposure time for water loss, 95% of the working population, [minutes]
 * @property {number} d_lim_t_re - maximum allowable exposure time for heat storage, [minutes]
 * @property {number} water_loss_watt - maximum water loss in watts, [W]
 * @property {number} water_loss - maximum water loss, [g]
 */

/**
 * @typedef {Object} PhsKwargs
 * @property {number} [i_mst=0.38] - static moisture permeability index, [dimensionless]
 * @property {number} [a_p=0.54] - fraction of the body surface covered by the reflective clothing, [dimensionless]
 * @property {0 | 1} [drink=1] - 1 if workers can drink freely, 0 otherwise
 * @property {number} [weight=75] - body weight, [kg]
 * @property {number} [height=1.8] - height, [m]
 * @property {number} [walk_sp=0] - walking speed, [m/s]
 * @property {number} [theta=0] - angle between walking direction and wind direction [degrees]
 * @property {number} [acclimatized=100] - 100 if acclimatized subject, 0 otherwise
 * @property {number} [duration=480] - duration of the work sequence, [minutes]
 * @property {number} [f_r=0.97] - emissivity of the reflective clothing, [dimensionless]
 * @property {number} [t_sk=34.1] - mean skin temperature when worker starts working, [°C]
 * @property {number} [t_cr=36.8] - mean core temperature when worker starts working, [°C]
 * @property {number} [t_re] - mean rectal temperature when worker starts working, [°C]
 * @property {number} [t_cr_eq] -  mean core temperature as a function of met when worker starts working, [°C]
 * @property {number} [sweat_rate=0] - sweat rate
 * @property {boolean} [round=true] - round the result of the PHS model
 */

/**
 * @typedef {Object} PhsKwargsRequired
 * @property {number} i_mst
 * @property {number} a_p
 * @property {0 | 1} drink
 * @property {number} weight
 * @property {number} height
 * @property {number} walk_sp
 * @property {number} theta
 * @property {number} acclimatized
 * @property {number} duration
 * @property {number} f_r
 * @property {number} t_sk
 * @property {number} t_cr
 * @property {number} t_re
 * @property {number} t_cr_eq
 * @property {number} sweat_rate
 * @property {boolean} round
 */

/**
 * Calculates the Predicted Heat Strain (PHS) index based in compliace with
 * the ISO 7933:2004 Standard [8]_. The ISO 7933 provides a method for the
 * analytical evaluation and interpretation of the thermal stress experienced
 * by a subject in a hot environment. It describes a method for predicting the
 * sweat rate and the internal core temperature that the human body will
 * develop in response to the working conditions.
 *
 * The PHS model can be used to predict the: heat by respiratory convection, heat flow
 * by respiratory evaporation, steady state mean skin temperature, instantaneous value
 * of skin temperature, heat accumulation associated with the metabolic rate, maximum
 * evaporative heat flow at the skin surface, predicted sweat rate, predicted evaporative
 * heat flow, and rectal temperature.
 *
 * @public
 * @memberof models
 * @docname Predicted Heat Strain (PHS) Index
 *
 * @param {number} tdb - dry bulb air temperature, default in [°C]
 * @param {number} tr - mean radiant temperature, default in [°C]
 * @param {number} v - air speed, default in [m/s]
 * @param {number} rh - relative humidity, [%]
 * @param {number} met - metabolic rate, [W/(m2)]
 * @param {number} clo - clothing insulation, [clo]
 * @param {1 | 2 | 3} posture - a numeric value presenting posture of person [sitting=1, standing=2, crouching=3]
 * @param {number} [wme=0] - external work, [W/(m2)] default 0
 * @param {PhsKwargs} [kwargs] - additional arguments
 *
 * @returns {PhsReturnType} object with results of phs
 *
 * @example
 * import { phs } from "jsthermalcomfort";
 * const results = phs(40, 40, 33.85, 0.3, 150, 0.5, 2);
 * console.log(results); // {t_re: 37.5, d_lim_loss_50: 440, d_lim_loss_95: 298, d_lim_t_re: 480, water_loss: 6166.0}
 *
 * @category Thermophysiological models
 */
export function phs(tdb, tr, v, rh, met, clo, posture, wme = 0, kwargs = {}) {
  const defaults_kwargs = {
    i_mst: 0.38,
    a_p: 0.54,
    drink: 1,
    weight: 75,
    height: 1.8,
    walk_sp: 0,
    theta: 0,
    acclimatized: 100,
    duration: 480,
    f_r: 0.97,
    t_sk: 34.1,
    t_cr: 36.8,
    t_re: undefined,
    t_cr_eq: undefined,
    sweat_rate: 0,
    round: true,
  };
  let joint_kwargs = Object.assign(defaults_kwargs, kwargs);
  joint_kwargs.t_re = joint_kwargs.t_re || joint_kwargs.t_cr;
  joint_kwargs.t_cr_eq = joint_kwargs.t_cr_eq || joint_kwargs.t_cr;

  const warnings = check_standard_compliance("ISO7933", {
    tdb,
    tr,
    v,
    rh,
    met: met * body_surface_area(joint_kwargs.weight, joint_kwargs.height),
    clo,
  });
  warnings.forEach((warning) => console.warn(warning));

  const p_a = ((p_sat(tdb) / 1000) * rh) / 100;

  const variables_for_loop = _calculate_variables_for_loop(
    v,
    met,
    posture,
    clo,
    tdb,
    p_a,
    joint_kwargs,
  );

  const result = _phs_loop(
    tdb,
    tr,
    v,
    met,
    clo,
    wme,
    p_a,
    joint_kwargs,
    variables_for_loop,
  );

  if (joint_kwargs.round) {
    return {
      t_re: round(result.t_re, 1),
      t_sk: round(result.t_sk, 1),
      t_cr: round(result.t_cr, 1),
      t_cr_eq: round(result.t_cr_eq, 1),
      t_sk_t_cr_wg: round(result.t_sk_t_cr_wg, 2),
      d_lim_loss_50: round(result.d_lim_loss_50, 1),
      d_lim_loss_95: round(result.d_lim_loss_95, 1),
      d_lim_t_re: round(result.d_lim_t_re, 1),
      water_loss_watt: round(result.water_loss_watt, 1),
      water_loss: round(result.water_loss, 1),
    };
  }
  return result;
}

/**
 * @param {1 | 2 | 3} posture
 */
function _radiating_area_dubois(posture) {
  return posture === 1 ? 0.7 : posture === 2 ? 0.77 : 0.67;
}

/**
 * @param {number} met
 * @param {number} a_dubois
 * @param {number} acclimatized
 */
function _max_sweat_rate(met, a_dubois, acclimatized) {
  let sw_max = (met - 32) * a_dubois;
  sw_max = Math.min(sw_max, 400);
  sw_max = Math.max(sw_max, 250);
  return acclimatized >= 50 ? sw_max * 1.25 : sw_max;
}

/**
 * @typedef {Object} Speeds
 * @property {number} v
 * @property {number} walk_speed
 */

/**
 * @param {number} walk_speed
 * @param {number} theta
 * @param {number} v
 * @param {number} met
 *
 * @returns {Speeds}
 */
function _calculate_speeds(walk_speed, theta, v, met) {
  if (walk_speed <= 0) {
    walk_speed = 0.0052 * (met - 58);
    walk_speed = Math.min(walk_speed, 0.7);
    return { walk_speed, v };
  }

  if (theta !== 0)
    v = Math.abs(v - walk_speed * Math.cos((3.14159 * theta) / 180));
  else v = Math.max(v, walk_speed);
  return { v, walk_speed };
}

/**
 * @typedef {Object} VariablesForLoop
 * @property {number} sw_max
 * @property {number} w_max
 * @property {number} fcl
 * @property {number} i_cl_dyn
 * @property {number} r_t_dyn
 * @property {number} c_res
 * @property {number} e_res
 * @property {number} hc_dyn
 * @property {number} aux_r
 * @property {number} f_cl_r
 * @property {number} a_dubois
 * @property {number} sp_heat
 * @property {number} d_lim_t_re
 * @property {number} d_lim_loss_50
 * @property {number} d_lim_loss_95
 * @property {number} d_max_50
 * @property {number} d_max_95
 * @property {number} const_t_eq
 * @property {number} const_t_sk
 * @property {number} const_sw
 */

/**
 * @param {number} v
 * @param {number} met
 * @param {number} posture
 * @param {number} clo
 * @param {number} tdb
 * @param {number} p_a
 * @param {PhsKwargsRequired} kwargs
 *
 * @returns {VariablesForLoop} Variables used in the phs calculation loop
 */
function _calculate_variables_for_loop(v, met, posture, clo, tdb, p_a, kwargs) {
  let walk_sp = kwargs.walk_sp;

  const a_dubois =
    0.202 * Math.pow(kwargs.weight, 0.425) * Math.pow(kwargs.height, 0.725);
  const sp_heat = (57.83 * kwargs.weight) / a_dubois;
  const d_lim_t_re = 0;
  const d_lim_loss_50 = 0;
  const d_lim_loss_95 = 0;
  const d_max_50 = 0.075 * kwargs.weight * 1000;
  const d_max_95 = 0.05 * kwargs.weight * 1000;
  const const_t_eq = Math.exp(-1 / 10);
  const const_t_sk = Math.exp(-1 / 3);
  const const_sw = Math.exp(-1 / 10);

  const w_max = kwargs.acclimatized < 50 ? 0.85 : 1;

  const speeds = _calculate_speeds(walk_sp, kwargs.theta, v, met);
  const v_r = speeds.v;
  walk_sp = speeds.walk_speed;

  const v_ux = Math.min(3, v_r);
  const w_a_ux = Math.min(1.5, walk_sp);

  let corr_cl =
    1.044 *
    Math.exp((0.066 * v_ux - 0.398) * v_ux + (0.094 * w_a_ux - 0.378) * w_a_ux);
  corr_cl = Math.min(1, corr_cl);

  let corr_ia = Math.exp(
    (0.047 * v_r - 0.472) * v_r + (0.117 * w_a_ux - 0.342) * w_a_ux,
  );
  corr_ia = Math.min(1, corr_ia);

  const corr_tot =
    clo <= 0.6 ? ((0.6 - clo) * corr_ia + clo * corr_cl) / 0.6 : corr_cl;

  const fcl = 1 + 0.3 * clo;
  const i_a_st = 0.111;
  const i_tot_st = clo * 0.155 + i_a_st / fcl;

  const i_tot_dyn = i_tot_st * corr_tot;

  const i_a_dyn = corr_ia * i_a_st;
  const i_cl_dyn = i_tot_dyn - i_a_dyn / fcl;
  const corr_e = (2.6 * corr_tot - 6.5) * corr_tot + 4.9;
  const im_dyn = Math.min(kwargs.i_mst * corr_e, 0.9);
  const r_t_dyn = i_tot_dyn / im_dyn / 16.7;
  const t_exp = 28.56 + 0.115 * tdb + 0.641 * p_a;
  const c_res = 0.001516 * met * (t_exp - tdb);
  const e_res = 0.00127 * met * (59.34 + 0.53 * tdb - 11.63 * p_a);
  const z = v_r > 1 ? 8.7 * Math.pow(v_r, 0.6) : 3.5 + 5.2 * v_r;

  let hc_dyn = 2.38 * Math.pow(Math.abs(kwargs.t_sk - tdb), 0.25);
  if (z > hc_dyn) {
    hc_dyn = z;
  }

  const aux_r = 5.67e-8 * _radiating_area_dubois(posture);
  const f_cl_r = (1 - kwargs.a_p) * 0.97 + kwargs.a_p * kwargs.f_r;

  const sw_max = _max_sweat_rate(met, a_dubois, kwargs.acclimatized);

  return {
    sw_max,
    w_max,
    fcl,
    i_cl_dyn,
    r_t_dyn,
    c_res,
    e_res,
    hc_dyn,
    aux_r,
    f_cl_r,
    a_dubois,
    sp_heat,
    d_lim_t_re,
    d_lim_loss_50,
    d_lim_loss_95,
    d_max_50,
    d_max_95,
    const_t_eq,
    const_t_sk,
    const_sw,
  };
}

/**
 * @param {number} tdb
 * @param {number} tr
 * @param {number} v
 * @param {number} met
 * @param {number} clo
 * @param {number} wme
 * @param {number} p_a
 * @param {PhsKwargsRequired} kwargs
 * @param {VariablesForLoop} variables
 *
 * @returns {PhsReturnType}
 */
function _phs_loop(tdb, tr, v, met, clo, wme, p_a, kwargs, variables) {
  let {
    sw_max,
    w_max,
    fcl,
    i_cl_dyn,
    r_t_dyn,
    c_res,
    e_res,
    hc_dyn,
    aux_r,
    f_cl_r,
    a_dubois,
    sp_heat,
    d_lim_t_re,
    d_lim_loss_50,
    d_lim_loss_95,
    d_max_50,
    d_max_95,
    const_t_eq,
    const_t_sk,
    const_sw,
  } = variables;

  let { duration, t_sk, t_re, t_cr, t_cr_eq, sweat_rate, drink } = kwargs;

  let sw_tot = sweat_rate;

  let t_sk_t_cr_wg = 0.3;
  let sw_tot_g = 0.0;

  for (let time = 1; time <= duration; time++) {
    let t_sk0 = t_sk;
    let t_re0 = t_re;
    let t_cr0 = t_cr;
    let t_cr_eq0 = t_cr_eq;
    let t_sk_t_cr_wg0 = t_sk_t_cr_wg;

    // equilibrium core temperature associated to the metabolic rate
    let t_cr_eq_m = 0.0036 * met + 36.6;
    // Core temperature at this minute, by exponential averaging
    t_cr_eq = t_cr_eq0 * const_t_eq + t_cr_eq_m * (1 - const_t_eq);
    // Heat storage associated with this core temperature increase during the last minute
    let d_stored_eq = sp_heat * (t_cr_eq - t_cr_eq0) * (1 - t_sk_t_cr_wg0);
    // skin temperature prediction -- clothed model
    let t_sk_eq_cl =
      12.165 + 0.02017 * tdb + 0.04361 * tr + 0.19354 * p_a - 0.25315 * v;
    t_sk_eq_cl = t_sk_eq_cl + 0.005346 * met + 0.51274 * t_re;
    // nude model
    let t_sk_eq_nu = 7.191 + 0.064 * tdb + 0.061 * tr + 0.198 * p_a - 0.348 * v;
    t_sk_eq_nu = t_sk_eq_nu + 0.616 * t_re;
    let t_sk_eq;
    if (clo >= 0.6) {
      t_sk_eq = t_sk_eq_cl;
    } else if (clo <= 0.2) {
      t_sk_eq = t_sk_eq_nu;
    } else {
      t_sk_eq = t_sk_eq_nu + 2.5 * (t_sk_eq_cl - t_sk_eq_nu) * (clo - 0.2);
    }

    // skin temperature [C]
    t_sk = t_sk0 * const_t_sk + t_sk_eq * (1 - const_t_sk);
    // Saturated water vapour pressure at the surface of the skin
    let p_sk = 0.6105 * Math.exp((17.27 * t_sk) / (t_sk + 237.3));
    let t_cl = tr + 0.1; // clothing surface temperature
    let h_r;
    while (true) {
      // radiative heat transfer coefficient
      h_r =
        (f_cl_r * aux_r * ((t_cl + 273) ** 4 - (tr + 273) ** 4)) / (t_cl - tr);
      let t_cl_new =
        (fcl * (hc_dyn * tdb + h_r * tr) + t_sk / i_cl_dyn) /
        (fcl * (hc_dyn + h_r) + 1 / i_cl_dyn);
      if (Math.abs(t_cl - t_cl_new) <= 0.001) {
        break;
      }
      t_cl = (t_cl + t_cl_new) / 2;
    }

    let convection = fcl * hc_dyn * (t_cl - tdb);
    let radiation = fcl * h_r * (t_cl - tr);
    // maximum evaporative heat flow at the skin surface [W/m2]
    let e_max = (p_sk - p_a) / r_t_dyn;
    // required evaporative heat flow [W/m2]
    let e_req =
      met - d_stored_eq - wme - c_res - e_res - convection - radiation;
    // required skin wettedness
    let w_req = e_req / e_max;

    let sw_req;
    if (e_req <= 0) {
      e_req = 0;
      sw_req = 0; // required sweat rate [W/m2]
    } else if (e_max <= 0) {
      e_max = 0;
      sw_req = sw_max;
    } else if (w_req >= 1.7) {
      sw_req = sw_max;
    } else {
      let e_v_eff = 1 - w_req ** 2 / 2;
      if (w_req > 1) {
        e_v_eff = (2 - w_req) ** 2 / 2;
      }
      sw_req = e_req / e_v_eff;
      if (sw_req > sw_max) {
        sw_req = sw_max;
      }
    }
    sweat_rate = sweat_rate * const_sw + sw_req * (1 - const_sw);

    let e_p;
    if (sweat_rate <= 0) {
      e_p = 0; // predicted evaporative heat flow [W/m2]
      sweat_rate = 0;
    } else {
      let k = e_max / sweat_rate;
      let wp = 1;
      if (k >= 0.5) {
        wp = -k + Math.sqrt(k * k + 2);
      }
      if (wp > w_max) {
        wp = w_max;
      }
      e_p = wp * e_max;
    }

    // body heat storage rate [W/m2]
    let d_storage = e_req - e_p + d_stored_eq;
    let t_cr_new = t_cr0;
    while (true) {
      t_sk_t_cr_wg = 0.3 - 0.09 * (t_cr_new - 36.8);
      if (t_sk_t_cr_wg > 0.3) {
        t_sk_t_cr_wg = 0.3;
      }
      if (t_sk_t_cr_wg < 0.1) {
        t_sk_t_cr_wg = 0.1;
      }
      t_cr =
        d_storage / sp_heat +
        (t_sk0 * t_sk_t_cr_wg0) / 2 -
        (t_sk * t_sk_t_cr_wg) / 2;
      t_cr = (t_cr + t_cr0 * (1 - t_sk_t_cr_wg0 / 2)) / (1 - t_sk_t_cr_wg / 2);
      if (Math.abs(t_cr - t_cr_new) <= 0.001) {
        break;
      }
      t_cr_new = (t_cr_new + t_cr) / 2;
    }

    t_re = t_re0 + (2 * t_cr - 1.962 * t_re0 - 1.31) / 9;
    if (d_lim_t_re == 0 && t_re >= 38) {
      d_lim_t_re = time;
    }
    sw_tot = sw_tot + sweat_rate + e_res;
    sw_tot_g = (sw_tot * 2.67 * a_dubois) / 1.8 / 60;
    if (d_lim_loss_50 == 0 && sw_tot_g >= d_max_50) {
      d_lim_loss_50 = time;
    }
    if (d_lim_loss_95 == 0 && sw_tot_g >= d_max_95) {
      d_lim_loss_95 = time;
    }
    if (drink == 0) {
      d_lim_loss_95 = d_lim_loss_95 * 0.6;
      d_lim_loss_50 = d_lim_loss_95;
    }
  }

  if (d_lim_loss_50 === 0) {
    d_lim_loss_50 = duration;
  }

  if (d_lim_loss_95 === 0) {
    d_lim_loss_95 = duration;
  }

  if (d_lim_t_re === 0) {
    d_lim_t_re = duration;
  }

  return {
    t_re,
    t_sk,
    t_cr,
    t_cr_eq,
    t_sk_t_cr_wg,
    d_lim_loss_50,
    d_lim_loss_95,
    d_lim_t_re,
    water_loss_watt: sweat_rate,
    water_loss: sw_tot_g,
  };
}
