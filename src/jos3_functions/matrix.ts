// The node layout and the blood-flow matrices of the JOS-3 model, upstream's
// pythermalcomfort/jos3_functions/matrix.py at v4.6.2. A matrix is a
// number[][] of NUM_NODES rows, a vector a number[].
import { BODY_NAMES } from "./_body_parts.ts";
import type { JOS3BodyPartName } from "./_body_parts.ts";
import { Default } from "./Default.ts";
import { key_error, np_sum, py_type_name, zeros2d } from "./_numpy.ts";

/** The name of a layer of a JOS-3 body part. */
export type JOS3LayerName =
  | "artery"
  | "vein"
  | "sfvein"
  | "core"
  | "muscle"
  | "fat"
  | "skin";

/** The node index of each layer of one body part, `null` for a layer it lacks. */
export type JOS3LayerIndices = Record<JOS3LayerName, number | null>;

/** The node index of every layer of every body part, and of the central blood. */
export type JOS3IndexDict = Record<JOS3BodyPartName, JOS3LayerIndices> & {
  CB: number;
};

/** The layers of a body part, in node order (`matrix.py:9`). */
export const LAYER_NAMES: readonly JOS3LayerName[] = Object.freeze([
  "artery",
  "vein",
  "sfvein",
  "core",
  "muscle",
  "fat",
  "skin",
]);

/**
 * Define the index's order of the matrix (`matrix.py:12-65`).
 *
 * @returns {[JOS3IndexDict, number]} the index of every layer of every body
 * part, keyed by body name and layer name, with `CB` (the central blood) at
 * 0; and the number of nodes
 */
export function index_order(): [JOS3IndexDict, number] {
  // Defines existing layers as 1 or null
  const index_dict = {} as Record<string, JOS3LayerIndices | number>;

  for (const key of ["head", "pelvis"]) {
    index_dict[key] = {
      artery: 1,
      vein: 1,
      sfvein: null,
      core: 1,
      muscle: 1,
      fat: 1,
      skin: 1,
    };
  }

  for (const key of ["neck", "chest", "back"]) {
    index_dict[key] = {
      artery: 1,
      vein: 1,
      sfvein: null,
      core: 1,
      muscle: null,
      fat: null,
      skin: 1,
    };
  }

  for (const key of BODY_NAMES.slice(5)) {
    // limb segments
    index_dict[key] = {
      artery: 1,
      vein: 1,
      sfvein: 1,
      core: 1,
      muscle: null,
      fat: null,
      skin: 1,
    };
  }

  // Sets ordered indices in the matrix
  index_dict["CB"] = 0;
  let order_count = 1;
  for (const bn of BODY_NAMES) {
    const layers = index_dict[bn] as JOS3LayerIndices;
    for (const ln of LAYER_NAMES) {
      if (layers[ln] !== null) {
        layers[ln] = order_count;
        order_count += 1;
      }
    }
  }

  return [index_dict as JOS3IndexDict, order_count];
}

const [idict, num_nodes] = index_order();

/** The index of every layer of every body part (`matrix.py:68`). */
export const IDICT: JOS3IndexDict = idict;

/** The number of nodes of the model, 85 with the central blood (`matrix.py:68`). */
export const NUM_NODES: number = num_nodes;

/**
 * Get indices of the matrix by the layer name (`matrix.py:71-90`).
 *
 * @param {string} layer - Layer name of jos. ex) artery, vein, sfvein, core,
 * muscle, fat or skin. Compared without regard to case, as upstream lowers
 * it; a name that is not a layer gives no indices.
 * @returns {number[]} indices of the matrix
 */
export function index_by_layer(layer: string): number[] {
  // ADR 0012: upstream's layer.lower() raises an AttributeError for a
  // non-string, a TypeError here.
  if (typeof layer !== "string") {
    throw new TypeError(
      `'${py_type_name(layer)}' object has no attribute 'lower'`,
    );
  }
  // Gets indices by the layer name
  const out_index: number[] = [];
  for (const bn of BODY_NAMES) {
    for (const ln of LAYER_NAMES) {
      const index = IDICT[bn][ln];
      if (layer.toLowerCase() === ln && index) {
        out_index.push(index);
      }
    }
  }
  return out_index;
}

