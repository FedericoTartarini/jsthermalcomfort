import { BASE_INPUTS_POSITION, parseInputs } from "../_internal/define.ts";
import { buildOutputs, deepFreeze } from "../_internal/modelInfo.ts";
import type {
  InputsOf,
  ModelInfo,
  ModelWarning,
  OutputsOf,
} from "../_internal/modelInfo.ts";
import { Postures } from "../utilities/options.ts";

const _POSITION_SITTING = 0;
const _POSITION_STANDING = 1;

export const TWO_NODES_GAGGE_JI_INFO = deepFreeze({
  name: "two_nodes_gagge_ji",
  label: "Gagge-Ji two-node model",
  standards: [],
  inputs: {
    tdb: { kind: "numeric", unit: "°C" },
    tr: { kind: "numeric", unit: "°C" },
    v: { kind: "numeric", unit: "m/s" },
    met: { kind: "numeric", unit: "met" },
    clo: { kind: "numeric", unit: "clo" },
    vapor_pressure: { kind: "numeric", unit: "torr" },
    wme: { kind: "numeric", unit: "met", default: 0 },
    body_surface_area: { kind: "numeric", unit: "m²", default: 1.8258 },
    p_atm: { kind: "numeric", unit: "Pa", default: 101325 },
    position: { ...BASE_INPUTS_POSITION, default: Postures.sitting },
    body_weight: { kind: "numeric", unit: "kg", default: 70 },
    length_time_simulation: { kind: "numeric", unit: "min", default: 120 },
    initial_skin_temp: { kind: "numeric", unit: "°C", default: 36.8 },
    initial_core_temp: { kind: "numeric", unit: "°C", default: 36.49 },
    acclimatized: { kind: "bool", default: true },
  },
  outputs: {
    t_core: { kind: "numeric", unit: "°C", series: true },
    t_skin: { kind: "numeric", unit: "°C", series: true },
  },
} as const satisfies ModelInfo);

/** @interface */
export type GaggeTwoNodesJiInputs = InputsOf<typeof TWO_NODES_GAGGE_JI_INFO>;

/**
 * Dataclass to represent the results of the Gagge-Ji model of human temperature.
 *
 * @interface
 */
export type GaggeTwoNodesJi = OutputsOf<typeof TWO_NODES_GAGGE_JI_INFO>;

/**
 * Two-node model for older people under hot and cold exposures proposed by Ji et
 * al. [Ji2022](../../docs/references.md#ji2022).
 *
 * @param inputs
 * @param inputs.tdb - Dry bulb air temperature, [°C].
 * @param inputs.tr - Mean radiant temperature, [°C].
 * @param inputs.v - Air speed, [m/s].
 * @param inputs.met - Metabolic rate, [met].
 * @param inputs.clo - Clothing insulation, [clo].
 * @param inputs.vapor_pressure - Vapor pressure, [torr].
 *
 * > [!NOTE]
 * > Vapor pressure can be calculated using the relative humidity and the saturation
 * > vapor pressure, which can be computed using the function
 * > `p_sat_torr`.
 * @param inputs.wme - External work, [met]. Defaults to 0.
 * @param inputs.body_surface_area - Body surface area, [m2]. Defaults to 1.8258.
 *
 * > [!NOTE]
 * > Body surface area can be calculated with weight and height using the function
 * > `body_surface_area`.
 * @param inputs.p_atm - Atmospheric pressure, [Pa]. Defaults to 101325.
 * @param inputs.position - Select either "sitting" or "standing". Defaults to "sitting".
 * @param inputs.body_weight - Body weight, [kg]. Defaults to 70 kg.
 * @param inputs.length_time_simulation - Length of the simulation, [minutes]. Defaults to 120 minutes.
 * @param inputs.initial_skin_temp - Initial skin temperature, [°C]. Defaults to 36.8 °C.
 * @param inputs.initial_core_temp - Initial core temperature, [°C]. Defaults to 36.49 °C.
 * @param inputs.acclimatized - If True, the model assumes the person is acclimatized to heat. Defaults to True.
 *
 * @returns A dataclass containing the simulated core and skin temperatures over time. See {@link GaggeTwoNodesJi} for more details.
 * To access the individual attributes, use the corresponding attribute of the returned
 * instance, e.g. `result.t_core` or `result.t_skin`.
 *
 * - `t_core` - Core temperature, [°C].
 * - `t_skin` - Skin temperature, [°C].
 *
 * @example
 * ```ts
 * import { two_nodes_gagge_ji } from "jsthermalcomfort/models";
 * import { body_surface_area } from "jsthermalcomfort/utilities";
 * import { p_sat_torr } from "jsthermalcomfort/psychrometrics";
 *
 * const rh = 20;
 * const vapor_pressure = (rh * p_sat_torr(36.5)) / 100;
 *
 * const result = two_nodes_gagge_ji({
 *   tdb: 36.5,
 *   tr: 36.5,
 *   v: 0.25,
 *   met: 0.95,
 *   clo: 0.1,
 *   vapor_pressure: vapor_pressure,
 *   wme: 0,
 *   body_surface_area: body_surface_area(80.1, 1.8),
 *   p_atm: 101325,
 *   position: "sitting",
 *   acclimatized: true,
 *   body_weight: 80.1,
 *   length_time_simulation: 120,
 * });
 * ```
 */
