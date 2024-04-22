/**
 * @typedef VesselBloodFlowResult
 * @type {object}
 * @property {math.MathCollection} bf_art - Artery blood flow rate [l/h].
 * @property {math.MathCollection} bf_vein - Vein blood flow rate [l/h].
 */
/**
 * Get artery and vein blood flow rate [l/h].
 *
 * @param {math.MathCollection} bf_core - Core blood flow rate [l/h].
 * @param {math.MathCollection} bf_muscle - Muscle blood flow rate [l/h].
 * @param {math.MathCollection} bf_fat - Fat blood flow rate [l/h].
 * @param {math.MathCollection} bf_skin - Skin blood flow rate [l/h].
 * @param {number} bf_ava_hand - AVA blood flow rate at hand [l/h].
 * @param {number} bf_ava_foot - AVA blood flow rate at foot [l/h].
 *
 * @returns {VesselBloodFlowResult} bf_artery, bf_vein - Artery and vein blood flow rate [l/h].
 */
export function vessel_blood_flow(bf_core: math.MathCollection, bf_muscle: math.MathCollection, bf_fat: math.MathCollection, bf_skin: math.MathCollection, bf_ava_hand: number, bf_ava_foot: number): VesselBloodFlowResult;
/**
 * Create matrix to calculate heat exchange by blood flow in each segment.
 *
 * @param {math.MathCollection} bf_core
 * @param {math.MathCollection} bf_muscle
 * @param {math.MathCollection} bf_fat
 * @param {math.MathCollection} bf_skin
 * @param {number} bf_ava_hand
 * @param {number} bf_ava_foot
 *
 * @returns {math.Matrix} The heat exchange by blood flow in each segment.
 */
export function local_arr(bf_core: math.MathCollection, bf_muscle: math.MathCollection, bf_fat: math.MathCollection, bf_skin: math.MathCollection, bf_ava_hand: number, bf_ava_foot: number): math.Matrix;
/**
 * Create matrix to calculate heat exchange by blood flow between segments. [W/K]
 *
 * @param {math.MathCollection} bf_art
 * @param {math.MathCollection} bf_vein
 * @param {number} bf_ava_hand
 * @param {number} bf_ava_foot
 *
 * @return {math.Matrix}
 */
export function whole_body(bf_art: math.MathCollection, bf_vein: math.MathCollection, bf_ava_hand: number, bf_ava_foot: number): math.Matrix;
export const BODY_NAMES: string[];
export const LAYER_NAMES: string[];
export namespace IDICT {
    let CB: number;
}
export const NUM_NODES: number;
export const INDEX: {};
export const VINDEX: {};
export type VesselBloodFlowResult = {
    /**
     * - Artery blood flow rate [l/h].
     */
    bf_art: math.MathCollection;
    /**
     * - Vein blood flow rate [l/h].
     */
    bf_vein: math.MathCollection;
};
import * as math from "mathjs";
//# sourceMappingURL=matrix.d.ts.map