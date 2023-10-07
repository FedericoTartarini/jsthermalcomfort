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
 * @property {number} w  – Skin wettedness, adimensional. Ranges from 0 and 1
 * @property {number} w_max  – Skin wettedness (w) practical upper limit, adimensional. Ranges from 0 and 1
 * @property {boolean | undefined} heat_strain  – True if the model predict that the person may be experiencing heat strain, undefined if the result of two nodes model is not a number
 * @property {boolean | undefined} heat_strain_blood_flow  – True if heat strain is caused by skin blood flow (m_bl) reaching its maximum value, undefined if the result of two nodes model is not a number
 * @property {boolean | undefined} heat_strain_w  – True if heat strain is caused by skin wettedness (w) reaching its maximum value, undefined if the result of two nodes model is not a number
 * @property {boolean | undefined} heat_strain_sweating  – True if heat strain is caused by regulatory sweating (m_rsw) reaching its maximum value, undefined if the result of two nodes model is not a number
 * @public
 */

/**
 * @typedef {Object} HeatwaveKwargs - a keywords argument set containing the additional arguments for use fans heatwave
 * @property {number} [max_sweating] - max sweating
 * @property {boolean} [round=true] - if True rounds output value, if False it does not round it
 * @property {boolean} [limit_inputs=true]  – By default, if the inputs are outsude the following limits the function returns nan. If
 * False returns values regardless of the input values. The applicability limits are 20 < tdb [°C] < 50, 20 < tr [°C] < 50,
 * 0.1 < v [m/s] < 4.5, 0.7 < met [met] < 2, and 0 < clo [clo] < 1.
 *
 * The applicability limits are 20 < tdb [°C] < 50, 20 < tr [°C] < 50, 0.1 < v [m/s] < 4.5, 0.7 < met [met] < 2, and 0 < clo [clo] < 1.
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
 * @param {number} tdb dry bulb air temperature, default in [°C] in [°F] if units = ‘IP’
 * @param {number} tr mean radiant temperature, default in [°C] in [°F] if units = ‘IP’
 * @param {number} v air speed, default in [m/s] in [fps] if units = ‘IP’
 * @param {number} rh relative humidity, [%]
 * @param {number} met metabolic rate, [met]
 * @param {number} clo clothing insulation, [clo]
 * @param {number} [wme=0] external work, [met] default 0
 * @param {number} [body_surface_area] body surface area, default value 1.8258 [m2] in [ft2] if units = ‘IP’
 * 
 * The body surface area can be calculated using the function pythermalcomfort.utilities.body_surface_area().
 * @param {number} [p_atm] atmospheric pressure, default value 101325 [Pa] in [atm] if units = ‘IP’
 * @param {"standing" | "sitting"} [body_position="standing"] select either “sitting” or “standing”
 * @param {"SI" | "IP"} [units="SI"] select the SI (International System of Units) or the IP (Imperial Units) system.
 * @param {number} [max_skin_blood_flow=80] maximum blood flow from the core to the skin
 * @param {HeatwaveKwargs} [kwargs]
 *
 * @returns {HeatwaveReturnType} object with results of use fans during heatwave
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

  let heatwave_output = cal_heatwave(output, joint_kwargs, max_skin_blood_flow);

  const key_to_remove = ["set", "et", "pmv_gagge", "pmv_set", "disc", "t_sens"];

  const joint_output = {};
  for (const key in output) {
    if (!key_to_remove.includes(key)) {
      joint_output[key] = output[key];
    }
  }
  Object.assign(joint_output, heatwave_output);

  if (joint_kwargs.limit_inputs) {
    const {
      tdb: tdb_valid,
      tr: tr_valid,
      v: v_valid,
      met: met_valid,
      clo: clo_valid,
    } = check_standard_compliance_array("FAN_HEATWAVES", {
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
      for (let key in joint_output) {
        if (
          key === "heat_strain" ||
          key === "heat_strain_blood_flow" ||
          key === "heat_strain_sweating" ||
          key === "heat_strain_w"
        ) {
          joint_output[key] = undefined;
        } else {
          joint_output[key] = NaN;
        }
      }
    }
  }

  if (joint_kwargs.round) {
    return {
      e_skin: round(joint_output.eSkin, 1),
      e_rsw: round(joint_output.eRsw, 1),
      e_max: round(joint_output.eMax, 1),
      q_sensible: round(joint_output.qSensible, 1),
      q_skin: round(joint_output.qSkin, 1),
      q_res: round(joint_output.qRes, 1),
      t_core: round(joint_output.tCore, 1),
      t_skin: round(joint_output.tSkin, 1),
      m_bl: round(joint_output.mBl, 1),
      m_rsw: round(joint_output.mRsw, 1),
      w: round(joint_output.w, 1),
      w_max: round(joint_output.wMax, 1),
      heat_strain_blood_flow: joint_output.heat_strain_blood_flow,
      heat_strain_w: joint_output.heat_strain_w,
      heat_strain_sweating: joint_output.heat_strain_sweating,
      heat_strain: joint_output.heat_strain,
    };
  }
  return joint_output;
}

/**
 * Calculate heat strain conditions based on the result of two nodes model and max skin blood flow
 *
 * @param {object} two_nodes_result - the result of two nodes model
 * @param {HeatwaveKwargs} joint_kwargs - heatwave kwargs
 * @param {number} max_skin_blood_flow - maximum blood flow from the core to the skin, [kg/h/m2] default 80
 * @returns {object} heat strain conditions
 */
function cal_heatwave(two_nodes_result, joint_kwargs, max_skin_blood_flow) {
  let heat_strain_blood_flow,
    heat_strain_w,
    heat_strain_sweating,
    heat_strain = false;

  heat_strain_blood_flow = two_nodes_result.mBl === max_skin_blood_flow;
  heat_strain_w = two_nodes_result.w === two_nodes_result.wMax;
  heat_strain_sweating = two_nodes_result.mRsw === joint_kwargs.max_sweating;

  if (heat_strain_blood_flow || heat_strain_w || heat_strain_sweating) {
    heat_strain = true;
  }

  return {
    heat_strain_blood_flow: heat_strain_blood_flow,
    heat_strain_w: heat_strain_w,
    heat_strain_sweating: heat_strain_sweating,
    heat_strain: heat_strain,
  };
}