/**
 * Get the body part indices that have the layer (`matrix.py:93-111`).
 *
 * @param {JOS3LayerName} layer - Layer name of jos. ex) artery, vein,
 * sfvein, core, muscle, fat or skin.
 * @returns {number[]} the indices, in body part order, of the body parts
 * that have the layer
 *
 * @throws {Error} For a name that is not a layer, as upstream raises a
 * KeyError (its class is the open question in ticket 25's Comments).
 */
export function valid_index_by_layer(layer: JOS3LayerName): number[] {
  // Upstream's IDICT[bn][layer] raises a KeyError for a name that is not a
  // layer (matrix.py:109); its class is the open question in ticket 25's
  // Comments.
  if (!LAYER_NAMES.includes(layer)) throw key_error(String(layer));
  // Gets valid indices of the layer name
  const out_index: number[] = [];
  BODY_NAMES.forEach((bn, i) => {
    if (IDICT[bn][layer]) {
      out_index.push(i);
    }
  });
  return out_index;
}

/** The node indices of each layer, in body part order (`matrix.py:114-119`). */
export const INDEX: Readonly<Record<JOS3LayerName, readonly number[]>> =
  Object.freeze(
    Object.fromEntries(
      LAYER_NAMES.map((key) => [key, Object.freeze(index_by_layer(key))]),
    ) as Record<JOS3LayerName, readonly number[]>,
  );

/** The body part indices that have each layer (`matrix.py:114-119`). */
export const VINDEX: Readonly<Record<JOS3LayerName, readonly number[]>> =
  Object.freeze(
    Object.fromEntries(
      LAYER_NAMES.map((key) => [key, Object.freeze(valid_index_by_layer(key))]),
    ) as Record<JOS3LayerName, readonly number[]>,
  );

/**
 * Create matrix to calculate heat exchange by blood flow in each segment
 * [W/K]: 1.067 [Wh/(L･K)] * Bloodflow [L/h] = [W/K] (`matrix.py:122-168`).
 *
 * @param {readonly number[]} bf_core - Core blood flow rate [L/h], 17 values.
 * @param {readonly number[]} bf_muscle - Muscle blood flow rate [L/h], 17 values.
 * @param {readonly number[]} bf_fat - Fat blood flow rate [L/h], 17 values.
 * @param {readonly number[]} bf_skin - Skin blood flow rate [L/h], 17 values.
 * @param {number} bf_ava_hand - AVA blood flow rate of one hand [L/h].
 * @param {number} bf_ava_foot - AVA blood flow rate of one foot [L/h].
 *
 * @returns {number[][]} The heat exchange by blood flow in each segment, NUM_NODES × NUM_NODES.
 */
export function local_arr(
  bf_core: readonly number[],
  bf_muscle: readonly number[],
  bf_fat: readonly number[],
  bf_skin: readonly number[],
  bf_ava_hand: number,
  bf_ava_foot: number,
): number[][] {
  const bf_local = zeros2d(NUM_NODES);
  BODY_NAMES.forEach((bn, i) => {
    // Dictionary of indicies in each body segment
    // key = layer name, value = index of matrix
    const index_of = IDICT[bn];
    const artery = index_of.artery as number;
    const vein = index_of.vein as number;
    const core = index_of.core as number;
    const skin = index_of.skin as number;

    // Common
    bf_local[core][artery] = 1.067 * bf_core[i]; // art to cr
    bf_local[skin][artery] = 1.067 * bf_skin[i]; // art to sk
    bf_local[vein][core] = 1.067 * bf_core[i]; // vein to cr
    bf_local[vein][skin] = 1.067 * bf_skin[i]; // vein to sk

    // If the segment has a muscle or fat layer
    if (index_of.muscle !== null) {
      bf_local[index_of.muscle][artery] = 1.067 * bf_muscle[i]; // art to ms
      bf_local[vein][index_of.muscle] = 1.067 * bf_muscle[i]; // vein to ms
    }
    if (index_of.fat !== null) {
      bf_local[index_of.fat][artery] = 1.067 * bf_fat[i]; // art to fat
      bf_local[vein][index_of.fat] = 1.067 * bf_fat[i]; // vein to fat
    }

    // Only hand
    if (i === 7 || i === 10) {
      bf_local[index_of.sfvein as number][artery] = 1.067 * bf_ava_hand; // art to sfvein
    }
    // Only foot
    if (i === 13 || i === 16) {
      bf_local[index_of.sfvein as number][artery] = 1.067 * bf_ava_foot; // art to sfvein
    }
  });
  return bf_local;
}

