import { validateInputs } from "../utilities/utilities.js";

/**
 * @typedef {Object} GaggeTwoNodesSleepReturnType
 * @property {number} set - Standard Effective Temperature, [°C]
 * @property {number} t_core - Core temperature, [°C]
 * @property {number} t_skin - Skin temperature, [°C]
 * @property {number} wet - Skin wettedness, adimensional
 * @property {number} t_sens - Thermal sensation, adimensional
 * @property {number} disc - Thermal discomfort, adimensional
 * @property {number} e_skin - Total evaporative heat loss, [W]
 * @property {number} met_shivering - Metabolic rate due to shivering, [met]
 * @property {number} alfa - Dynamic fraction of total body mass assigned to the skin node
 * @property {number} skin_blood_flow - Skin-blood-flow rate, [kg/h/m2]
 */

/**
 * @typedef {Object} GaggeTwoNodesSleepKwargs
 * @property {number} [ltime=1] - Number of time steps for each iteration.
 * @property {number} [height=171] - Height of the person, [cm].
 * @property {number} [weight=70] - Weight of the person, [kg].
 * @property {number} [c_sw=170] - Driving coefficient for regulatory sweating.
 * @property {number} [c_dil=120] - Driving coefficient for vasodilation.
 * @property {number} [c_str=0.5] - Driving coefficient for vasoconstriction.
 * @property {number} [temp_skin_neutral=33.7] - Skin temperature at neutral conditions, [°C].
 * @property {number} [temp_core_neutral=36.8] - Core temperature at neutral conditions, [°C].
 * @property {number} [e_skin=0.094] - Total evaporative heat loss, [W].
 * @property {number} [alfa=0.1] - Dynamic fraction of total body mass assigned to the skin node.
 * @property {number} [skin_blood_flow=6.3] - Skin-blood-flow rate per unit surface area, [kg/h/m2].
 * @property {number} [met_shivering=0] - Metabolic rate due to shivering, [met].
 */

const TWO_NODES_GAGGE_SLEEP_SCHEMA = {
  tdb: { type: "number" },
  tr: { type: "number" },
  v: { type: "number" },
  rh: { type: "number" },
  clo: { type: "number" },
  thickness_quilt: { type: "number" },
  wme: { type: "number", required: false },
  p_atm: { type: "number", required: false },
  ltime: { type: "number", required: false },
  height: { type: "number", required: false },
  weight: { type: "number", required: false },
  c_sw: { type: "number", required: false },
  c_dil: { type: "number", required: false },
  c_str: { type: "number", required: false },
  temp_skin_neutral: { type: "number", required: false },
  temp_core_neutral: { type: "number", required: false },
  e_skin: { type: "number", required: false },
  alfa: { type: "number", required: false },
  skin_blood_flow: { type: "number", required: false },
  met_shivering: { type: "number", required: false },
};

/**
 * @public
 * @memberof models
 * @docname Yan et al. two-node-sleep model
 *
 * Adaption of the Gagge two-node model for sleep thermal environment, developed by Yan et al. (2022).
 *
 * @param {number} tdb - Dry bulb air temperature, [°C]
 * @param {number} tr - Mean radiant temperature, [°C]
 * @param {number} v - Air speed, [m/s]
 * @param {number} rh - Relative humidity, [%]
 * @param {number} clo - Clothing insulation, [clo]
 * @param {number} thickness_quilt - Thickness of the quilt, [cm]
 * @param {number} [wme=0] - External work, [met]. Defaults to 0.
 * @param {number} [p_atm=101325] - Atmospheric pressure, [Pa]. Defaults to 101325.
 * @param {GaggeTwoNodesSleepKwargs} [kwargs={}] - Keyword arguments
 * @returns {GaggeTwoNodesSleepReturnType} Object containing the simulation result scalars.
 */
