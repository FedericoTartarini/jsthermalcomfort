import { body_surface_area } from "../utilities/utilities";
import { p_sat } from "../psychrometrics/p_sat";

// skin and core temperatures set values
const tc_set = 36.6;
const tsk_set = 34;

/**
 * Defines the vasomotricity (blood flow) in function of the core and skin temperatures.
 * @param {number} t_cr - The body core temperature, [°C]
 * @param {number} t_sk - The body skin temperature, [°C]
 * @returns {Object} m_blood - Blood flow rate, [kg/m2/h]
 * alpha - repartition of body mass between core and skin [].
 */
function vasomotricity(t_cr, t_sk) {
  // Set value signals
  let sig_skin = tsk_set - t_sk;
  let sig_core = t_cr - tc_set;
  if (sig_core < 0) {
    // In this case, T_core<Tc_set --> the blood flow is reduced
    sig_core = 0.0;
  }
  if (sig_skin < 0) {
    // In this case, Tsk>Tsk_set --> the blood flow is increased
    sig_skin = 0.0;
  }
  // 6.3 L/m^2/h is the set value of the blood flow
  let m_blood = (6.3 + 75.0 * sig_core) / (1.0 + 0.5 * sig_skin);
  // 90 L/m^2/h is the blood flow upper limit
  if (m_blood > 90) {
    m_blood = 90.0;
  }
  // in other models, alpha is used to update tbody
  const alpha = 0.0417737 + 0.7451833 / (m_blood + 0.585417);
  return { m_blood: m_blood, alpha: alpha };
}

/**
 * Defines the sweating mechanism depending on the body and core temperatures.
 * @param {number} t_body - weighted average between skin and core temperatures, [°C]
 * @returns {number} m_rsw - The sweating flow rate, [g/m2/h].
 */
function sweat_rate(t_body) {
    const tbody_set = 0.1 * tsk_set + 0.9 * tc_set; // Calculation of the body temperature through a weighted average
    let sig_body = t_body - tbody_set;
    
    if (sig_body < 0) {
        // In this case, Tbody < Tbody_set --> The sweat flow is 0 from Gagge's model
        sig_body = 0.0;
    }
    
    let m_rsw = 304.94 * Math.pow(10, -3) * sig_body;
    
    // 500 g/m^2/h is the upper sweat rate limit
    if (m_rsw > 500) {
        m_rsw = 500;
    }
    return m_rsw 
}