/**
 * @typedef VesselBloodFlowResult
 * @type {object}
 * @property {number[]} bf_art - Artery blood flow rate [l/h].
 * @property {number[]} bf_vein - Vein blood flow rate [l/h].
 */
export type VesselBloodFlowResult = { bf_art: number[]; bf_vein: number[] };

/**
 * Get artery and vein blood flow rate [l/h] (`matrix.py:171-246`).
 *
 * @param {readonly number[]} bf_core - Core blood flow rate [l/h].
 * @param {readonly number[]} bf_muscle - Muscle blood flow rate [l/h].
 * @param {readonly number[]} bf_fat - Fat blood flow rate [l/h].
 * @param {readonly number[]} bf_skin - Skin blood flow rate [l/h].
 * @param {number} bf_ava_hand - AVA blood flow rate at hand [l/h].
 * @param {number} bf_ava_foot - AVA blood flow rate at foot [l/h].
 *
 * @returns {VesselBloodFlowResult} bf_artery, bf_vein - Artery and vein blood flow rate [l/h].
 */
export function vessel_blood_flow(
  bf_core: readonly number[],
  bf_muscle: readonly number[],
  bf_fat: readonly number[],
  bf_skin: readonly number[],
  bf_ava_hand: number,
  bf_ava_foot: number,
): VesselBloodFlowResult {
  const xbf = bf_core.map((c, i) => c + bf_muscle[i] + bf_fat[i] + bf_skin[i]);
  const n = Default.num_body_parts;
  const sum = (from: number, to: number) => np_sum(xbf.slice(from, to));

  const bf_art = new Array<number>(n).fill(0);
  const bf_vein = new Array<number>(n).fill(0);

  // head
  bf_art[0] = xbf[0];
  bf_vein[0] = xbf[0];

  // neck (+head)
  bf_art[1] = xbf[1] + xbf[0];
  bf_vein[1] = xbf[1] + xbf[0];

  // chest
  bf_art[2] = xbf[2];
  bf_vein[2] = xbf[2];

  // back
  bf_art[3] = xbf[3];
  bf_vein[3] = xbf[3];

  // pelvis (+Thighs, Legs, Feet, AVA_Feet)
  bf_art[4] = xbf[4] + sum(11, n) + 2 * bf_ava_foot;
  bf_vein[4] = xbf[4] + sum(11, n) + 2 * bf_ava_foot;

  // L.Shoulder (+Arm, Hand, (arteryのみAVA_Hand))
  bf_art[5] = sum(5, 8) + bf_ava_hand;
  bf_vein[5] = sum(5, 8);

  // L.Arm (+Hand)
  bf_art[6] = sum(6, 8) + bf_ava_hand;
  bf_vein[6] = sum(6, 8);

  // L.Hand
  bf_art[7] = xbf[7] + bf_ava_hand;
  bf_vein[7] = xbf[7];

  // R.Shoulder (+Arm, Hand, (arteryのみAVA_Hand))
  bf_art[8] = sum(8, 11) + bf_ava_hand;
  bf_vein[8] = sum(8, 11);

  // R.Arm (+Hand)
  bf_art[9] = sum(9, 11) + bf_ava_hand;
  bf_vein[9] = sum(9, 11);

  // R.Hand
  bf_art[10] = xbf[10] + bf_ava_hand;
  bf_vein[10] = xbf[10];

  // L.Thigh (+Leg, Foot, (arteryのみAVA_Foot))
  bf_art[11] = sum(11, 14) + bf_ava_foot;
  bf_vein[11] = sum(11, 14);

  // L.Leg (+Foot)
  bf_art[12] = sum(12, 14) + bf_ava_foot;
  bf_vein[12] = sum(12, 14);

  // L.Foot
  bf_art[13] = xbf[13] + bf_ava_foot;
  bf_vein[13] = xbf[13];

  // R.Thigh (+Leg, Foot, (arteryのみAVA_Foot))
  bf_art[14] = sum(14, n) + bf_ava_foot;
  bf_vein[14] = sum(14, n);

  // R.Leg (+Foot)
  bf_art[15] = sum(15, n) + bf_ava_foot;
  bf_vein[15] = sum(15, n);

  // R.Foot
  bf_art[16] = xbf[16] + bf_ava_foot;
  bf_vein[16] = xbf[16];

  return { bf_art, bf_vein };
}