export function two_nodes_gagge_ji(
  inputs: GaggeTwoNodesJiInputs,
): GaggeTwoNodesJi {
  // Validate inputs
  const {
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
  } = parseInputs(TWO_NODES_GAGGE_JI_INFO, inputs);

  const position_code =
    position === Postures.sitting ? _POSITION_SITTING : _POSITION_STANDING;
  const simulation_steps = Math.max(0, Math.ceil(length_time_simulation));

  const [t_core, t_skin] = _two_nodes_ji_optimized_scalar(
    tdb,
    tr,
    v,
    met,
    clo,
    vapor_pressure,
    wme,
    body_surface_area,
    p_atm,
    position_code,
    acclimatized,
    body_weight,
    simulation_steps,
    initial_skin_temp,
    initial_core_temp,
  );

  const warnings: ModelWarning[] = [];
  return buildOutputs(TWO_NODES_GAGGE_JI_INFO, { t_core, t_skin }, warnings);
}

/**
 * Run one stateful Gagge-Ji simulation in compiled code.
 *
 * Returns one core-temperature array and one skin-temperature array, each with
 * `length_time_simulation` values.
 */
function _two_nodes_ji_optimized_scalar(
  tdb: number,
  tr: number,
  v: number,
  met: number,
  clo: number,
  vapor_pressure: number,
  wme: number,
  body_surface_area: number,
  p_atm: number,
  position_code: number,
  acclimatized: boolean,
  body_weight: number,
  length_time_simulation: number,
  initial_skin_temp: number,
  initial_core_temp: number,
): [number[], number[]] {
  // Initial variables as defined in the ASHRAE 55-2020
  const air_speed = 0.1 > v ? 0.1 : v;
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
  // Taken from Ji, 2022
  const t_cr0_dil = 37.3; // vasodilation threshold
  const t_sk0_cons = 33.25; // vasoconstriction threshold
  const t_cr0_sw = 37; // core sweating threshold
  const t_sk0_sw = 34.3; // skin sweating threshold
  const t_cr0_sh = 36.7; // shivering threshold

  let alfa = 0.1;
  const skin_blood_flow_neutral = 6.3; // as defined by Ji, 2021

  let t_skin = initial_skin_temp;
  let t_core = initial_core_temp;
  let m_bl = skin_blood_flow_neutral;

  // initialize some variables
  let e_skin = 0.1 * met; // total evaporative heat loss, W
  let w = 0.06; // skin wettedness

  const pressure_in_atmospheres = p_atm / 101325;
  const r_clo = 0.155 * clo; // thermal resistance of clothing, K*m2/W
  // increase in body surface area due to clothing
  const f_a_cl = clo < 0.5 ? 1.0 + 0.2 * clo : 1.05 + 0.1 * clo;
  // numba raises ZeroDivisionError at a zero divisor (deviation two_nodes_gagge_ji-4).
  if (pressure_in_atmospheres === 0) throw new RangeError("division by zero");
  const lr = 2.2 / pressure_in_atmospheres; // Lewis relation
  let m = met * met_factor; // metabolic rate in W/m2

  let i_cl = 1.0; // permeation efficiency of water vapor naked skin
  if (clo > 0) {
    i_cl = 0.45; // permeation efficiency of water vapor through the clothing layer
  }

  // Set w_max and the max sweating rate, taken from emails with Dr Laouadi
  let w_max = 0.85;
  if (acclimatized) {
    evap_sweating_reg_max = 1.25 * evap_sweating_reg_max;
    w_max = 1;
  }
  let m_rsw_max = evap_sweating_reg_max / 0.68;
  m_rsw_max = m_rsw_max * max_sweating_rate_factor;

  if (!w_max) {
    // if w_max was not set above
    // W_max should be fixed to either 0.85 or 1 (for acclimatized people);  See ISO PHS model and other related standard
    w_max = 1;
  }

  // Heat transfer coefficients
  let h_cc = 3; // initial value - convective heat transfer coefficient
  let h_r = 4.7; // initial value - linearized radiative heat transfer coefficient

  const skin_temp_hist: number[] = [];
  const core_temp_hist: number[] = [];

  for (
    let n_simulation = 0;
    n_simulation < length_time_simulation;
    n_simulation++
  ) {
    const iteration_limit = 150; // for following while loop

    let h_t = h_r + h_cc; // sum of convective and radiant heat transfer coefficient W/(m2*K)
    if (f_a_cl * h_t === 0) throw new RangeError("division by zero");
    let r_a = 1.0 / (f_a_cl * h_t); // resistance of air layer to dry heat
    let t_op = (h_r * tr + h_cc * tdb) / h_t; // operative temperature

    // t_cl temperature of the outer surface of clothing
    if (r_a + r_clo === 0) throw new RangeError("division by zero");
    let t_cl = (r_a * t_skin + r_clo * t_op) / (r_a + r_clo); // initial guess
    let n_iterations = 0;
    let tc_converged = false;

    while (!tc_converged) {
      if (position_code === _POSITION_SITTING) {
        // 0.7 ratio between radiation area of the body and the body area
        h_r =
          4.0 * 0.97 * sbc * Math.pow((t_cl + tr) / 2.0 + 273.15, 3.0) * 0.7;
      } else {
        // if standing
        // 0.77 ratio between radiation area of the body and the body area
        h_r =
          4.0 * 0.97 * sbc * Math.pow((t_cl + tr) / 2.0 + 273.15, 3.0) * 0.77;
      }
      h_t = h_r + h_cc;
      if (f_a_cl * h_t === 0) throw new RangeError("division by zero");
      r_a = 1.0 / (f_a_cl * h_t);
      t_op = (h_r * tr + h_cc * tdb) / h_t;
      if (r_a + r_clo === 0) throw new RangeError("division by zero");
      const t_cl_new = (r_a * t_skin + r_clo * t_op) / (r_a + r_clo);
      if (Math.abs(t_cl_new - t_cl) < 0.01) {
        tc_converged = true;
      }
      t_cl = t_cl_new;
      n_iterations += 1;

      if (n_iterations > iteration_limit) {
        throw new Error("Max iterations exceeded");
      }
    }

    // Convective heat transfer coefficient based on clothing
    const d_tcl_air = t_cl - tdb; // difference between clothing and air temperature
    if (air_speed < 0.2) {
      // Free convection. Gao et al 2019: Formulation of human body heat transfer coefficient...
      if (d_tcl_air > 0) {
        // Upward flow
        h_cc = 2.5 * Math.pow(d_tcl_air, 0.16);
      } else {
        // Downward flow
        h_cc = 2.5 * Math.pow(Math.abs(d_tcl_air), 0.41);
      }
    } else {
      // Forced convection
      // Original formula from SET code
      h_cc = 8.6 * Math.pow(air_speed, 0.53);
    }

    const q_sensible = (t_skin - t_op) / (r_a + r_clo); // total sensible heat loss, W

    // respiration
    const q_res = 0.0023 * m * (44.0 - vapor_pressure); // latent heat loss due to respiration
    const c_res = 0.0014 * m * (34.0 - tdb); // sensible convective heat loss respiration

    // hf_cs rate of energy transport between core and skin, W
    // 5.28 is the average body tissue conductance in W/(m2 C)
    // 1.163 is the thermal capacity of blood in Wh/(L C)
    const hf_cs = (t_core - t_skin) * (5.28 + 1.163 * m_bl);
    const s_core = m - hf_cs - q_res - c_res - wme; // rate of energy storage in the core
    const s_skin = hf_cs - q_sensible - e_skin; // rate of energy storage in the skin
    const tc_sk = 0.97 * alfa * body_weight; // thermal capacity skin
    const tc_cr = 0.97 * (1 - alfa) * body_weight; // thermal capacity core
    if (tc_sk * 60.0 === 0) throw new RangeError("division by zero");
    const d_t_sk = (s_skin * body_surface_area) / (tc_sk * 60.0); // rate of change skin temperature °C per minute
    if (tc_cr * 60.0 === 0) throw new RangeError("division by zero");
    const d_t_cr = (s_core * body_surface_area) / (tc_cr * 60.0); // rate of change core temperature °C per minute
    t_skin = t_skin + d_t_sk;
    t_core = t_core + d_t_cr;

    //
    // Main equations used in Ji, 2022
    //

    // Calculate skin blood flow (SBF)
    const t_cr_dil = t_core - t_cr0_dil > 0 ? t_core - t_cr0_dil : 0; // dilation trigger
    const t_sk_cons = t_sk0_cons - t_skin > 0 ? t_sk0_cons - t_skin : 0; // constriction trigger
    m_bl =
      (skin_blood_flow_neutral + c_de * c_dil * t_cr_dil) /
      (1 + c_ce * c_str * t_sk_cons); // sbf
    // Set min/max skin blood flow values
    m_bl = m_bl < max_skin_blood_flow ? m_bl : max_skin_blood_flow;
    m_bl = m_bl > min_skin_blood_flow ? m_bl : min_skin_blood_flow;

    // Calculate sweat triggers
    const t_sk_sw = t_skin - t_sk0_sw > 0 ? t_skin - t_sk0_sw : 0;
    const t_cr_sw = t_core - t_cr0_sw > 0 ? t_core - t_cr0_sw : 0;

    // Update alfa (for next cycle)
    alfa = 0.0417737 + 0.7451832 / (m_bl + 0.5854417);

    // Sweat rate (SWR) - accounting for the metabolic rate
    let m_rsw =
      c_swe *
      c_sw *
      ((1 - alfa) * t_cr_sw + (alfa + a_cof) * t_sk_sw) *
      Math.exp(t_sk_sw / 10.7);
    // Apply max sweating rate
    m_rsw = m_rsw_max < m_rsw ? m_rsw_max : m_rsw;
    // Energy lost via evaporation
    let e_rsw = 0.68 * m_rsw; // heat lost by vaporization sweat

    const r_e_cl = r_clo / (lr * i_cl); // evaporative resistance of clothing in K*m2*atm/W
    if (lr * f_a_cl * h_cc === 0) throw new RangeError("division by zero");
    const r_e_a = 1 / (lr * f_a_cl * h_cc); // evaporative resistance of air layer in K*m2*atm/W
    const r_total = r_e_cl + r_e_a; // total evaporative resistance in K*m2*atm/W

    if (t_skin + 235.0 === 0) throw new RangeError("division by zero");
    if (r_total === 0) throw new RangeError("division by zero");
    const e_max =
      (Math.exp(18.6686 - 4030.183 / (t_skin + 235.0)) - vapor_pressure) /
      r_total;
    if (e_max === 0) throw new RangeError("division by zero");
    let p_rsw = e_rsw / e_max; // ratio heat loss sweating to max heat loss sweating

    // calculate first the sweat efficiency using the skin WETNESS (assuming all sweat is converted to evaporative heat).
    // Note skin wetness is different than skin WETTEDNESS which assumes the correct evaporation efficiency
    const he_n = 1 / r_total; // coefficient of the evaporative heat transfer (inverse of the total evaporative heat resistance; W/(K*m2*Pa))
    if (2 + 2.46 * he_n === 0) throw new RangeError("division by zero");
    const wettedness_dif = 1 / (2 + 2.46 * he_n);
    const wp = wettedness_dif + (1 - wettedness_dif) * p_rsw; // skin wetness (between 0.06 and 1)

    // Calculate skin wettedness, by taking the ISO PHS evaporation efficiency formula: eff = 1 - 0.5 * w**2
    if (wp === 0) throw new RangeError("division by zero");
    w = (Math.sqrt(2 * (wp * wp) + 1) - 1) / wp;

    // Limit w
    // print("Skin wetness exceeds max value ${:.2f}".format(w_max))
    w = w_max < w ? w_max : w;

    // Recalculate evaporative sweat heat
    if (1.0 - wettedness_dif === 0) throw new RangeError("division by zero");
    p_rsw = (w - wettedness_dif) / (1.0 - wettedness_dif);
    e_rsw = p_rsw * e_max > 0 ? p_rsw * e_max : 0;
    let e_diff = w * e_max - e_rsw > 0 ? w * e_max - e_rsw : 0;

    // check condensation on skin surface due to high RH > 100%; body emerged in water;  the model is not valid for this case
    if (e_max < 0) {
      // sweating is suppressed, and condensation latent heat is not taken into account
      w = 0.0;
      e_diff = 0.0;
      e_rsw = 0.0;
    }

    // Total evaporative heat loss by sweating and vapor diffusion
    e_skin = e_rsw + e_diff;

    // Calculate Shivering (SHIV)
    const t_cr_sh = t_cr0_sh - t_core > 0 ? t_cr0_sh - t_core : 0;
    const met_shivering =
      c_she *
      (cof_scs * t_cr_sh * t_sk_cons + cof_sc * t_cr_sh + cof_ss * t_sk_cons);
    m = met * met_factor + met_shivering;

    // Append skin and core temp for time point
    skin_temp_hist[n_simulation] = t_skin;
    core_temp_hist[n_simulation] = t_core;
  }

  return [core_temp_hist, skin_temp_hist];
}
