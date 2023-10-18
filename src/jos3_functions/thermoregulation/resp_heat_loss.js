/**
 * Calculate heat loss by respiration [W].
 *
 * @param {number} tdb - Dry bulb air temperature [oC].
 * @param {number} p_a - Water vapor pressure in the ambient air  [kPa].
 * @param {number} q_thermogenesis_total - Total thermogenesis [W].

 * @return {number[]} res_sh, res_lh - Sensible and latent heat loss by respiration [W].
 */
export function resp_heat_loss(tdb, p_a, q_thermogenesis_total) {
  let res_sh = 0.0014 * q_thermogenesis_total * (34 - tdb); // sensible heat loss
  let res_lh = 0.0173 * q_thermogenesis_total * (5.87 - p_a); // latent heat loss
  return [res_sh, res_lh];
}
