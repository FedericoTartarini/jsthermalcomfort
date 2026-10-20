/** Sensible and latent heat loss by respiration [W]. */
export type RespHeatLossResult = [res_sh: number, res_lh: number];

// wave 2 D8: upstream returns a plain tuple (thermoregulation.py:1578 at
// v4.6.2), an array here, in upstream's order, typed as a labelled tuple.

/**
 * Calculate heat loss by respiration [W]
 * (`pythermalcomfort/jos3_functions/thermoregulation.py:1557-1578` at v4.6.2).
 *
 * @param {number} tdb - Dry bulb air temperature [oC].
 * @param {number} p_a - Water vapor pressure in the ambient air  [kPa].
 * @param {number} q_thermogenesis_total - Total thermogenesis [W].
 *
 * @return {[number, number]} res_sh, res_lh - Sensible and latent heat loss by respiration [W].
 */
export function resp_heat_loss(
  tdb: number,
  p_a: number,
  q_thermogenesis_total: number,
): RespHeatLossResult {
  const res_sh = 0.0014 * q_thermogenesis_total * (34 - tdb); // Sensible heat loss
  const res_lh = 0.0173 * q_thermogenesis_total * (5.87 - p_a); // Latent heat loss
  return [res_sh, res_lh];
}