export function two_nodes_gagge_sleep(
  tdb,
  tr,
  v,
  rh,
  clo,
  thickness_quilt,
  wme = 0,
  p_atm = 101325,
  kwargs = {},
) {
  const unexpected_kwargs = Object.keys(kwargs).filter(
    (key) => !Object.hasOwn(TWO_NODES_GAGGE_SLEEP_SCHEMA, key),
  );
  if (unexpected_kwargs.length > 0) {
    throw new TypeError(
      `Unexpected keyword arguments: ${JSON.stringify(unexpected_kwargs)}`,
    );
  }

  const ltime = kwargs.ltime !== undefined ? kwargs.ltime : 1;
  const height = kwargs.height !== undefined ? kwargs.height : 171;
  const weight = kwargs.weight !== undefined ? kwargs.weight : 70;
  const c_sw = kwargs.c_sw !== undefined ? kwargs.c_sw : 170;
  const c_dil = kwargs.c_dil !== undefined ? kwargs.c_dil : 120;
  const c_str = kwargs.c_str !== undefined ? kwargs.c_str : 0.5;
  const temp_skin_neutral =
    kwargs.temp_skin_neutral !== undefined ? kwargs.temp_skin_neutral : 33.7;
  const temp_core_neutral =
    kwargs.temp_core_neutral !== undefined ? kwargs.temp_core_neutral : 36.8;
  const e_skin = kwargs.e_skin !== undefined ? kwargs.e_skin : 0.094;
  const alfa = kwargs.alfa !== undefined ? kwargs.alfa : 0.1;
  const skin_blood_flow =
    kwargs.skin_blood_flow !== undefined ? kwargs.skin_blood_flow : 6.3;
  const met_shivering =
    kwargs.met_shivering !== undefined ? kwargs.met_shivering : 0;

  validateInputs(
    {
      tdb,
      tr,
      v,
      rh,
      clo,
      thickness_quilt,
      wme,
      p_atm,
      ltime,
      height,
      weight,
      c_sw,
      c_dil,
      c_str,
      temp_skin_neutral,
      temp_core_neutral,
      e_skin,
      alfa,
      skin_blood_flow,
      met_shivering,
    },
    TWO_NODES_GAGGE_SLEEP_SCHEMA,
  );

  if (thickness_quilt < 0) {
    throw new RangeError(
      `thickness_quilt must be non-negative, got ${thickness_quilt}`,
    );
  }

  if (!Number.isInteger(ltime)) {
    throw new TypeError(`ltime must be an integer, got ${ltime}`);
  }
  if (ltime < 1) {
    throw new RangeError(`ltime must be positive, got ${ltime}`);
  }

  const hour = -1 / 60.0;

  const met =
    -0.000000000000575 * Math.pow(hour, 5) +
    0.000000000785521 * Math.pow(hour, 4) -
    0.00000039173563 * Math.pow(hour, 3) +
    0.000087620232151 * Math.pow(hour, 2) -
    0.008801558913211 * hour +
    1.09952538864493;

  const t_core_neutral_calculated =
    0.022234 * Math.pow(hour, 2) - 0.27677 * hour + 37.02;

  const sleep_output = _sleep_set(
    tdb,
    tr,
    v,
    rh,
    clo,
    thickness_quilt,
    met,
    wme,
    p_atm,
    ltime,
    height,
    weight,
    c_sw,
    c_dil,
    c_str,
    temp_skin_neutral,
    t_core_neutral_calculated,
    e_skin,
    alfa,
    skin_blood_flow,
    met_shivering,
  );

  return {
    set: sleep_output.set_temp,
    t_core: sleep_output.t_core,
    t_skin: sleep_output.t_skin,
    wet: sleep_output.wet,
    t_sens: sleep_output.t_sens,
    disc: sleep_output.disc,
    e_skin: sleep_output.e_skin,
    met_shivering: sleep_output.met_shivering,
    alfa: sleep_output.alfa,
    skin_blood_flow: sleep_output.skin_blood_flow,
  };
}

function _fnsvp(t) {
  return Math.exp(18.6686 - 4030.183 / (t + 235.0));
}

function _fnerre(x, hsk, hd, tsk, w, he, pssk) {
  return hsk - hd * (tsk - x) - w * he * (pssk - 0.5 * _fnsvp(x));
}

function _fnerrs(x, hsk, hd_s, tsk, w, he_s, pssk) {
  return hsk - hd_s * (tsk - x) - w * he_s * (pssk - 0.5 * _fnsvp(x));
}

