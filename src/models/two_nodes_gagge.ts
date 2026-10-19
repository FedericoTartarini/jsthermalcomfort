import { p_sat_torr } from "../psychrometrics/p_sat_torr.js";
import { met_to_w_m2, round, validateInputs } from "../utilities/utilities.js";
import { _check_params_object } from "../_internal/validation.ts";

// Renamed from TwoNodesReturnType to <Model>Result, the name every converted
// model's result has. A type alias, as the JSDoc typedef it replaces emitted,
// so the result stays assignable to Record<string, unknown>.
//
// m_rsw is in [mL/h/m2], as upstream's GaggeTwoNodes documents it
// (pythermalcomfort/classes_return.py:523 at v4.6.2); the JSDoc said
// [kg/h/m2].
/**
 * @typedef {Object} TwoNodesGaggeResult
 * @property {number} e_skin – Total rate of evaporative heat loss from skin, [W/m2]. Equal to e_rsw + e_diff
 * @property {number} e_rsw  – Rate of evaporative heat loss from sweat evaporation, [W/m2]
 * @property {number} e_max  – Maximum rate of evaporative heat loss from skin, [W/m2]
 * @property {number} q_sensible  – Sensible heat loss from skin, [W/m2]
 * @property {number} q_skin  – Total rate of heat loss from skin, [W/m2]. Equal to q_sensible + e_skin
 * @property {number} q_res  – Total rate of heat loss through respiration, [W/m2]
 * @property {number} t_core  – Core temperature, [°C]
 * @property {number} t_skin  – Skin temperature, [°C]
 * @property {number} m_bl  – Skin blood flow, [kg/h/m2]
 * @property {number} m_rsw  – Rate at which regulatory sweat is generated, [mL/h/m2]
 * @property {number} w  – Skin wettedness, adimensional. Ranges from 0 and 1.
 * @property {number} w_max  – Skin wettedness (w) practical upper limit, adimensional. Ranges from 0 and 1.
 * @property {number} set  – Standard Effective Temperature (SET)
 * @property {number} et  – New Effective Temperature (ET)
 * @property {number} pmv_gagge  – PMV Gagge
 * @property {number} pmv_set  – PMV SET
 * @property {number} disc  – Thermal discomfort
 * @property {number} t_sens  – Predicted Thermal Sensation
 * @public
 */
export type TwoNodesGaggeResult = {
  e_skin: number;
  e_rsw: number;
  e_max: number;
  q_sensible: number;
  q_skin: number;
  q_res: number;
  t_core: number;
  t_skin: number;
  m_bl: number;
  m_rsw: number;
  w: number;
  w_max: number;
  set: number;
  et: number;
  pmv_gagge: number;
  pmv_set: number;
  disc: number;
  t_sens: number;
};

/**
 * What `two_nodes_gagge` returns with `calculate_ce`: the SET alone, as
 * upstream's `SET` (`pythermalcomfort/classes_return.py:467-477` at v4.6.2).
 */
export type TwoNodesGaggeSetResult = {
  set: number;
};

/**
 * The params of `two_nodes_gagge`: upstream's keyword parameters, quantities
 * and switches alike, with upstream's defaults (ADR 0002). Documented on the
 * function's `params`.
 */
export interface TwoNodesGaggeParams {
  tdb: number;
  tr: number;
  v: number;
  rh: number;
  met: number;
  clo: number;
  wme?: number;
  body_surface_area?: number;
  p_atm?: number;
  // ADR 0007: upstream's lowercase spellings. Untyped JavaScript may pass
  // them in any case, as upstream accepts.
  position?: "sitting" | "standing" | "standing, forced convection";
  max_skin_blood_flow?: number;
  round_output?: boolean;
  max_sweating?: number;
  // false is upstream's default, meaning "not given"; so is null, which
  // upstream accepts as None.
  w_max?: number | false | null;
  calculate_ce?: boolean;
}

