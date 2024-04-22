/**
 * @typedef RespHeatLossResult
 * @type {object}
 * @property {number} res_sh - Sensible heat loss by respiration [W].
 * @property {number} res_lh - Latent heat loss by respiration [W].
 */
/**
 * Calculate heat loss by respiration [W].
 *
 * @param {number} tdb - Dry bulb air temperature [oC].
 * @param {number} p_a - Water vapor pressure in the ambient air  [kPa].
 * @param {number} q_thermogenesis_total - Total thermogenesis [W].

 * @return {RespHeatLossResult} res_sh, res_lh - Sensible and latent heat loss by respiration [W].
 */
export function resp_heat_loss(tdb: number, p_a: number, q_thermogenesis_total: number): RespHeatLossResult;
export type RespHeatLossResult = {
    /**
     * - Sensible heat loss by respiration [W].
     */
    res_sh: number;
    /**
     * - Latent heat loss by respiration [W].
     */
    res_lh: number;
};
//# sourceMappingURL=resp_heat_loss.d.ts.map