function _sleep_set(
  tdb,
  tr,
  v,
  rh,
  clo,
  thickness,
  met,
  wme,
  p_atm,
  ltime,
  height,
  weight,
  c_sw,
  c_dil,
  c_str,
  temp_skin_neutral,
  temp_core_neutral,
  e_skin,
  alfa,
  skin_blood_flow,
  met_shivering,
) {
  let m = met * 58.2;
  let w = wme * 58.2;
  let k_clo = 0.25;
  let temp_body_neutral = 36.49;
  let skin_blood_flow_neutral = 6.3;
  let sbc = 5.6697 * 1e-8;
  let sa = Math.pow((height * weight) / 3600.0, 0.5);

  let v_eff = Math.max(v, 0.1);
  let t_skin = temp_skin_neutral;
  let t_core = temp_core_neutral;
  let rmm = m;

  let e_rsw = 0;
  let e_diff = 0;
  let e_max = 0;
  let dry = 0;
  let r_ea = 0;
  let r_ecl = 0;
  let p_wet = 0;
  let t_body = 0;
  let x = 0;

  let pressure_in_atmospheres = p_atm / 101325.0;
  let r_clo = 0.155 * clo;
  let f_a_cl = 0.0308 * thickness + 0.7695;
  let lr = 2.2 / pressure_in_atmospheres;
  let pa = (rh * Math.exp(18.6686 - 4030.183 / (tdb + 235))) / 100.0;

  let w_max, i_cl;
  if (clo <= 0) {
    w_max = 0.38 * Math.pow(v_eff, -0.29);
    i_cl = 1.0;
  } else {
    w_max = 0.59 * Math.pow(v_eff, -0.08);
    i_cl = 0.45;
  }

  let temp_diff = Math.abs(t_skin - tdb);
  let chc = 4.4854 * Math.pow(temp_diff, 0.274) * Math.pow(v_eff, 0.1242);
  let h_r = 3.235;
  let ctc = h_r + chc;
  let r_a = 1.0 / (f_a_cl * ctc);
  let t_op = (h_r * tr + chc * tdb) / ctc;
  let t_cl = t_op + (t_skin - t_op) / (ctc * (r_a + r_clo));
  let t_cl_old = t_cl;
  let flag = false;

  for (let step = 0; step < ltime; step++) {
    if (flag) {
      t_cl = (r_a * t_skin + r_clo * t_op) / (r_a + r_clo);
      if (Math.abs(t_cl - t_cl_old) > 0.01) {
        flag = false;
        t_cl_old = t_cl;
      } else {
        flag = true;
      }
    }

    let max_iter = 100;
    let iter_cnt = 0;
    while (!flag && iter_cnt < max_iter) {
      h_r = 4.0 * sbc * Math.pow((t_cl + tr) / 2.0 + 273.15, 3) * 0.72;
      ctc = h_r + chc;
      r_a = 1.0 / (f_a_cl * ctc);
      t_op = (h_r * tr + chc * tdb) / ctc;
      t_cl = (r_a * t_skin + r_clo * t_op) / (r_a + r_clo);
      if (Math.abs(t_cl - t_cl_old) > 0.01) {
        flag = false;
        t_cl_old = t_cl;
      } else {
        flag = true;
      }
      iter_cnt++;
    }

    dry = (t_skin - t_op) / (r_a + r_clo);
    let hf_cs = (t_core - t_skin) * (5.28 + 1.163 * skin_blood_flow);
    let q_res = 0.0023 * m * (44.0 - pa);
    let c_res = 0.0014 * m * (34.0 - tdb);
    let s_core = m - hf_cs - q_res - c_res - w;
    let s_skin = hf_cs - dry - e_skin;
    let tc_sk = 0.97 * alfa * weight;
    let tc_cr = 0.97 * (1.0 - alfa) * weight;
    let d_t_sk = (s_skin * sa) / tc_sk / 60.0;
    let d_t_cr = (s_core * sa) / tc_cr / 60.0;
    t_skin += d_t_sk;
    t_core += d_t_cr;
    t_body = alfa * t_skin + (1.0 - alfa) * t_core;

    let warm_sk = Math.max(t_skin - 33.7, 0);
    let cold_s = Math.max(33.7 - t_skin, 0);
    let warm_c = Math.max(t_core - temp_core_neutral, 0);
    let cold_c = Math.max(temp_core_neutral - t_core, 0);
    let warm_b = Math.max(t_body - temp_body_neutral, 0);

    skin_blood_flow =
      (skin_blood_flow_neutral + c_dil * warm_c) / (1.0 + c_str * cold_s);
    skin_blood_flow = Math.min(Math.max(skin_blood_flow, 0.5), 90.0);
    let reg_sw = c_sw * warm_b * Math.exp(warm_sk / 10.7);
    reg_sw = Math.min(reg_sw, 500.0);
    e_rsw = 0.68 * reg_sw;
    r_ea = 1.0 / (lr * f_a_cl * chc);
    r_ecl = r_clo / (lr * i_cl);
    e_max = (_fnsvp(t_skin) - pa) / (r_ea + r_ecl);
    let p_rsw = e_rsw / e_max;
    p_wet = 0.06 + 0.94 * p_rsw;
    e_diff = p_wet * e_max - e_rsw;

    if (p_wet > w_max) {
      p_wet = w_max;
      p_rsw = w_max / 0.94;
      e_rsw = p_rsw * e_max;
      e_diff = 0.06 * (1.0 - p_rsw) * e_max;
    }
    e_skin = e_rsw + e_diff;
    met_shivering = 19.4 * cold_s * cold_c;
    m = rmm + met_shivering;
    alfa = 0.0417737 + 0.7451833 / (skin_blood_flow + 0.585417);
  }

  let q_skin = dry + e_skin;
  let rn = m - w;
  let e_comfort = 0.42 * (rn - 58.2);
  e_comfort = Math.max(e_comfort, 0);
  e_max *= w_max;
  let h_d = 1.0 / (r_a + r_clo);
  let h_e = 1.0 / (r_ea + r_ecl);
  let wet = p_wet;
  let p_s_sk = _fnsvp(t_skin);
  let chrs = h_r;
  let chcs = Math.max(3.0, met >= 0.85 ? 5.66 * Math.pow(met - 0.85, 0.39) : 0);
  let ctcs = chcs + chrs;
  let r_clo_s = 1.52 / (met - wme + 0.6944) - 0.1835;
  let r_cl_s = 0.155 * r_clo_s;
  let f_a_cl_s = 1.0 + k_clo * r_clo_s;
  let f_cl_s = 1.0 / (1.0 + 0.155 * f_a_cl_s * ctcs * r_clo_s);
  let i_m_s = 0.45;
  let i_cl_s =
    (((i_m_s * chcs) / ctcs) * (1.0 - f_cl_s)) / (chcs / ctcs - f_cl_s * i_m_s);
  let r_a_s = 1.0 / (f_a_cl_s * ctcs);
  let r_ea_s = 1.0 / (lr * f_a_cl_s * chcs);
  let r_ecl_s = r_cl_s / (lr * i_cl_s);
  let h_d_s = 1.0 / (r_a_s + r_cl_s);
  let h_e_s = 1.0 / (r_ea_s + r_ecl_s);
  let delta = 1e-4;
  let xold = t_skin - q_skin / h_d;

  let flag1 = false;
  while (!flag1) {
    let err1 = _fnerre(xold, q_skin, h_d, t_skin, wet, h_e, p_s_sk);
    let err2 = _fnerre(xold + delta, q_skin, h_d, t_skin, wet, h_e, p_s_sk);
    let err_diff = err2 - err1;
    if (Math.abs(err_diff) < 1e-10) {
      break;
    }
    x = xold - (delta * err1) / err_diff;
    if (Math.abs(x - xold) > 0.01) {
      xold = x;
      flag1 = false;
    } else {
      flag1 = true;
    }
  }

  xold = t_skin - q_skin / h_d_s;
  let flag2 = false;
  while (!flag2) {
    let err1 = _fnerrs(xold, q_skin, h_d_s, t_skin, wet, h_e_s, p_s_sk);
    let err2 = _fnerrs(xold + delta, q_skin, h_d_s, t_skin, wet, h_e_s, p_s_sk);
    x = xold - (delta * err1) / (err2 - err1);
    if (Math.abs(x - xold) > 0.01) {
      xold = x;
      flag2 = false;
    } else {
      flag2 = true;
    }
  }

  let set_temp = x;
  let tbm_l = (0.194 / 58.15) * rn + 36.301;
  let tbm_h = (0.347 / 58.15) * rn + 36.669;
  let t_sens = 0;

  if (t_body < tbm_l) {
    t_sens = 0.4685 * (t_body - tbm_l);
  } else if (t_body >= tbm_l && t_body < tbm_h) {
    t_sens = (w_max * 4.7 * (t_body - tbm_l)) / (tbm_h - tbm_l);
  } else {
    t_sens = w_max * 4.7 + 0.4685 * (t_body - tbm_h);
  }

  let disc = (4.7 * (e_rsw - e_comfort)) / (e_max - e_comfort - e_diff);
  if (disc < 0) {
    disc = t_sens;
  }

  return {
    set_temp,
    t_core,
    t_skin,
    wet,
    t_sens,
    disc,
    e_skin,
    met_shivering,
    alfa,
    skin_blood_flow,
  };
}
