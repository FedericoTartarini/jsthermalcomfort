import {
  units_converter,
  check_standard_compliance_array,
  round,
} from "../utilities/utilities.js";
import { two_nodes } from "../models/two_nodes.js";

/**
 * @typedef {Object} HeatwaveReturnType
 * @property {number} e_skin – Total rate of evaporative heat loss from skin, [W/m2]. Equal to e_rsw + e_diff
 * @property {number} e_rsw  – Rate of evaporative heat loss from sweat evaporation, [W/m2]
 * @property {number} e_diff  – Rate of evaporative heat loss from moisture diffused through the skin [W/m2]
 * @property {number} e_max  – Maximum rate of evaporative heat loss from skin, [W/m2]
 * @property {number} q_sensible  – Sensible heat loss from skin, [W/m2]
 * @property {number} q_skin  – Total rate of heat loss from skin, [W/m2]. Equal to q_sensible + e_skin
 * @property {number} q_res  – Total rate of heat loss through respiration, [W/m2]
 * @property {number} t_core  – Core temperature, [°C]
 * @property {number} t_skin  – Skin temperature, [°C]
 * @property {number} m_bl  – Skin blood flow, [kg/h/m2]
 * @property {number} m_rsw  – Rate at which regulatory sweat is generated, [kg/h/m2]
 * @property {number} w  – Skin wettedness, adimensional. Ranges from 0 and 1.
 * @property {number} w_max  – Skin wettedness (w) practical upper limit, adimensional. Ranges from 0 and 1.
 * @property {boolean} heat_strain  – True if the model predict that the person may be experiencing heat strain.
 * @property {boolean} heat_strain_blood_flow  – True if heat strain is caused by skin blood flow (m_bl) reaching its maximum value.
 * @property {boolean} heat_strain_w  – True if heat strain is caused by skin wettedness (w) reaching its maximum value
 * @property {boolean} heat_strain_sweating  – True if heat strain is caused by regulatory sweating (m_rsw) reaching its maximum value
 * @public
 */

/**
 * @typedef {Object} HeatwaveKwargs - a keywords argument set containing the additional arguments for use fans heatwave
 * @property {boolean} [round=true] - round the result of two nodes model
 * @property {number} [max_sweating] - maximum rate at which regulatory sweat is generated, [kg/h/m2]
 * @property {boolean} [limit_inputs=true]  – by default, if the inputs are outsude the following limits the function returns nan. If
 * False returns values regardless of the input values. The applicability limits are 20 < tdb [°C] < 50, 20 < tr [°C] < 50,
 * 0.1 < v [m/s] < 4.5, 0.7 < met [met] < 2, and 0 < clo [clo] < 1.
 * @public
 */

/**
 * @typedef {Object} HeatwaveKwargsRequired
 * @property {boolean} round
 * @property {number} max_sweating
 * @property {boolean} limit_inputs
 */

/**
 *
 * It helps you to estimate if the conditions you have selected would cause heat strain.
 * This occurs when either the following variables reaches its maximum value:
 *
 *  - m_rsw Rate at which regulatory sweat is generated, [mL/h/m2].
 *  - w : Skin wettedness, adimensional. Ranges from 0 and 1.
 *  - m_bl : Skin blood flow [kg/h/m2].
 *
 * @public
 * @memberof models
 * @docname Use Fans During Heatwaves
 *
 * @param {number} tdb Dry bulb air temperature, default in [°C] in [°F] if `units` = 'IP'.
 * @param {number} tr Mean radiant temperature, default in [°C]
 * @param {number} v Air speed, default in [m/s]
 * @param {number} rh Relative humidity, [%].
 * @param {number} met Metabolic rate, [W/(m2)]
 * @param {number} clo Clothing insulation, [clo]
 * @param {number} [wme=0] External work, [W/(m2)] default 0
 * @param {number} [body_surface_area] Body surface area, default value 1.8258 [m2] in [ft2] if units = ‘IP’
 * @param {number} [p_atm] Atmospheric pressure, default value 101325 [Pa] in [atm] if units = ‘IP’
 * @param {"standing" | "sitting"} [body_position="standing"] Select either “sitting” or “standing”
 * @param {"SI" | "IP"} [units="SI"] Select the SI (International System of Units) or the IP (Imperial Units) system.
 * @param {number} [max_skin_blood_flow=80] Maximum blood flow from the core to the skin, [kg/h/m2] default 80
 * @param {HeatwaveKwargs} [kwargs]
 *
 * @returns {HeatwaveReturnType} object with results of two_nodes
 *
 * @example
 * const results = use_fans_heatwaves(25, 25, 0.1, 50, 1.2, 0.5);
 * console.log(results); // 
 * {
    e_skin: 18.1,
    e_rsw: 10.0,
    e_max: 145.0,
    q_sensible: 45.7, 
    q_skin: 63.8, 
    q_res: 5.2, 
    t_core: 36.9, 
    t_skin: 33.8, 
    m_bl: 13.6, 
    m_rsw: 14.6, 
    w: 0.1, 
    w_max: 0.7, 
    heat_strain_blood_flow: 0.0, 
    heat_strain_w: 0.0, 
    heat_strain_sweating: 0.0, 
    heat_strain: 0.0
    }
 *
 */