// The JSDoc below follows upstream's docstring
// (pythermalcomfort/models/two_nodes_gagge.py:31-80 at v4.6.2) where the
// previous one differed from it: DISC's top category is (5), not (S); met
// and wme are in [met], not [W/(m2)]; and the "in [°F] / [ft2] / [atm] if
// units = 'IP'" clauses are gone, as this function has no `units`.
//
// max_sweating is documented in [mL/h/m2], where upstream's docstring says
// [kg/h/m2] (two_nodes_gagge.py:77-78): the kernel caps m_rsw at it,
// `m_rsw = min(m_rsw, max_sweating)` (:388), so the two share a unit, and
// upstream documents m_rsw in [mL/h/m2] (classes_return.py:523).
/**
 *
 * Two-node model of human temperature regulation Gagge et al. (1986).
 *
 * {@link #ref_10|[10]} This model can be used to calculate a variety of indices, including:
 *
 *  - Gagge’s version of Fanger’s Predicted Mean Vote (PMV). This function uses
 * the Fanger’s PMV equations but it replaces the heat loss and gain terms
 * with those calculated by the two node model developed by Gagge et al. (1986) {@link #ref_10|[10]}.
 *  - PMV SET and the predicted thermal sensation based on SET {@link #ref_10|[10]}. This function is
 * similar in all aspects to the pythermalcomfort.models.pmv_gagge(). However, it uses the
 * pythermalcomfort.models.set() equation to calculate the dry heat loss by convection.
 *  - Thermal discomfort (DISC) as the relative thermoregulatory strain necessary
 * to restore a state of comfort and thermal equilibrium by sweating {@link #ref_10|[10]}. DISC is
 * described numerically as: comfortable and pleasant (0), slightly uncomfortable but acceptable (1),
 * uncomfortable and unpleasant (2), very uncomfortable (3), limited tolerance (4), and intolerable (5).
 * The range of each category is ± 0.5 numerically. In the cold, the classical negative category
 * descriptions used for Fanger’s PMV apply {@link #ref_10|[10]}.
 *  - Heat gains and losses via convection, radiation and conduction.
 *  - The Standard Effective Temperature (SET)
 *  - The New Effective Temperature (ET)
 *  - The Predicted Thermal Sensation (TSENS)
 *  - The Predicted Percent Dissatisfied Due to Draft (PD)
 *  - Predicted Percent Satisfied With the Level of Air Movement” (PS)
 *
 * @public
 * @memberof models
 * @docname Gagge et al. two-node model
 *
 *
 * @param {Object} params - the model's parameters, named as in pythermalcomfort.
 * @param {number} params.tdb Dry bulb air temperature, [°C].
 * @param {number} params.tr Mean radiant temperature, [°C].
 * @param {number} params.v Air speed, [m/s].
 * @param {number} params.rh Relative humidity, [%].
 * @param {number} params.met Metabolic rate, [met].
 * @param {number} params.clo Clothing insulation, [clo].
 * @param {number} [params.wme=0] External work, [met]. Defaults to 0.
 * @param {number} [params.body_surface_area=1.8258] Body surface area, default value 1.8258 [m2]. Defaults to 1.8258.
 * @param {number} [params.p_atm=101325] Atmospheric pressure, default value 101325 [Pa]. Defaults to 101325.
 * @param {"sitting" | "standing" | "standing, forced convection"} [params.position="standing"] Select either "sitting" or "standing". Defaults to "standing".
 * @param {number} [params.max_skin_blood_flow=90] Maximum blood flow from the core to the skin, [kg/h/m2]. Defaults to 90.
 * @param {boolean} [params.round_output=true] If True, rounds output value. If False, it does not round it. Defaults to True.
 * @param {number} [params.max_sweating=500] Maximum rate at which regulatory sweat is generated, [mL/h/m2]. Defaults to 500.
 * @param {number | false} [params.w_max=false] Maximum skin wettedness (w) adimensional. Ranges from 0 and 1. Defaults to False.
 * @param {boolean} [params.calculate_ce=false] select if SET is used to calculate Cooling Effect
 *
 * @returns {TwoNodesGaggeResult | {set: number}} object with results of two_nodes_gagge; with `calculate_ce`, the unrounded SET alone
 *
 * @example
 * const results = two_nodes_gagge({ tdb: 25, tr: 25, v: 0.3, rh: 50, met: 1.2, clo: 0.5 });
 * console.log(results); // {
  e_skin: 16.17,
  e_rsw: 7,
  e_max: 159.87,
  q_sensible: 47.61,
  q_skin: 63.79,
  q_res: 5.16,
  t_core: 36.86,
  t_skin: 33.71,
  m_bl: 12.92,
  m_rsw: 10.3,
  w: 0.1,
  w_max: 0.65,
  set: 23.56,
  et: 25,
  pmv_gagge: 0.11,
  pmv_set: -0.01,
  disc: 0.11,
  t_sens: 0.09
}
 *
 */
