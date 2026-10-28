import { choiceFieldMessage, parseInputs } from "../_internal/define.ts";
import { deepFreeze } from "../_internal/modelInfo.ts";
import type {
  InputsOf,
  ModelInfo,
  ModelWarning,
  OutputsOf,
} from "../_internal/modelInfo.ts";
import { round } from "../_internal/round.ts";
import { p_sat_torr } from "../psychrometrics/p_sat_torr.ts";
import { met_to_w_m2 } from "../utilities/met_to_w_m2.ts";
import { Postures } from "../utilities/options.ts";

const POSITIONS = deepFreeze([
  Postures.sitting,
  Postures.standing,
  "standing, forced convection",
] as const);

export const TWO_NODES_GAGGE_INFO = deepFreeze({
  name: "two_nodes_gagge",
  label: "Gagge et al. two-node model",
  standards: [],
  inputs: {
    tdb: { kind: "numeric", unit: "°C" },
    tr: { kind: "numeric", unit: "°C" },
    v: { kind: "numeric", unit: "m/s" },
    rh: { kind: "numeric", unit: "%" },
    met: { kind: "numeric", unit: "met" },
    clo: { kind: "numeric", unit: "clo" },
    wme: { kind: "numeric", unit: "met", default: 0 },
    body_surface_area: { kind: "numeric", unit: "m²", default: 1.8258 },
    p_atm: { kind: "numeric", unit: "Pa", default: 101325 },
    position: {
      kind: "choice",
      allowed: POSITIONS,
      default: Postures.standing,
      message: choiceFieldMessage("position", POSITIONS),
      nullable: true,
    },
    max_skin_blood_flow: { kind: "numeric", unit: "kg/h/m²", default: 90 },
    round_output: { kind: "bool", default: true },
    max_sweating: { kind: "numeric", unit: "kg/h/m²", default: 500 },
    w_max: { kind: "numeric", unit: null, default: 0 },
    calculate_ce: { kind: "bool", default: false },
  },
  outputs: {
    e_skin: { kind: "numeric", unit: "W/m²" },
    e_rsw: { kind: "numeric", unit: "W/m²" },
    e_max: { kind: "numeric", unit: "W/m²" },
    q_sensible: { kind: "numeric", unit: "W/m²" },
    q_skin: { kind: "numeric", unit: "W/m²" },
    q_res: { kind: "numeric", unit: "W/m²" },
    t_core: { kind: "numeric", unit: "°C" },
    t_skin: { kind: "numeric", unit: "°C" },
    m_bl: { kind: "numeric", unit: "kg/h/m²" },
    m_rsw: { kind: "numeric", unit: "mL/h/m²" },
    w: { kind: "numeric", unit: null },
    w_max: { kind: "numeric", unit: null },
    set: { kind: "numeric", unit: "°C" },
    et: { kind: "numeric", unit: "°C" },
    pmv_gagge: { kind: "numeric", unit: null },
    pmv_set: { kind: "numeric", unit: null },
    disc: { kind: "numeric", unit: null },
    t_sens: { kind: "numeric", unit: null },
  },
} as const satisfies ModelInfo);

/** @interface */
export type GaggeTwoNodesInputs = InputsOf<typeof TWO_NODES_GAGGE_INFO>;

/**
 * Dataclass to represent the results of the two-node model of human temperature
 * regulation.
 *
 * @interface
 */
export type GaggeTwoNodes = OutputsOf<typeof TWO_NODES_GAGGE_INFO>;

/**
 * Dataclass to represent the Standard Effective Temperature (SET).
 *
 * - `set` - Standard effective temperature, [°C].
 *
 * @interface
 */
export type SET = Pick<GaggeTwoNodes, "set" | "warnings">;