/**
 * Create matrix to calculate heat exchange by blood flow between segments.
 * [W/K] (`matrix.py:249-453`).
 *
 * @param {readonly number[]} bf_art - Artery blood flow rate [L/h], 17 values.
 * @param {readonly number[]} bf_vein - Vein blood flow rate [L/h], 17 values.
 * @param {number} bf_ava_hand - AVA blood flow rate of one hand [L/h].
 * @param {number} bf_ava_foot - AVA blood flow rate of one foot [L/h].
 *
 * @return {number[][]} NUM_NODES × NUM_NODES
 */
export function whole_body(
  bf_art: readonly number[],
  bf_vein: readonly number[],
  bf_ava_hand: number,
  bf_ava_foot: number,
): number[][] {
  const arr83 = zeros2d(NUM_NODES);
  // Upstream adds one matrix per flow (`arr83 += flow(...)`), so a cell
  // holds 0 + 1.067 * bloodflow.
  const flow = (up: number, down: number, bloodflow: number) => {
    arr83[down][up] += 1.067 * bloodflow; // Coefficient = 1.067 [Wh/L.K] Change units [L/h] to [W/K]
  };

  // Matrix offsets of segments
  const CB = IDICT.CB;
  const head = IDICT.head.artery as number;
  const neck = IDICT.neck.artery as number;
  const chest = IDICT.chest.artery as number;
  const back = IDICT.back.artery as number;
  const pelvis = IDICT.pelvis.artery as number;
  const left_shoulder = IDICT.left_shoulder.artery as number;
  const left_arm = IDICT.left_arm.artery as number;
  const left_hand = IDICT.left_hand.artery as number;
  const right_shoulder = IDICT.right_shoulder.artery as number;
  const right_arm = IDICT.right_arm.artery as number;
  const right_hand = IDICT.right_hand.artery as number;
  const left_thigh = IDICT.left_thigh.artery as number;
  const left_leg = IDICT.left_leg.artery as number;
  const left_foot = IDICT.left_foot.artery as number;
  const right_thigh = IDICT.right_thigh.artery as number;
  const right_leg = IDICT.right_leg.artery as number;
  const right_foot = IDICT.right_foot.artery as number;

  flow(CB, neck, bf_art[1]); // CB to neck.art
  flow(neck, head, bf_art[0]); // neck.art to head.art
  flow(head + 1, neck + 1, bf_vein[0]); // head.vein to neck.vein
  flow(neck + 1, CB, bf_vein[1]); // neck.vein to CB

  flow(CB, chest, bf_art[2]); // CB to chest.art
  flow(chest + 1, CB, bf_vein[2]); // chest.vein to CB

  flow(CB, back, bf_art[3]); // CB to back.art
  flow(back + 1, CB, bf_vein[3]); // back.vein to CB

  flow(CB, pelvis, bf_art[4]); // CB to pelvis.art
  flow(pelvis + 1, CB, bf_vein[4]); // pelvis.vein to CB

  flow(CB, left_shoulder, bf_art[5]); // CB to left_shoulder.art
  flow(left_shoulder, left_arm, bf_art[6]); // left_shoulder.art to left_arm.art
  flow(left_arm, left_hand, bf_art[7]); // left_arm.art to left_hand.art
  flow(left_hand + 1, left_arm + 1, bf_vein[7]); // left_hand.vein to left_arm.vein
  flow(left_arm + 1, left_shoulder + 1, bf_vein[6]); // left_arm.vein to left_shoulder.vein
  flow(left_shoulder + 1, CB, bf_vein[5]); // left_shoulder.vein to CB
  flow(left_hand + 2, left_arm + 2, bf_ava_hand); // left_hand.sfvein to left_arm.sfvein
  flow(left_arm + 2, left_shoulder + 2, bf_ava_hand); // left_arm.sfvein to left_shoulder.sfvein
  flow(left_shoulder + 2, CB, bf_ava_hand); // left_shoulder.sfvein to CB

  flow(CB, right_shoulder, bf_art[8]); // CB to right_shoulder.art
  flow(right_shoulder, right_arm, bf_art[9]); // right_shoulder.art to right_arm.art
  flow(right_arm, right_hand, bf_art[10]); // right_arm.art to right_hand.art
  flow(right_hand + 1, right_arm + 1, bf_vein[10]); // right_hand.vein to right_arm.vein
  flow(right_arm + 1, right_shoulder + 1, bf_vein[9]); // right_arm.vein to right_shoulder.vein
  flow(right_shoulder + 1, CB, bf_vein[8]); // right_shoulder.vein to CB
  flow(right_hand + 2, right_arm + 2, bf_ava_hand); // right_hand.sfvein to right_arm.sfvein
  flow(right_arm + 2, right_shoulder + 2, bf_ava_hand); // right_arm.sfvein to right_shoulder.sfvein
  flow(right_shoulder + 2, CB, bf_ava_hand); // right_shoulder.sfvein to CB

  flow(pelvis, left_thigh, bf_art[11]); // pelvis to left_thigh.art
  flow(left_thigh, left_leg, bf_art[12]); // left_thigh.art to left_leg.art
  flow(left_leg, left_foot, bf_art[13]); // left_leg.art to left_foot.art
  flow(left_foot + 1, left_leg + 1, bf_vein[13]); // left_foot.vein to left_leg.vein
  flow(left_leg + 1, left_thigh + 1, bf_vein[12]); // left_leg.vein to left_thigh.vein
  flow(left_thigh + 1, pelvis + 1, bf_vein[11]); // left_thigh.vein to pelvis
  flow(left_foot + 2, left_leg + 2, bf_ava_foot); // left_foot.sfvein to left_leg.sfvein
  flow(left_leg + 2, left_thigh + 2, bf_ava_foot); // left_leg.sfvein to left_thigh.sfvein
  flow(left_thigh + 2, pelvis + 1, bf_ava_foot); // left_thigh.vein to pelvis

  flow(pelvis, right_thigh, bf_art[14]); // pelvis to right_thigh.art
  flow(right_thigh, right_leg, bf_art[15]); // right_thigh.art to right_leg.art
  flow(right_leg, right_foot, bf_art[16]); // right_leg.art to right_foot.art
  flow(right_foot + 1, right_leg + 1, bf_vein[16]); // right_foot.vein to right_leg.vein
  flow(right_leg + 1, right_thigh + 1, bf_vein[15]); // right_leg.vein to right_thigh.vein
  flow(right_thigh + 1, pelvis + 1, bf_vein[14]); // right_thigh.vein to pelvis
  flow(right_foot + 2, right_leg + 2, bf_ava_foot); // right_foot.sfvein to right_leg.sfvein
  flow(right_leg + 2, right_thigh + 2, bf_ava_foot); // right_leg.sfvein to right_thigh.sfvein
  flow(right_thigh + 2, pelvis + 1, bf_ava_foot); // right_thigh.vein to pelvis

  return arr83;
}

/**
 * Remove the body name from the parameter name (`matrix.py:456-484`): the
 * first body part name the text contains, in body part order, and the
 * underscore it leaves at the end.
 *
 * @param {string} text - Parameter name
 * @returns {[string, JOS3BodyPartName | null]} the parameter name without
 * the body name, and the removed body name, `null` if none
 */
export function remove_body_name(
  text: string,
): [string, JOS3BodyPartName | null] {
  let rtext = text;
  let removed: JOS3BodyPartName | null = null;

  // Remove the body part name from the parameter name
  for (const bn of BODY_NAMES) {
    if (text.includes(bn)) {
      // str.replace replaces every occurrence, as Python's does
      rtext = rtext.replaceAll(bn, "");
      // str.removesuffix removes one trailing underscore
      if (rtext.endsWith("_")) rtext = rtext.slice(0, -1);
      removed = bn;
      break;
    }
  }
  return [rtext, removed];
}