// A non-finite number throws a TypeError here, where upstream lets it reach
// the kernel (ADR 0001, reason three). position is declared here and checked
// below with upstream's message; w_max is checked as a number unless it is
// upstream's "not given" false or None; calculate_ce is declared and not
// validated, as upstream's GaggeTwoNodesInputs is not given it
// (two_nodes_gagge.py:102-117).
const TWO_NODES_GAGGE_SCHEMA = {
  tdb: { type: "number" },
  tr: { type: "number" },
  v: { type: "number" },
  rh: { type: "number" },
  met: { type: "number" },
  clo: { type: "number" },
  wme: { type: "number" },
  body_surface_area: { type: "number" },
  p_atm: { type: "number" },
  position: {},
  max_skin_blood_flow: { type: "number" },
  round_output: { type: "boolean" },
  max_sweating: { type: "number" },
  w_max: { type: "number", required: false },
  calculate_ce: {},
};

// Upstream's allowed `position` values (pythermalcomfort/classes_input.py:71-73
// at v4.6.2), compared lower-cased as its `_validate_str_values` compares them
// (:180-183).
const _POSITIONS = ["sitting", "standing", "standing, forced convection"];

export function two_nodes_gagge(
  params: TwoNodesGaggeParams & { calculate_ce: true },
): TwoNodesGaggeSetResult;
export function two_nodes_gagge(
  params: TwoNodesGaggeParams & { calculate_ce?: false },
): TwoNodesGaggeResult;
export function two_nodes_gagge(
  params: TwoNodesGaggeParams,
): TwoNodesGaggeResult | TwoNodesGaggeSetResult;
export function two_nodes_gagge(
  params: TwoNodesGaggeParams,
): TwoNodesGaggeResult | TwoNodesGaggeSetResult {
  // Every argument was positional before v2 (ADR 0002); a call still written
  // that way fails here, naming the shape it should have. So does an unknown
  // key (ADR 0008).
  _check_params_object(params, "two_nodes_gagge", TWO_NODES_GAGGE_SCHEMA);
  const { tdb, tr, v, rh, met, clo } = params;
  // Destructuring defaults also apply to a default passed as undefined.
  const {
    wme = 0,
    body_surface_area = 1.8258,
    p_atm = 101325,
    position = "standing",
    max_skin_blood_flow = 90,
    round_output = true,
    max_sweating = 500,
    w_max = false,
    calculate_ce = false,
  } = params;
  validateInputs(
    {
      tdb,
      tr,
      v,
      rh,
      met,
      clo,
      wme,
      body_surface_area,
      p_atm,
      max_skin_blood_flow,
      round_output,
      max_sweating,
      // Upstream skips a None and its kernel reads False as "not given".
      w_max: w_max === false || w_max === null ? undefined : w_max,
    },
    TWO_NODES_GAGGE_SCHEMA,
  );
  // Upstream skips a None position, which then computes as standing.
  if (
    position !== null &&
    !_POSITIONS.includes(String(position).toLowerCase())
  ) {
    throw new Error(
      "position must be one of ['sitting', 'standing', 'standing, forced convection']",
    );
  }

  const vapor_pressure = (rh * p_sat_torr(tdb)) / 100;

  if (calculate_ce) {
    // As upstream's _gagge_two_nodes_optimized_return_set
    // (two_nodes_gagge.py:130-143, :581-605): standing (it passes position 1,
    // which is not "sitting"), the kernel's own max_skin_blood_flow,
    // max_sweating and w_max, and the SET unrounded.
    const result = _gagge_two_nodes_optimized(
      tdb,
      tr,
      v,
      met,
      clo,
      vapor_pressure,
      wme,
      body_surface_area,
      p_atm,
      "standing",
      true,
    );
    return { set: result.set };
  }

  const output = _gagge_two_nodes_optimized(
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
    false,
    max_skin_blood_flow,
    max_sweating,
    w_max,
  );

  if (round_output) {
    // np.around(x, 2) (two_nodes_gagge.py:202-204): round is half to even.
    for (const key of Object.keys(output) as (keyof TwoNodesGaggeResult)[]) {
      output[key] = round(output[key], 2);
    }
  }
  return output;
}