export function two_nodes_gagge(
  inputs: GaggeTwoNodesInputs,
): SET | GaggeTwoNodes {
  // Validate inputs using the GaggeTwoNodesInputs class
  let {
    tdb,
    tr,
    v,
    rh,
    met,
    clo,
    wme,
    body_surface_area,
    p_atm,
    position,
    max_skin_blood_flow,
    round_output,
    max_sweating,
    w_max,
    calculate_ce,
  } = parseInputs(TWO_NODES_GAGGE_INFO, inputs);
  // At 0.06 no regulatory sweat is left at the cap, so disc divides by zero
  if (w_max !== 0 && (w_max <= 0.06 || w_max > 1)) {
    const message =
      "w_max must be greater than 0.06 and at most 1 " +
      "(False or 0 means the model computes it).";
    throw new RangeError(message);
  }

  const warnings: ModelWarning[] = [];

  const vapor_pressure = (rh * p_sat_torr(tdb)) / 100;

  if (calculate_ce) {
    const result = _gagge_two_nodes_optimized_return_set(
      tdb,
      tr,
      v,
      met,
      clo,
      vapor_pressure,
      wme,
      body_surface_area,
      p_atm,
      1,
    );
    return Object.freeze({ set: result, warnings: Object.freeze(warnings) });
  }

  let _set,
    e_skin,
    e_rsw,
    e_max,
    q_sensible,
    q_skin,
    q_res,
    t_core,
    t_skin,
    m_bl,
    m_rsw,
    w,
    et,
    pmv_gagge,
    pmv_set,
    disc,
    t_sens;
  [
    _set,
    e_skin,
    e_rsw,
    e_max,
    q_sensible,
    q_skin,
    q_res,
    t_core,
    t_skin,
    m_bl,
    m_rsw,
    w,
    w_max,
    et,
    pmv_gagge,
    pmv_set,
    disc,
    t_sens,
  ] = _gagge_two_nodes_optimized(
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
    calculate_ce,
    max_skin_blood_flow,
    max_sweating,
    w_max,
  );

  const output = {
    e_skin: e_skin,
    e_rsw: e_rsw,
    e_max: e_max,
    q_sensible: q_sensible,
    q_skin: q_skin,
    q_res: q_res,
    t_core: t_core,
    t_skin: t_skin,
    m_bl: m_bl,
    m_rsw: m_rsw,
    w: w,
    w_max: w_max,
    set: _set,
    et: et,
    pmv_gagge: pmv_gagge,
    pmv_set: pmv_set,
    disc: disc,
    t_sens: t_sens,
  };

  if (round_output) {
    for (const key of Object.keys(output) as (keyof typeof output)[]) {
      output[key] = round(output[key], 2);
    }
  }

  return Object.freeze({ ...output, warnings: Object.freeze(warnings) });
}