export function use_fans_heatwaves(
  tdb,
  tr,
  v,
  rh,
  met,
  clo,
  wme = 0,
  body_surface_area,
  p_atm,
  body_position = "standing",
  units = "SI",
  max_skin_blood_flow = 80,
  kwargs = {},
) {
  const defaults_kwargs = {
    round: true,
    max_sweating: 500,
    limit_inputs: true,
  };

  let joint_kwargs = Object.assign(defaults_kwargs, kwargs);

  if (body_surface_area === undefined)
    body_surface_area = units === "SI" ? 1.8258 : 19.65;
  if (p_atm === undefined) p_atm = units === "SI" ? 101325 : 1;

  if (units === "IP") {
    const unit_convert = units_converter(
      {
        tdb: tdb,
        tr: tr,
        v: v,
        area: body_surface_area,
        pressure: p_atm,
      },
      "IP",
    );
    tdb = unit_convert.tdb;
    tr = unit_convert.tr;
    v = unit_convert.v;
    body_surface_area = unit_convert.area;
    p_atm = unit_convert.pressure;
  }
  let output = two_nodes(
    tdb,
    tr,
    v,
    rh,
    met,
    clo,
    wme,
    body_surface_area,
    p_atm,
    body_position,
    max_skin_blood_flow,
    { round: false, max_sweating: joint_kwargs.max_sweating },
  );

  if (limit_inputs) {
    const {
      tdb: tdb_valid,
      tr: tr_valid,
      v: v_valid,
      met: met_valid,
      clo: clo_valid,
    } = check_standard_compliance_array("ASHRAE", {
      tdb: [tdb],
      tr: [tr],
      v: [v],
      met: [met],
      clo: [clo],
    });

    if (
      isNaN(tdb_valid[0]) ||
      isNaN(tr_valid[0]) ||
      isNaN(v_valid[0]) ||
      isNaN(met_valid[0]) ||
      isNaN(clo_valid[0])
    ) {
      set_tmp = NaN;
    }
  }
  
  if (joint_kwargs.round) {
    return {
      e_skin: round(result.eSkin, 1),
      e_rsw: round(result.eRsw, 1),
      e_max: round(result.eMax, 1),
      q_sensible: round(result.qSensible, 1),
      q_skin: round(result.qSkin, 1),
      q_res: round(result.qRes, 1),
      t_core: round(result.tCore, 1),
      t_skin: round(result.tSkin, 1),
      m_bl: round(result.mBl, 1),
      m_rsw: round(result.mRsw, 1),
      w: round(result.w, 1),
      w_max: round(result.wMax, 1),
      set: round(result.set, 1),
      et: round(result.et, 1),
      pmv_gagge: round(result.pmvGagge, 1),
      pmv_set: round(result.pmvSet, 1),
      disc: round(result.disc, 1),
      t_sens: round(result.tSens, 1),
    };
  }
  return result;
}