// Upstream's _gagge_two_nodes_optimized (two_nodes_gagge.py:209-561),
// transcribed in its order of operations (ADR 0009). numba lowers a float
// x ** y or pow(x, y) to LLVM's pow intrinsic, not to multiplications
// (numba/cpython/numbers.py:832-841, numba 0.68.0), so it is Math.pow here;
// Math.pow(x, 3.0) equalled Python's math.pow on all 100,000 arguments tried
// in h_r's range. Math.exp differs from Python's math.exp by an ulp on about
// one argument in ten of the kernel's 18.6686 - 4030.183 / (t + 235) range
// (9,651 of 100,000), and that difference reaches the unrounded outputs: up
// to 3.7e-12 from upstream 4.6.2 over 4,026 cases, none of them rounded
// differently.
function _gagge_two_nodes_optimized(
  tdb: number,
  tr: number,
  v: number,
  met: number,
  clo: number,
  vapor_pressure: number,
  wme: number,
  body_surface_area: number,
  p_atm: number,
  position: string | null,
  calculate_ce = false,
  max_skin_blood_flow = 90,
  max_sweating = 500,
  w_max: number | false | null = null,
): TwoNodesGaggeResult {
  // Initial variables as defined in the ASHRAE 55-2020
  const air_speed = Math.max(v, 0.1);
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
  e_comfort = Math.max(e_comfort, 0);

  let i_cl = 1.0; // permeation efficiency of water vapour naked skin
  if (clo > 0) {
    i_cl = 0.45; // permeation efficiency of water vapour through the clothing layer
  }

  if (!w_max) {
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
  h_cc = Math.max(h_cc, h_fc);
  if (!calculate_ce && met > 0.85) {
    const h_c_met = 5.66 * Math.pow(met - 0.85, 0.39);
    h_cc = Math.max(h_cc, h_c_met);
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
      if (position === "sitting") {
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
        // Upstream raises StopIteration, a Python class with no JavaScript
        // counterpart; ADR 0012 maps no class to it, so it stays an Error.
        throw new Error("Max iterations exceeded");
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
    // Upstream multiplies by the comparison, (sk_sig > 0) * sk_sig.
    const warm_sk = Number(sk_sig > 0) * sk_sig; // vasodilation signal
    const colds = Number(-1.0 * sk_sig > 0) * (-1.0 * sk_sig); // vasoconstriction signal
    // c_reg_sig thermoregulatory control signal from the skin, °C
    const c_reg_sig = t_core - temp_core_neutral;
    // c_warm vasodilation signal
    const c_warm = Number(c_reg_sig > 0) * c_reg_sig;
    // c_cold vasoconstriction signal
    const c_cold = Number(-1.0 * c_reg_sig > 0) * (-1.0 * c_reg_sig);
    // bd_sig thermoregulatory control signal from the body
    const bd_sig = t_body - temp_body_neutral;
    const warm_b = Number(bd_sig > 0) * bd_sig;
    m_bl = (skin_blood_flow_neutral + c_dil * c_warm) / (1 + c_str * colds);
    m_bl = Math.min(m_bl, max_skin_blood_flow);
    m_bl = Math.max(m_bl, 0.5);
    m_rsw = c_sw * warm_b * Math.exp(warm_sk / 10.7); // regulatory sweating
    m_rsw = Math.min(m_rsw, max_sweating);
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
      p_rsw = w_max / 0.94;
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
    h_c_s = Math.max(h_c_s, h_c_met);
  }
  h_c_s = Math.max(h_c_s, 3.0);

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
  // Python's round(x, 2) under numba is rint(x * 100) / 100
  // (numba/cpython/builtins.py:262-280, numba 0.68.0); round is that rint,
  // half to even.
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

  let disc;
  // Upstream's chained t_sens > 0 > e_max * w_max - e_comfort - e_diff.
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

  return {
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
    set: _set,
    et,
    pmv_gagge,
    pmv_set,
    disc,
    t_sens,
  };
}