export function _gagge_two_nodes_optimized(
  tdb: number,
  tr: number,
  v: number,
  met: number,
  clo: number,
  vapor_pressure: number,
  wme: number,
  body_surface_area: number,
  p_atm: number,
  position: string | number | null,
  calculate_ce = false,
  max_skin_blood_flow = 90,
  max_sweating = 500,
  w_max: number | null = null,
): readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
] {
  // Initial variables as defined in the ASHRAE 55-2020
  const air_speed = 0.1 > v ? 0.1 : v;
  const k_clo = 0.25;
  const body_weight = 70; // body weight in kg
  const met_factor = 58.2; // met conversion factor
  const sbc = 0.000000056697; // Stefan-Boltzmann constant (W/m2K4)
  const c_sw = 170; // driving coefficient for regulatory sweating
  const c_dil = 120; // driving coefficient for vasodilation ashrae says 50 see page 9.19
  const c_str = 0.5; // driving coefficient for vasoconstriction

  const temp_skin_neutral = 33.7;
  const temp_core_neutral = 36.8;
  let alfa = 0.1;
  const temp_body_neutral =
    alfa * temp_skin_neutral + (1 - alfa) * temp_core_neutral;
  const skin_blood_flow_neutral = 6.3;

  let t_skin = temp_skin_neutral;
  let t_core = temp_core_neutral;
  let m_bl = skin_blood_flow_neutral;

  // initialize some variables
  let e_skin = 0.1 * met; // total evaporative heat loss, W
  let q_sensible = 0; // total sensible heat loss, W
  let w = 0; // skin wettedness
  let _set = 0; // standard effective temperature
  let e_rsw = 0; // heat lost by vaporization sweat
  let e_diff = 0; // vapor diffusion through skin
  let e_max = 0; // maximum evaporative capacity
  let m_rsw = 0; // regulatory sweating
  let q_res = 0; // heat loss due to respiration
  let et = 0; // effective temperature
  let e_req = 0; // evaporative heat loss required for tmp regulation
  let r_ea = 0;
  let r_ecl = 0;
  let c_res = 0; // convective heat loss respiration

  const pressure_in_atmospheres = p_atm / 101325;
  const length_time_simulation = 60; // length time simulation
  let n_simulation = 1;

  const r_clo = 0.155 * clo; // thermal resistance of clothing, C M^2 /W
  const f_a_cl = 1.0 + 0.15 * clo; // increase in body surface area due to clothing
  const lr = 2.2 / pressure_in_atmospheres; // Lewis ratio
  const rm = (met - wme) * met_factor; // metabolic rate
  let m = met * met_factor; // metabolic rate

  let e_comfort = 0.42 * (rm - met_factor); // evaporative heat loss during comfort
  e_comfort = 0 > e_comfort ? 0 : e_comfort;

  let i_cl = 1.0; // permeation efficiency of water vapour naked skin
  if (clo > 0) {
    i_cl = 0.45; // permeation efficiency of water vapour through the clothing layer
  }

  if (w_max === null || w_max === 0) {
    // if the user did not pass a value of w_max
    w_max = 0.38 * Math.pow(air_speed, -0.29); // critical skin wettedness naked
    if (clo > 0) {
      w_max = 0.59 * Math.pow(air_speed, -0.08); // critical skin wettedness clothed
    }
  }

  // h_cc corrected convective heat transfer coefficient
  let h_cc = 3.0 * Math.pow(pressure_in_atmospheres, 0.53);
  // h_fc forced convective heat transfer coefficient, W/(m2 °C)
  const h_fc = 8.600001 * Math.pow(air_speed * pressure_in_atmospheres, 0.53);
  h_cc = h_fc > h_cc ? h_fc : h_cc;
  if (!calculate_ce && met > 0.85) {
    const h_c_met = 5.66 * Math.pow(met - 0.85, 0.39);
    h_cc = h_c_met > h_cc ? h_c_met : h_cc;
  }

  let h_r = 4.7; // linearized radiative heat transfer coefficient
  let h_t = h_r + h_cc; // sum of convective and radiant heat transfer coefficient W/(m2*K)
  let r_a = 1.0 / (f_a_cl * h_t); // resistance of air layer to dry heat
  let t_op = (h_r * tr + h_cc * tdb) / h_t; // operative temperature

  let t_body = alfa * t_skin + (1 - alfa) * t_core; // mean body temperature, °C

  // respiration
  q_res = 0.0023 * m * (44.0 - vapor_pressure); // latent heat loss due to respiration
  c_res = 0.0014 * m * (34.0 - tdb); // sensible convective heat loss respiration

  while (n_simulation < length_time_simulation) {
    n_simulation += 1;

    const iteration_limit = 150; // for following while loop
    // t_cl temperature of the outer surface of clothing
    let t_cl = (r_a * t_skin + r_clo * t_op) / (r_a + r_clo); // initial guess
    let n_iterations = 0;
    let tc_converged = false;

    while (!tc_converged) {
      // 0.95 is the clothing emissivity from ASHRAE fundamentals Ch. 9.7 Eq. 35
      if (position === Postures.sitting) {
        // 0.7 ratio between radiation area of the body and the body area
        h_r =
          4.0 * 0.95 * sbc * Math.pow((t_cl + tr) / 2.0 + 273.15, 3.0) * 0.7;
      } else {
        // if standing
        // 0.73 ratio between radiation area of the body and the body area
        h_r =
          4.0 * 0.95 * sbc * Math.pow((t_cl + tr) / 2.0 + 273.15, 3.0) * 0.73;
      }
      h_t = h_r + h_cc;
      r_a = 1.0 / (f_a_cl * h_t);
      t_op = (h_r * tr + h_cc * tdb) / h_t;
      const t_cl_new = (r_a * t_skin + r_clo * t_op) / (r_a + r_clo);
      if (Math.abs(t_cl_new - t_cl) <= 0.01) {
        tc_converged = true;
      }
      t_cl = t_cl_new;
      n_iterations += 1;

      if (n_iterations > iteration_limit) {
        const max_iteration_exceeded = "Max iterations exceeded";
        throw new Error(max_iteration_exceeded);
      }
    }

    q_sensible = (t_skin - t_op) / (r_a + r_clo); // total sensible heat loss, W
    // hf_cs rate of energy transport between core and skin, W
    // 5.28 is the average body tissue conductance in W/(m2 C)
    // 1.163 is the thermal capacity of blood in Wh/(L C)
    const hf_cs = (t_core - t_skin) * (5.28 + 1.163 * m_bl);
    const s_core = m - hf_cs - q_res - c_res - wme; // rate of energy storage in the core
    const s_skin = hf_cs - q_sensible - e_skin; // rate of energy storage in the skin
    const tc_sk = 0.97 * alfa * body_weight; // thermal capacity skin
    const tc_cr = 0.97 * (1 - alfa) * body_weight; // thermal capacity core
    const d_t_sk = (s_skin * body_surface_area) / (tc_sk * 60.0); // rate of change skin temperature °C per minute
    const d_t_cr = (s_core * body_surface_area) / (tc_cr * 60.0); // rate of change core temperature °C per minute
    t_skin = t_skin + d_t_sk;
    t_core = t_core + d_t_cr;
    t_body = alfa * t_skin + (1 - alfa) * t_core;
    // sk_sig thermoregulatory control signal from the skin
    const sk_sig = t_skin - temp_skin_neutral;
    const warm_sk = Number(sk_sig > 0) * sk_sig; // vasodilation signal
    const colds = Number(-1.0 * sk_sig > 0) * (-1.0 * sk_sig); // vasoconstriction signal
    // c_reg_sig thermoregulatory control signal from the core, °C
    const c_reg_sig = t_core - temp_core_neutral;
    // c_warm vasodilation signal
    const c_warm = Number(c_reg_sig > 0) * c_reg_sig;
    // c_cold vasoconstriction signal
    const c_cold = Number(-1.0 * c_reg_sig > 0) * (-1.0 * c_reg_sig);
    // bd_sig thermoregulatory control signal from the body
    const bd_sig = t_body - temp_body_neutral;
    const warm_b = Number(bd_sig > 0) * bd_sig;
    m_bl = (skin_blood_flow_neutral + c_dil * c_warm) / (1 + c_str * colds);
    m_bl = max_skin_blood_flow < m_bl ? max_skin_blood_flow : m_bl;
    m_bl = 0.5 > m_bl ? 0.5 : m_bl;
    m_rsw = c_sw * warm_b * Math.exp(warm_sk / 10.7); // regulatory sweating
    m_rsw = max_sweating < m_rsw ? max_sweating : m_rsw;
    e_rsw = 0.68 * m_rsw; // heat lost by vaporization sweat
    r_ea = 1.0 / (lr * f_a_cl * h_cc); // evaporative resistance air layer
    r_ecl = r_clo / (lr * i_cl);
    e_req = rm - q_res - c_res - q_sensible; // evaporative heat loss required for tmp regulation
    e_max =
      (Math.exp(18.6686 - 4030.183 / (t_skin + 235.0)) - vapor_pressure) /
      (r_ea + r_ecl);
    if (e_max === 0) {
      // added this otherwise e_rsw / e_max cannot be calculated
      e_max = 0.001;
    }
    let p_rsw = e_rsw / e_max; // ratio heat loss sweating to max heat loss sweating
    w = 0.06 + 0.94 * p_rsw; // skin wetness
    e_diff = w * e_max - e_rsw; // vapor diffusion through skin
    if (w > w_max) {
      w = w_max;
      // inverse of w = 0.06 + 0.94 * p_rsw, as in Gagge et al. (1986). The ASHRAE 55
      // code uses w_max / 0.94, which makes SET discontinuous at the cap (#489)
      p_rsw = (w_max - 0.06) / 0.94;
      e_rsw = p_rsw * e_max;
      e_diff = 0.06 * (1.0 - p_rsw) * e_max;
    }
    if (e_max < 0) {
      e_diff = 0;
      e_rsw = 0;
      w = w_max;
    }
    e_skin = e_rsw + e_diff; // total evaporative heat loss sweating and vapor diffusion
    m_rsw = e_rsw / 0.68; // back calculating the mass of regulatory sweating as a function of e_rsw
    const met_shivering = 19.4 * colds * c_cold; // met shivering W/m2
    m = rm + met_shivering;
    alfa = 0.0417737 + 0.7451833 / (m_bl + 0.585417);
  }

  const q_skin = q_sensible + e_skin; // total heat loss from skin, W
  // p_s_sk saturation vapour pressure of water of the skin
  const p_s_sk = Math.exp(18.6686 - 4030.183 / (t_skin + 235.0));

  // standard environment - where _s at end of the variable names stands for standard
  const h_r_s = h_r; // standard environment radiative heat transfer coefficient

  let h_c_s = 3.0 * Math.pow(pressure_in_atmospheres, 0.53);
  if (!calculate_ce && met > 0.85) {
    const h_c_met = 5.66 * Math.pow(met - 0.85, 0.39);
    h_c_s = h_c_met > h_c_s ? h_c_met : h_c_s;
  }
  h_c_s = 3.0 > h_c_s ? 3.0 : h_c_s;

  const h_t_s = h_c_s + h_r_s; // sum of convective and radiant heat transfer coefficient W/(m2*K)
  const r_clo_s = 1.52 / (met - wme / met_factor + 0.6944) - 0.1835; // thermal resistance of clothing, °C M^2 /W
  const r_cl_s = 0.155 * r_clo_s; // thermal insulation of the clothing in M2K/W
  const f_a_cl_s = 1.0 + k_clo * r_clo_s; // increase in body surface area due to clothing
  const f_cl_s = 1.0 / (1.0 + 0.155 * f_a_cl_s * h_t_s * r_clo_s); // ratio of surface clothed body over nude body
  const i_m_s = 0.45; // permeation efficiency of water vapour through the clothing layer
  const i_cl_s =
    (((i_m_s * h_c_s) / h_t_s) * (1 - f_cl_s)) /
    (h_c_s / h_t_s - f_cl_s * i_m_s); // clothing vapor permeation efficiency
  const r_a_s = 1.0 / (f_a_cl_s * h_t_s); // resistance of air layer to dry heat
  const r_ea_s = 1.0 / (lr * f_a_cl_s * h_c_s);
  const r_ecl_s = r_cl_s / (lr * i_cl_s);
  const h_d_s = 1.0 / (r_a_s + r_cl_s);
  const h_e_s = 1.0 / (r_ea_s + r_ecl_s);

  // calculate Standard Effective Temperature (SET)
  let delta = 0.0001;
  let dx = 100.0;
  let set_old = round(t_skin - q_skin / h_d_s, 2);
  while (Math.abs(dx) > 0.01) {
    const err_1 =
      q_skin -
      h_d_s * (t_skin - set_old) -
      w *
        h_e_s *
        (p_s_sk - 0.5 * Math.exp(18.6686 - 4030.183 / (set_old + 235.0)));
    const err_2 =
      q_skin -
      h_d_s * (t_skin - (set_old + delta)) -
      w *
        h_e_s *
        (p_s_sk -
          0.5 * Math.exp(18.6686 - 4030.183 / (set_old + delta + 235.0)));
    _set = set_old - (delta * err_1) / (err_2 - err_1);
    dx = _set - set_old;
    set_old = _set;
  }

  // calculate Effective Temperature (ET)
  const h_d = 1 / (r_a + r_clo);
  const h_e = 1 / (r_ea + r_ecl);
  let et_old = t_skin - q_skin / h_d;
  delta = 0.0001;
  dx = 100.0;
  while (Math.abs(dx) > 0.01) {
    const err_1 =
      q_skin -
      h_d * (t_skin - et_old) -
      w *
        h_e *
        (p_s_sk - 0.5 * Math.exp(18.6686 - 4030.183 / (et_old + 235.0)));
    const err_2 =
      q_skin -
      h_d * (t_skin - (et_old + delta)) -
      w *
        h_e *
        (p_s_sk -
          0.5 * Math.exp(18.6686 - 4030.183 / (et_old + delta + 235.0)));
    et = et_old - (delta * err_1) / (err_2 - err_1);
    dx = et - et_old;
    et_old = et;
  }

  const tbm_l = (0.194 / met_to_w_m2) * rm + 36.301; // lower limit for evaporative regulation
  const tbm_h = (0.347 / met_to_w_m2) * rm + 36.669; // upper limit for evaporative regulation

  let t_sens = 0.4685 * (t_body - tbm_l); // predicted thermal sensation
  if (t_body >= tbm_l && t_body < tbm_h) {
    t_sens = (w_max * 4.7 * (t_body - tbm_l)) / (tbm_h - tbm_l);
  } else if (t_body >= tbm_h) {
    t_sens = w_max * 4.7 + 0.4685 * (t_body - tbm_h);
  }

  let disc: number;
  if (t_sens > 0 && 0 > e_max * w_max - e_comfort - e_diff) {
    disc = 6.0;
  } else {
    disc = (4.7 * (e_rsw - e_comfort)) / (e_max * w_max - e_comfort - e_diff); // predicted thermal discomfort
  }
  if (disc <= 0) {
    disc = t_sens;
  }
  if (disc > 6) {
    disc = 6.0;
  }

  // PMV Gagge
  const pmv_gagge =
    (0.303 * Math.exp(-0.036 * m) + 0.028) * (e_req - e_comfort - e_diff);

  // PMV SET
  const dry_set = h_d_s * (t_skin - _set);
  const e_req_set = rm - c_res - q_res - dry_set;
  const pmv_set =
    (0.303 * Math.exp(-0.036 * m) + 0.028) * (e_req_set - e_comfort - e_diff);

  // Predicted  Percent  Satisfied  With  the  Level  of  Air  Movement
  // ps = 100 * (1.13 * (t_op**0.5) - 0.24 * t_op + 2.7 * (v**0.5) - 0.99 * v)

  return [
    _set,
    e_skin,
    e_rsw,
    e_max,
    q_sensible,
    q_skin,
    q_res,
    t_core,
    t_skin,
    m_bl,
    m_rsw,
    w,
    w_max,
    et,
    pmv_gagge,
    pmv_set,
    disc,
    t_sens,
  ];
}

function _gagge_two_nodes_optimized_return_set(
  tdb: number,
  tr: number,
  v: number,
  met: number,
  clo: number,
  vapor_pressure: number,
  wme: number,
  body_surface_area: number,
  p_atm: number,
  position: number,
): number {
  return _gagge_two_nodes_optimized(
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
    true,
  )[0];
}
